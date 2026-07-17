# ADR 0002 — LLM abstraction: LlmClient with Anthropic and deterministic mock

**Status**: accepted

## Context

Every distinctive feature (Socratic dialogue, rubric grading, card grading,
variant generation) calls an LLM, yet tests, CI and E2E must run without an
API key, deterministically, forever.

## Decision

One interface, two implementations, selected by `LLM_PROVIDER=mock|anthropic`:

- `LlmClient` exposes exactly two capabilities: `chatStream()` (tutor) and
  `generateObject()` (grader / cardGrader / variantGenerator, Zod-validated).
- `AnthropicClient` goes through the Vercel AI SDK (`@ai-sdk/anthropic`).
  System blocks flagged as stable — the tutor/grader constitution and the
  per-session teaching plan — carry `cache_control` markers so the prefix is
  served from Anthropic's prompt cache across turns.
- Model ids are resolved per call from DB settings (three slots:
  `tutorModel`, `graderModel`, `lightModel`); nothing is hardcoded.
- `MockLlmClient` is fully deterministic: per-step canned tutor replies, an
  advance request iff the last learner message is substantive, and graded
  fixtures keyed on answer length so both the strong and lapse paths are
  reachable in tests.

## Consequences

- `pnpm test` / `pnpm e2e` are key-free and reproducible; the CI matrix never
  spends tokens.
- Prompt-cache placement is decided once, in the client, not per call site.
- The mock encodes the contract ("what would a reasonable model do") — when
  prompts evolve, the mock documents the expected behavior shape.
