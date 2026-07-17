/**
 * Anthropic credential resolution, in order of precedence:
 *
 * 1. `ANTHROPIC_API_KEY`      — classic API key (x-api-key header)
 * 2. `ANTHROPIC_AUTH_TOKEN`   — pre-issued OAuth bearer token
 * 3. `ant` CLI OAuth profile  — `ant auth login`; short-lived access tokens
 *    are minted (and auto-refreshed) via `ant auth print-credentials`.
 *
 * OAuth requests need the `anthropic-beta: oauth-2025-04-20` header in
 * addition to the bearer token; the API rejects requests carrying both an
 * API key and a bearer token, so exactly one mechanism is ever used.
 */
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const OAUTH_BETA_HEADER = "oauth-2025-04-20";

/** How long a minted OAuth access token is reused before re-minting. */
const TOKEN_CACHE_TTL_MS = 5 * 60 * 1000;

export type AnthropicAuth =
  | { kind: "apiKey"; apiKey: string }
  | { kind: "oauth"; authToken: string };

let cachedToken: { value: string; expiresAt: number } | null = null;

/** Directory where `ant auth login` stores profiles. */
function antConfigDir(): string {
  return (
    process.env.ANTHROPIC_CONFIG_DIR ??
    path.join(os.homedir(), ".config", "anthropic")
  );
}

/** True when an `ant auth login` profile exists on this machine. */
export function hasAntProfile(): boolean {
  try {
    const dir = path.join(antConfigDir(), "credentials");
    return fs.readdirSync(dir).some((f) => f.endsWith(".json"));
  } catch {
    return false;
  }
}

/** Mint (or reuse) a short-lived OAuth access token via the ant CLI. */
function mintOauthToken(): string {
  if (cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }
  const token = execFileSync("ant", ["auth", "print-credentials", "--access-token"], {
    encoding: "utf8",
    timeout: 15_000,
  }).trim();
  if (!token) {
    throw new Error("ant auth print-credentials returned an empty token");
  }
  cachedToken = { value: token, expiresAt: Date.now() + TOKEN_CACHE_TTL_MS };
  return token;
}

/** True when some Anthropic credential source is available. */
export function hasAnthropicCredentials(): boolean {
  return Boolean(
    process.env.ANTHROPIC_API_KEY ||
      process.env.ANTHROPIC_AUTH_TOKEN ||
      hasAntProfile()
  );
}

/** Resolve the credential to use for one request. Throws when none exist. */
export function resolveAnthropicAuth(): AnthropicAuth {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (apiKey) {
    return { kind: "apiKey", apiKey };
  }
  const envToken = process.env.ANTHROPIC_AUTH_TOKEN;
  if (envToken) {
    return { kind: "oauth", authToken: envToken };
  }
  if (hasAntProfile()) {
    return { kind: "oauth", authToken: mintOauthToken() };
  }
  throw new Error(
    "no Anthropic credentials: set ANTHROPIC_API_KEY, ANTHROPIC_AUTH_TOKEN, or run `ant auth login`"
  );
}

/** Human-readable label of the active credential source (settings screen). */
export function describeAuthSource(): "apiKey" | "oauth (env token)" | "oauth (ant profile)" | "none" {
  if (process.env.ANTHROPIC_API_KEY) return "apiKey";
  if (process.env.ANTHROPIC_AUTH_TOKEN) return "oauth (env token)";
  if (hasAntProfile()) return "oauth (ant profile)";
  return "none";
}
