/**
 * Lesson state machine.
 *
 * A lesson walks the fixed step sequence below. Transitions are decided by
 * the server only: the tutor LLM may *request* an advance (via the
 * `advance_step` tool), but the step moves forward only if the learner has
 * produced at least one substantive answer during the current step. The
 * LLM's own utterances never advance the lesson.
 *
 * Session 0 (methodology) runs the same shape; its step content maps onto
 * the canon's method/exercise fields instead of notions and theses.
 */

export const LESSON_STEPS = [
  "intuition",
  "definition_reperes",
  "theses",
  "question",
  "essay",
  "bridge",
] as const;

export type LessonStep = (typeof LESSON_STEPS)[number];

/**
 * Minimum trimmed length (in characters) for a learner message to count as a
 * substantive production. Japanese prose is dense, so a genuine attempt at
 * even a one-line answer comfortably clears this bar while bare
 * acknowledgements ("はい", "ok") do not.
 */
export const MIN_PRODUCTION_LENGTH = 8;

/** Whether a learner message counts as a substantive production. */
export function isSubstantiveProduction(text: string): boolean {
  return text.trim().length >= MIN_PRODUCTION_LENGTH;
}

/** First step of every lesson. */
export const INITIAL_STEP: LessonStep = LESSON_STEPS[0];

/** True when `value` names a lesson step. */
export function isLessonStep(value: string): value is LessonStep {
  return (LESSON_STEPS as readonly string[]).includes(value);
}

/** The step after `step`, or null when `step` is terminal. */
export function nextStep(step: LessonStep): LessonStep | null {
  const index = LESSON_STEPS.indexOf(step);
  return index < LESSON_STEPS.length - 1 ? LESSON_STEPS[index + 1] : null;
}

/** True for the last step of the sequence. */
export function isTerminalStep(step: LessonStep): boolean {
  return nextStep(step) === null;
}

export type AdvanceResult =
  | { ok: true; next: LessonStep }
  | { ok: false; reason: "no_production" | "terminal" };

/**
 * Server-side transition judgment: advance from `step` given the learner
 * messages produced during that step. Refuses when nothing substantive was
 * produced or the lesson is already at its final step.
 */
export function advanceStep(
  step: LessonStep,
  productionsInStep: readonly string[]
): AdvanceResult {
  const next = nextStep(step);
  if (next === null) {
    return { ok: false, reason: "terminal" };
  }
  if (!productionsInStep.some(isSubstantiveProduction)) {
    return { ok: false, reason: "no_production" };
  }
  return { ok: true, next };
}
