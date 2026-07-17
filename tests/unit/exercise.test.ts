import { describe, expect, it } from "vitest";
import {
  buildExerciseStatement,
  EXERCISE_KINDS,
  EXERCISE_LABELS,
  isExerciseKind,
} from "@/domain/exercise";

const QUESTION = "人は自分自身を知ることができるか";

describe("exercise formats", () => {
  it("defines exactly the six formats", () => {
    expect(EXERCISE_KINDS).toHaveLength(6);
    for (const kind of EXERCISE_KINDS) {
      expect(EXERCISE_LABELS[kind]).toBeTruthy();
    }
  });

  it("recognizes format names", () => {
    expect(isExerciseKind("mini_essay")).toBe(true);
    expect(isExerciseKind("confetti")).toBe(false);
  });

  it("embeds the canonical question in every statement", () => {
    for (const kind of EXERCISE_KINDS) {
      const statement = buildExerciseStatement(kind, {
        question: QUESTION,
        repere: { fr: "absolu / relatif", ja: "絶対的/相対的" },
      });
      expect(statement).toContain(QUESTION);
      expect(statement.length).toBeGreaterThan(QUESTION.length);
    }
  });

  it("mentions the repere pair for repere_application", () => {
    const withRepere = buildExerciseStatement("repere_application", {
      question: QUESTION,
      repere: { fr: "absolu / relatif", ja: "絶対的/相対的" },
    });
    expect(withRepere).toContain("absolu / relatif");

    const without = buildExerciseStatement("repere_application", {
      question: QUESTION,
    });
    expect(without).toContain(QUESTION);
  });

  it("is deterministic", () => {
    const a = buildExerciseStatement("plan", { question: QUESTION });
    const b = buildExerciseStatement("plan", { question: QUESTION });
    expect(a).toBe(b);
  });
});
