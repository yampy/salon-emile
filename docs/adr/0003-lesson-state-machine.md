# ADR 0003 — Lesson state machine with server-judged transitions

**Status**: accepted

## Context

A lesson must walk through `intuition → definition_reperes → theses → question →
essay → bridge`. If the LLM's own utterances could advance the lesson, a
chatty tutor could sprint through steps without the learner producing
anything — the opposite of negative education.

## Decision

- The step sequence is a fixed array in `domain/lesson.ts`; session 0 runs
  the same shape with its content mapped onto the canon's method/exercise
  fields.
- The tutor may *request* an advance via the `advance_step` tool; the server
  alone judges it: the step moves only if the learner produced at least one
  substantive message (trimmed length ≥ 8 chars) during the current step.
- A substantive production at the terminal step completes the lesson run.
- The judgment is pure (`advanceStep(step, productions)`) and unit-tested,
  including "LLM alone cannot advance".

## Consequences

- Progress is evidence of learner output by construction, not model mood.
- The tutor prompt can honestly tell the model "the server decides" — a
  denied advance simply continues the current step.
- The 8-character threshold is a named constant; tuning it is a one-line,
  test-covered change.
