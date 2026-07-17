/**
 * Mastery model: an exponential moving average (EMA) per
 * (notion, rubric criterion) pair, fed by grader scores.
 *
 * The roadmap gate built on top of it is *soft*: reaching the threshold only
 * marks the next session as recommended — nothing is ever locked.
 */

/** EMA smoothing factor. */
export const MASTERY_ALPHA = 0.3;

/** Average mastery at which the next session becomes recommended. */
export const RECOMMEND_THRESHOLD = 0.6;

/** Highest score the grader can assign on a criterion. */
export const MAX_SCORE = 4;

/**
 * Fold a new grader score (0–4) into the running mastery value (0–1).
 * The first observation initializes mastery to score/MAX_SCORE.
 */
export function updateMastery(previous: number | null, score: number): number {
  if (score < 0 || score > MAX_SCORE) {
    throw new RangeError(`score must be within 0..${MAX_SCORE}, got ${score}`);
  }
  const observation = score / MAX_SCORE;
  if (previous === null) {
    return observation;
  }
  return MASTERY_ALPHA * observation + (1 - MASTERY_ALPHA) * previous;
}

/** Mean of mastery values; null when there are no observations yet. */
export function averageMastery(masteries: readonly number[]): number | null {
  if (masteries.length === 0) {
    return null;
  }
  return masteries.reduce((sum, m) => sum + m, 0) / masteries.length;
}

/**
 * Soft gate: true when a session's average mastery clears the threshold so
 * the next session can be *recommended* (never locked).
 */
export function isRecommended(masteries: readonly number[]): boolean {
  const average = averageMastery(masteries);
  return average !== null && average >= RECOMMEND_THRESHOLD;
}
