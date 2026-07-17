# ADR 0004 — Grader speaks only structured output (Evaluation schema)

**Status**: accepted

## Context

Free-text feedback cannot drive mastery tracking, lapse detection, or
dashboards; and a grader that chats is one step from handing out model
answers.

## Decision

The grader is a separate prompt module from the tutor and may only answer
through a fixed Zod schema:

```ts
Evaluation = {
  scores: { problematisation, concepts, argumentation, culture, expression } // int 0–4 each
  evidence: [{ criterion, quote, comment }]
  feedback: string          // 1–3 concrete next moves, never a model answer
  missingReperes: string[]  // canon ids only
  missingTheses: string[]   // canon ids only
}
```

The full rubric text and the per-session teaching plan are injected into the
grader's system blocks. Schema validation happens at the client boundary
(`generateObject`), so a malformed response can never reach the DB.

## Consequences

- Every evaluation is machine-usable: EMA updates, lapse threshold (< 2.0
  average), history views and heatmaps all derive from one shape.
- Evidence quotes keep the grader honest — the UI shows what the score is
  anchored to.
- `missing*` fields are id-checked against the canon, reinforcing the
  canon-only guardrail.
