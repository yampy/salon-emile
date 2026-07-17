import { describe, expect, it } from "vitest";
import {
  averageMastery,
  isRecommended,
  MASTERY_ALPHA,
  RECOMMEND_THRESHOLD,
  updateMastery,
} from "@/domain/mastery";

describe("mastery EMA", () => {
  it("initializes to score/4 on first observation", () => {
    expect(updateMastery(null, 4)).toBe(1);
    expect(updateMastery(null, 2)).toBe(0.5);
    expect(updateMastery(null, 0)).toBe(0);
  });

  it("folds new scores with α=0.3", () => {
    expect(MASTERY_ALPHA).toBe(0.3);
    // previous 0.5, new score 4 (=1.0): 0.3*1 + 0.7*0.5 = 0.65
    expect(updateMastery(0.5, 4)).toBeCloseTo(0.65, 10);
    // previous 1.0, new score 0: 0.3*0 + 0.7*1 = 0.7
    expect(updateMastery(1, 0)).toBeCloseTo(0.7, 10);
  });

  it("converges toward a stable score", () => {
    let mastery = updateMastery(null, 0);
    for (let i = 0; i < 40; i++) {
      mastery = updateMastery(mastery, 3);
    }
    expect(mastery).toBeCloseTo(0.75, 5);
  });

  it("rejects out-of-range scores", () => {
    expect(() => updateMastery(null, -1)).toThrow(RangeError);
    expect(() => updateMastery(0.5, 5)).toThrow(RangeError);
  });
});

describe("soft recommendation gate", () => {
  it("recommends at average mastery ≥ 0.6", () => {
    expect(RECOMMEND_THRESHOLD).toBe(0.6);
    expect(isRecommended([0.6])).toBe(true);
    expect(isRecommended([0.5, 0.7])).toBe(true);
    expect(isRecommended([0.59])).toBe(false);
  });

  it("never recommends without observations", () => {
    expect(isRecommended([])).toBe(false);
    expect(averageMastery([])).toBeNull();
  });

  it("averages across criteria", () => {
    expect(averageMastery([0.2, 0.4, 0.6])).toBeCloseTo(0.4, 10);
  });
});
