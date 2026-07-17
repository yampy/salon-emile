# ADR 0001 — Module boundaries: app / domain / llm / db / data / components

**Status**: accepted

## Context

A single-user local app still deserves public-repo quality. The riskiest
coupling in an LLM-backed learning app is teaching logic leaking into UI
code, prompts, or SQL — after which nothing can be unit-tested without a
server or an API key.

## Decision

Fixed directory layout with one dependency direction:

```
src/
  app/          # screens and Route Handlers (Next.js App Router)
  domain/       # pure logic: state machine, EMA, FSRS mapping, Zod schemas
  llm/          # LlmClient, AnthropicClient, MockLlmClient, prompts/ (4 roles)
  db/           # drizzle schema, migrations runner, seed, verify
  server/       # read/write services composing domain + db + llm
  data/         # curriculum.json — the single canonical source of material
  components/   # presentational React components
```

`domain/` imports nothing but `zod`/`ts-fsrs`; `llm/` and `db/` may import
`domain/`; `server/` composes the three; `app/` calls `server/`. Teaching
content lives only in `src/data/curriculum.json` and the tables seeded from
it — never in code or prompts.

## Consequences

- The whole pedagogical core (transitions, EMA, rating mapping, schemas) is
  unit-testable in milliseconds without a database or network.
- Route handlers stay thin; integration tests exercise them against a temp
  SQLite file and the mock LLM.
- Adding a screen or an LLM provider touches one layer each.
