/**
 * Provider resolution: `LLM_PROVIDER=mock|anthropic`.
 * When unset, falls back to anthropic if an API key is present, else mock —
 * so a fresh clone works without any configuration.
 */
import { AnthropicClient } from "./anthropic";
import { MockLlmClient } from "./mock";
import type { LlmClient } from "./types";

export type { LlmClient } from "./types";

export type LlmProvider = "mock" | "anthropic";

/** The provider selected by the environment. */
export function resolveProvider(): LlmProvider {
  const configured = process.env.LLM_PROVIDER;
  if (configured === "mock" || configured === "anthropic") {
    return configured;
  }
  if (configured !== undefined) {
    throw new Error(
      `invalid LLM_PROVIDER "${configured}" — expected "mock" or "anthropic"`
    );
  }
  return process.env.ANTHROPIC_API_KEY ? "anthropic" : "mock";
}

const clients = new Map<LlmProvider, LlmClient>();

/** Shared client instance for the configured provider. */
export function getLlmClient(): LlmClient {
  const provider = resolveProvider();
  let client = clients.get(provider);
  if (!client) {
    client = provider === "mock" ? new MockLlmClient() : new AnthropicClient();
    clients.set(provider, client);
  }
  return client;
}
