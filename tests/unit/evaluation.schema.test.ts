import { describe, expect, it } from "vitest";
import {
  averageScore,
  CardGradeSchema,
  EvaluationSchema,
  LAPSE_THRESHOLD,
  VariantSchema,
  type Evaluation,
} from "@/domain/evaluation.schema";

const validEvaluation: Evaluation = {
  scores: {
    problematisation: 3,
    concepts: 2,
    argumentation: 3,
    culture: 1,
    expression: 4,
  },
  evidence: [
    {
      criterion: "problematisation",
      quote: "労働は強制であると同時に解放でもある",
      comment: "二直観の緊張が明示されている",
    },
  ],
  feedback: "反論の内在的限界をもう一段掘り下げる。",
  missingReperes: ["absolu-relatif"],
  missingTheses: ["s1-t2"],
};

describe("Evaluation schema", () => {
  it("parses a valid grader payload", () => {
    expect(EvaluationSchema.parse(validEvaluation)).toEqual(validEvaluation);
  });

  it("rejects out-of-range scores", () => {
    const tooHigh = structuredClone(validEvaluation);
    tooHigh.scores.concepts = 5;
    expect(EvaluationSchema.safeParse(tooHigh).success).toBe(false);

    const negative = structuredClone(validEvaluation);
    negative.scores.culture = -1;
    expect(EvaluationSchema.safeParse(negative).success).toBe(false);
  });

  it("rejects non-integer scores", () => {
    const fractional = structuredClone(validEvaluation);
    fractional.scores.expression = 2.5;
    expect(EvaluationSchema.safeParse(fractional).success).toBe(false);
  });

  it("rejects a payload missing a criterion", () => {
    const { scores, ...rest } = structuredClone(validEvaluation);
    const partial = {
      ...rest,
      scores: { ...scores } as Partial<typeof scores>,
    };
    delete partial.scores.argumentation;
    expect(EvaluationSchema.safeParse(partial).success).toBe(false);
  });

  it("averages the five criteria", () => {
    expect(averageScore(validEvaluation)).toBeCloseTo((3 + 2 + 3 + 1 + 4) / 5, 10);
  });

  it("flags lapse below the threshold", () => {
    expect(LAPSE_THRESHOLD).toBe(2.0);
    const weak = structuredClone(validEvaluation);
    weak.scores = {
      problematisation: 1,
      concepts: 1,
      argumentation: 2,
      culture: 1,
      expression: 2,
    };
    expect(averageScore(weak)).toBeLessThan(LAPSE_THRESHOLD);
  });
});

describe("card grade and variant schemas", () => {
  it("accepts fractional card scores within 0–4", () => {
    expect(CardGradeSchema.parse({ score: 2.5, comment: "ok" }).score).toBe(2.5);
    expect(CardGradeSchema.safeParse({ score: 4.5, comment: "" }).success).toBe(
      false
    );
  });

  it("requires a non-empty variant question", () => {
    expect(VariantSchema.safeParse({ question: "" }).success).toBe(false);
    expect(
      VariantSchema.safeParse({ question: "自由は制度を必要とするか" }).success
    ).toBe(true);
  });
});
