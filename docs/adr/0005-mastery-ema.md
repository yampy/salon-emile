# ADR 0005 — Mastery as EMA (α = 0.3) with a soft roadmap gate

**Status**: accepted

## Context

A learner's competence per (notion, criterion) drifts; a plain average
overweights stale attempts, a last-score-wins model is noisy. The roadmap
needs a progress signal without ever locking content — this is a salon, not
a syllabus prison.

## Decision

- `mastery(notion, criterion)` is an exponential moving average with
  α = 0.3 over `score / 4`; the first observation initializes the value.
- The roadmap gate is *soft*: when a session's average mastery over its
  notions reaches 0.6, the next session shows a「推奨」(recommended) badge.
  Nothing is ever locked; any session can be opened at any time.
- Both rules live in `domain/mastery.ts` as pure functions.

## Consequences

- Recent performance dominates (≈ 70% of weight in the last three attempts)
  while history still counts — matching how révision actually feels.
- Fixed α keeps the model explainable on the dashboard; no hidden calibration.
- A soft gate preserves learner autonomy — the Rousseau constraint — while
  still giving the roadmap a meaningful "you are ready" signal.
