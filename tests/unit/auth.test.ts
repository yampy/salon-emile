import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  describeAuthSource,
  hasAnthropicCredentials,
  hasAntProfile,
  resolveAnthropicAuth,
} from "@/llm/auth";

const ENV_KEYS = [
  "ANTHROPIC_API_KEY",
  "ANTHROPIC_AUTH_TOKEN",
  "ANTHROPIC_CONFIG_DIR",
] as const;

let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const key of ENV_KEYS) delete process.env[key];
  // point the ant config dir somewhere empty so a real login on the
  // developer machine can't leak into the tests
  process.env.ANTHROPIC_CONFIG_DIR = "/nonexistent-ant-config";
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (saved[key] === undefined) delete process.env[key];
    else process.env[key] = saved[key];
  }
});

describe("Anthropic credential resolution", () => {
  it("prefers the API key over everything", () => {
    process.env.ANTHROPIC_API_KEY = "key-1";
    process.env.ANTHROPIC_AUTH_TOKEN = "token-1";
    expect(resolveAnthropicAuth()).toEqual({ kind: "apiKey", apiKey: "key-1" });
    expect(describeAuthSource()).toBe("apiKey");
  });

  it("uses the env bearer token when no API key is set", () => {
    process.env.ANTHROPIC_AUTH_TOKEN = "token-2";
    expect(resolveAnthropicAuth()).toEqual({
      kind: "oauth",
      authToken: "token-2",
    });
    expect(describeAuthSource()).toBe("oauth (env token)");
  });

  it("reports no credentials when nothing is configured", () => {
    expect(hasAntProfile()).toBe(false);
    expect(hasAnthropicCredentials()).toBe(false);
    expect(describeAuthSource()).toBe("none");
    expect(() => resolveAnthropicAuth()).toThrow(/no Anthropic credentials/);
  });

  it("detects credentials from either env source", () => {
    process.env.ANTHROPIC_API_KEY = "key";
    expect(hasAnthropicCredentials()).toBe(true);
    delete process.env.ANTHROPIC_API_KEY;
    process.env.ANTHROPIC_AUTH_TOKEN = "token";
    expect(hasAnthropicCredentials()).toBe(true);
  });
});
