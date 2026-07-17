import { describe, expect, it } from "vitest";
import {
  isDue,
  newCard,
  Rating,
  reviewCard,
  scoreToRating,
  State,
} from "@/domain/fsrs";

describe("score → FSRS rating mapping", () => {
  it("maps per the fixed boundaries", () => {
    expect(scoreToRating(0)).toBe(Rating.Again);
    expect(scoreToRating(1.49)).toBe(Rating.Again);
    expect(scoreToRating(1.5)).toBe(Rating.Hard);
    expect(scoreToRating(2.49)).toBe(Rating.Hard);
    expect(scoreToRating(2.5)).toBe(Rating.Good);
    expect(scoreToRating(3.49)).toBe(Rating.Good);
    expect(scoreToRating(3.5)).toBe(Rating.Easy);
    expect(scoreToRating(4)).toBe(Rating.Easy);
  });
});

describe("ts-fsrs scheduling wrapper", () => {
  const now = new Date("2026-01-01T09:00:00.000Z");

  it("creates a new card due immediately", () => {
    const card = newCard(now);
    expect(card.state).toBe(State.New);
    expect(isDue(card, now)).toBe(true);
  });

  it("schedules the next review strictly after now on a Good answer", () => {
    const { card } = reviewCard(newCard(now), Rating.Good, now);
    expect(card.due.getTime()).toBeGreaterThan(now.getTime());
    expect(card.reps).toBe(1);
    expect(card.state).not.toBe(State.New);
  });

  it("spaces Easy further out than Again", () => {
    const easy = reviewCard(newCard(now), Rating.Easy, now).card;
    const again = reviewCard(newCard(now), Rating.Again, now).card;
    expect(easy.due.getTime()).toBeGreaterThan(again.due.getTime());
  });

  it("keeps a future-due card out of the queue", () => {
    const { card } = reviewCard(newCard(now), Rating.Easy, now);
    expect(isDue(card, now)).toBe(false);
    expect(isDue(card, new Date(card.due.getTime() + 1))).toBe(true);
  });

  it("records the applied rating in the review log", () => {
    const { log } = reviewCard(newCard(now), Rating.Hard, now);
    expect(log.rating).toBe(Rating.Hard);
  });
});
