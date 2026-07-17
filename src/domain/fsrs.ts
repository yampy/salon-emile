/**
 * Spaced-repetition scheduling, delegated entirely to ts-fsrs.
 * This module only maps our 0–4 card grades onto FSRS ratings and wraps the
 * scheduler; no interval arithmetic of our own lives here or anywhere else.
 */
import {
  createEmptyCard,
  fsrs,
  Rating,
  State,
  type Card as FsrsCard,
  type Grade,
  type RecordLogItem,
} from "ts-fsrs";

export { Rating, State };
export type { FsrsCard, Grade };

/** Score boundaries for mapping a 0–4 card grade onto an FSRS rating. */
export const RATING_BOUNDS = { again: 1.5, hard: 2.5, good: 3.5 } as const;

const scheduler = fsrs();

/**
 * Map a cardGrader score (0–4) onto an FSRS rating:
 * `< 1.5 → Again`, `< 2.5 → Hard`, `< 3.5 → Good`, otherwise `Easy`.
 */
export function scoreToRating(score: number): Grade {
  if (score < RATING_BOUNDS.again) return Rating.Again;
  if (score < RATING_BOUNDS.hard) return Rating.Hard;
  if (score < RATING_BOUNDS.good) return Rating.Good;
  return Rating.Easy;
}

/** A brand-new FSRS card due immediately. */
export function newCard(now: Date): FsrsCard {
  return createEmptyCard(now);
}

/**
 * Apply one review to a card; ts-fsrs decides the next due date.
 * Returns the updated card together with the review log.
 */
export function reviewCard(
  card: FsrsCard,
  rating: Grade,
  now: Date
): RecordLogItem {
  return scheduler.next(card, now, rating);
}

/** True when the card is due for review at `now`. */
export function isDue(card: FsrsCard, now: Date): boolean {
  return card.due.getTime() <= now.getTime();
}
