/**
 * LLM abstraction. Everything above this interface is provider-agnostic;
 * `AnthropicClient` and the deterministic `MockLlmClient` sit behind it and
 * are selected via `LLM_PROVIDER=mock|anthropic` (tests/CI/E2E always run
 * on mock and need no API key).
 */
import type { z } from "zod";

export type LlmRole = "tutor" | "grader" | "cardGrader" | "variantGenerator";

export type LlmUsage = {
  inputTokens: number;
  outputTokens: number;
};

export type ChatMessage = {
  role: "user" | "assistant";
  content: string;
};

/**
 * One block of the system prompt. Blocks flagged `cache: true` (the stable
 * curriculum boilerplate and the per-session plan) receive Anthropic
 * prompt-caching `cache_control` markers.
 */
export type SystemBlock = {
  text: string;
  cache?: boolean;
};

export type ChatStreamParams = {
  model: string;
  system: SystemBlock[];
  messages: ChatMessage[];
  /**
   * Expose the `advance_step` tool to the tutor. The client only *reports*
   * whether the model requested it — the server alone decides whether the
   * lesson actually advances.
   */
  allowAdvance: boolean;
};

export type ChatStreamFinal = {
  text: string;
  advanceRequested: boolean;
  usage: LlmUsage;
};

export type ChatStream = {
  /** Assistant text as it is produced. */
  textStream: AsyncIterable<string>;
  /** Resolves once the stream has been fully consumed. */
  final: () => Promise<ChatStreamFinal>;
};

export type GenerateObjectParams<T> = {
  model: string;
  system: SystemBlock[];
  prompt: string;
  schema: z.ZodType<T>;
  /** Stable identifier the mock uses to dispatch deterministic fixtures. */
  schemaName: "evaluation" | "cardGrade" | "variant";
};

export type GenerateObjectResult<T> = {
  object: T;
  usage: LlmUsage;
};

export interface LlmClient {
  /** Streaming dialogue for the tutor role. */
  chatStream(params: ChatStreamParams): Promise<ChatStream>;
  /** Structured output for grader / cardGrader / variantGenerator roles. */
  generateObject<T>(params: GenerateObjectParams<T>): Promise<GenerateObjectResult<T>>;
}
