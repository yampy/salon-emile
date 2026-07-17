# ADR 0007 — Negative-education guardrails

**Status**: accepted

## Context

The app is named after Rousseau's Émile for a reason: the tutor arranges
discoveries instead of delivering answers. An LLM left unguarded does the
opposite — it loves to lecture, to invent quotes, and to hand over model
essays on request.

## Decision

Three guardrails, each enforced in more than one layer:

1. **No model answers before the learner's attempt.** The tutor and grader
   constitutions forbid it; the grader can only emit the Evaluation schema
   (feedback = next moves, never a model essay); the lesson advances only on
   learner production (ADR 0003).
2. **Revealing has a cost and a follow-up.** The「答えを見る」button records
   a `reveal` attempt, shows *canon material only* (core / method /
   reperesNote / the session's theses), and immediately requires answering an
   isomorphic variant question. The dashboard shows the reveal rate.
3. **Theses and quotes are canon-only.** Theses carry deterministic ids
   (`s{n}-t{i}`); prompts inject them with ids and forbid inventing others;
   `missingTheses`/`missingReperes` are id-checked; display components
   resolve ids against the DB, so non-canon references simply don't render.

## Consequences

- The cheapest path through the app is always *producing something*.
- Looking things up is legitimate (it's canon text), visible (logged and
  displayed), and immediately turned back into practice.
- Hallucinated philosophy cannot enter the learner's notes through the UI.

## Amendment (2026-07-17): textbook pages read friction-free

Learner feedback: the dialogue-only entry point made study feel like an
endless interrogation, and there was no way to *read first*. Each session
now has a textbook page (all canon sections plus AI-generated model answers
in the three-part dissertation form, cached per question). Reading there —
including model answers — is intentionally **outside** guardrail 2: no
reveal event, no forced variant. The reveal cost applies where answers can
substitute for one's own attempt (practice and dialogue); a textbook one
chose to study from is negative education's "arranged experience", not its
enemy. Guardrail 3 still applies to model answers: philosopher references
are constrained to canon theses cited by ID. The lesson state machine's
production gate (guardrail via ADR 0003) also gained a learner-initiated
advance button — same server-side judgment, more learner control over pace.
