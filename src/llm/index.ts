/**
 * Provider resolution: `LLM_PROVIDER=mock|anthropic|claude-code`.
 *
 * - `anthropic`: direct API via API key or OAuth (billed as API usage)
 * - `claude-code`: through the Claude Agent SDK, sharing Claude Code's
 *   login — runs on a Claude Pro/Max subscription (local personal use)
 * - `mock`: deterministic, no key — the default for tests/CI/E2E
 *
 * When unset, falls back to anthropic if any API credential is present,
 * else mock — so a fresh clone works without any configuration.
 */
import { AnthropicClient } from "./anthropic";
import { hasAnthropicCredentials } from "./auth";
import { ClaudeCodeClient } from "./claude-code";
import { MockLlmClient } from "./mock";
import type { LlmClient } from "./types";

export type { LlmClient } from "./types";

export const LLM_PROVIDERS = ["mock", "anthropic", "claude-code"] as const;

export type LlmProvider = (typeof LLM_PROVIDERS)[number];

/** The provider selected by the environment. */
export function resolveProvider(): LlmProvider {
  const configured = process.env.LLM_PROVIDER;
  if ((LLM_PROVIDERS as readonly string[]).includes(configured ?? "")) {
    return configured as LlmProvider;
  }
  if (configured !== undefined) {
    throw new Error(
      `invalid LLM_PROVIDER "${configured}" — expected one of: ${LLM_PROVIDERS.join(", ")}`
    );
  }
  return hasAnthropicCredentials() ? "anthropic" : "mock";
}

const clients = new Map<LlmProvider, LlmClient>();

/** Shared client instance for the configured provider. */
export function getLlmClient(): LlmClient {
  const provider = resolveProvider();
  let client = clients.get(provider);
  if (!client) {
    client =
      provider === "mock"
        ? new MockLlmClient()
        : provider === "claude-code"
          ? new ClaudeCodeClient()
          : new AnthropicClient();
    clients.set(provider, client);
  }
  return client;
}
