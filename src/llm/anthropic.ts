/**
 * AnthropicClient — real LLM calls via the Vercel AI SDK (@ai-sdk/anthropic).
 *
 * Prompt caching: system blocks flagged `cache: true` (curriculum
 * boilerplate + per-session plan) carry Anthropic `cache_control` markers,
 * so the stable prefix is cached across turns; the volatile step block and
 * the conversation follow it uncached.
 */
import { createAnthropic, type AnthropicProvider } from "@ai-sdk/anthropic";
import { generateObject, streamText, type ModelMessage } from "ai";
import { OAUTH_BETA_HEADER, resolveAnthropicAuth } from "./auth";
import type {
  ChatStream,
  ChatStreamParams,
  GenerateObjectParams,
  GenerateObjectResult,
  LlmClient,
  LlmUsage,
  SystemBlock,
} from "./types";

const CACHE_CONTROL = {
  anthropic: { cacheControl: { type: "ephemeral" as const } },
};

function systemMessages(blocks: SystemBlock[]): ModelMessage[] {
  return blocks.map((block) => ({
    role: "system" as const,
    content: block.text,
    ...(block.cache ? { providerOptions: CACHE_CONTROL } : {}),
  }));
}

function toUsage(usage: {
  inputTokens: number | undefined;
  outputTokens: number | undefined;
}): LlmUsage {
  return {
    inputTokens: usage.inputTokens ?? 0,
    outputTokens: usage.outputTokens ?? 0,
  };
}

export class AnthropicClient implements LlmClient {
  /**
   * Resolve credentials per call: API key, or an OAuth bearer token (env or
   * `ant auth login` profile — short-lived, so never cached in the client).
   * OAuth requests additionally carry the oauth beta header.
   */
  private provider(): AnthropicProvider {
    const auth = resolveAnthropicAuth();
    if (auth.kind === "apiKey") {
      return createAnthropic({ apiKey: auth.apiKey });
    }
    return createAnthropic({
      authToken: auth.authToken,
      headers: { "anthropic-beta": OAUTH_BETA_HEADER },
    });
  }

  async chatStream(params: ChatStreamParams): Promise<ChatStream> {
    const result = streamText({
      model: this.provider()(params.model),
      allowSystemInMessages: true,
      messages: [
        ...systemMessages(params.system),
        ...params.messages.map((m) => ({ role: m.role, content: m.content })),
      ],
    });
    return {
      textStream: result.textStream,
      final: async () => {
        const [text, usage] = await Promise.all([result.text, result.totalUsage]);
        return { text, usage: toUsage(usage) };
      },
    };
  }

  async generateObject<T>(
    params: GenerateObjectParams<T>
  ): Promise<GenerateObjectResult<T>> {
    const result = await generateObject({
      model: this.provider()(params.model),
      allowSystemInMessages: true,
      messages: [
        ...systemMessages(params.system),
        { role: "user" as const, content: params.prompt },
      ],
      schema: params.schema,
      schemaName: params.schemaName,
    });
    return { object: result.object, usage: toUsage(result.usage) };
  }
}
