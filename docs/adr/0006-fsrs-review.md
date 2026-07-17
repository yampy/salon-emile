# ADR 0006 — Spaced repetition delegated entirely to ts-fsrs

**Status**: accepted

## Context

Review scheduling is a solved research problem; hand-rolled SRS heuristics
rot. The app needs three card kinds — 31 repère cards (fr pair → ja meaning
+ one application sentence), 64 thesis cards (philosopher → claim), and
lapse cards auto-generated from attempts averaging < 2.0.

## Decision

- ts-fsrs is the only scheduler. The app persists FSRS card state verbatim
  and never computes an interval itself.
- Free-text answers are graded 0–4 by the cardGrader (light model slot),
  then mapped onto FSRS ratings by fixed boundaries:
  `< 1.5 → Again, < 2.5 → Hard, < 3.5 → Good, else Easy`.
- Lapse cards store the currently shown variant; after each review the
  variantGenerator produces a fresh isomorphic variant, steering away from
  every previously shown wording (kept in `review_logs.prompt`) — the same
  question text is never repeated.
- A review round is capped at 10 cards; FSRS ordering (oldest due first)
  picks which ten.

## Consequences

- Scheduling quality tracks the FSRS research line for free via updates.
- Active recall with free-text answers (not self-graded flips) — the grader,
  not the learner's optimism, decides the rating.
- The rating boundaries are pure, named and unit-tested at their edges.
