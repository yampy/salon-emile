/**
 * ClaudeCodeClient — LLM calls through the Claude Agent SDK, which shares
 * Claude Code's authentication. This lets the app run on a Claude Pro/Max
 * subscription (local, personal use) instead of API credits.
 *
 * Select with `LLM_PROVIDER=claude-code`. Requires a logged-in Claude Code
 * (`claude` → /login) on this machine.
 */
import { z } from "zod";
import type {
  ChatMessage,
  ChatStream,
  ChatStreamFinal,
  ChatStreamParams,
  GenerateObjectParams,
  GenerateObjectResult,
  LlmClient,
  LlmUsage,
  SystemBlock,
} from "./types";

function joinSystem(blocks: SystemBlock[]): string {
  return blocks.map((b) => b.text).join("\n\n");
}

/**
 * The Agent SDK drives one prompt per query; the dialogue history is
 * serialized into it (the system blocks already carry the full teaching
 * context).
 */
function renderTranscript(messages: ChatMessage[]): string {
  const lines = messages.map((m) =>
    m.role === "user" ? `学習者: ${m.content}` : `チューター(あなた): ${m.content}`
  );
  const last = messages[messages.length - 1];
  if (last?.role === "user") {
    lines[lines.length - 1] = `学習者の新しい発言: ${last.content}`;
  }
  return `これまでの対話と、学習者の新しい発言:\n\n${lines.join("\n\n")}\n\nチューターとして応答してください。`;
}

/**
 * The CLI validates the schema with a draft-7 validator; emit draft-7 and
 * drop the `$schema` marker it cannot resolve.
 */
function toCliJsonSchema(schema: z.ZodType<unknown>): Record<string, unknown> {
  const json = z.toJSONSchema(schema, { target: "draft-7" }) as Record<string, unknown>;
  delete json.$schema;
  return json;
}

type UsageLike = { input_tokens?: number; output_tokens?: number };

function toUsage(usage: UsageLike | undefined): LlmUsage {
  return {
    inputTokens: usage?.input_tokens ?? 0,
    outputTokens: usage?.output_tokens ?? 0,
  };
}

export class ClaudeCodeClient implements LlmClient {
  async chatStream(params: ChatStreamParams): Promise<ChatStream> {
    const sdk = await import("@anthropic-ai/claude-agent-sdk");
    const response = sdk.query({
      prompt: renderTranscript(params.messages),
      options: {
        systemPrompt: joinSystem(params.system),
        model: params.model,
        maxTurns: 2,
        includePartialMessages: true,
        allowedTools: [],
      },
    });

    let settled = false;
    let resolveFinal!: (value: ChatStreamFinal) => void;
    let rejectFinal!: (reason: Error) => void;
    const finalPromise = new Promise<ChatStreamFinal>((resolve, reject) => {
      resolveFinal = resolve;
      rejectFinal = reject;
    });

    async function* textStream(): AsyncIterable<string> {
      let text = "";
      try {
        for await (const message of response) {
          if (message.type === "stream_event" && message.parent_tool_use_id === null) {
            const event = message.event;
            if (
              event.type === "content_block_delta" &&
              event.delta.type === "text_delta" &&
              event.delta.text.length > 0
            ) {
              text += event.delta.text;
              yield event.delta.text;
            }
          } else if (message.type === "result") {
            settled = true;
            if (message.subtype === "success") {
              resolveFinal({
                text: text.length > 0 ? text : message.result,
                usage: toUsage(message.usage),
              });
            } else {
              rejectFinal(
                new Error(
                  `claude-code query failed (${message.subtype}): ${message.errors.join("; ")}`
                )
              );
            }
          }
        }
        if (!settled) {
          rejectFinal(new Error("claude-code query ended without a result"));
        }
      } catch (error) {
        if (!settled) {
          settled = true;
          rejectFinal(error instanceof Error ? error : new Error(String(error)));
        }
        throw error;
      }
    }

    return { textStream: textStream(), final: () => finalPromise };
  }

  async generateObject<T>(
    params: GenerateObjectParams<T>
  ): Promise<GenerateObjectResult<T>> {
    const sdk = await import("@anthropic-ai/claude-agent-sdk");
    const response = sdk.query({
      prompt: params.prompt,
      options: {
        systemPrompt: joinSystem(params.system),
        model: params.model,
        maxTurns: 2,
        allowedTools: [],
        outputFormat: {
          type: "json_schema",
          schema: toCliJsonSchema(params.schema),
        },
      },
    });

    for await (const message of response) {
      if (message.type === "result") {
        if (message.subtype !== "success") {
          throw new Error(
            `claude-code ${params.schemaName} failed (${message.subtype}): ${message.errors.join("; ")}`
          );
        }
        const raw =
          message.structured_output !== undefined
            ? message.structured_output
            : JSON.parse(message.result);
        return { object: params.schema.parse(raw), usage: toUsage(message.usage) };
      }
    }
    throw new Error("claude-code query ended without a result");
  }
}
