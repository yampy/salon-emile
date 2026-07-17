/**
 * Structured-output schemas for the three grading/generation roles.
 *
 * The grader may only ever answer through `EvaluationSchema` (never free
 * text); cardGrader and variantGenerator use the lighter schemas below.
 */
import { z } from "zod";

const criterionScore = z.number().int().min(0).max(4);

/** Full five-criterion evaluation returned by the grader role. */
export const EvaluationSchema = z.object({
  scores: z.object({
    problematisation: criterionScore,
    concepts: criterionScore,
    argumentation: criterionScore,
    culture: criterionScore,
    expression: criterionScore,
  }),
  evidence: z.array(
    z.object({
      criterion: z.string(),
      quote: z.string(),
      comment: z.string(),
    })
  ),
  /** 1–3 concrete next moves for the learner. */
  feedback: z.string(),
  missingReperes: z.array(z.string()),
  missingTheses: z.array(z.string()),
});

export type Evaluation = z.infer<typeof EvaluationSchema>;

/** Lightweight 0–4 grade returned by the cardGrader role for review answers. */
export const CardGradeSchema = z.object({
  score: z.number().min(0).max(4),
  comment: z.string(),
});

export type CardGrade = z.infer<typeof CardGradeSchema>;

/** Isomorphic variant question produced by the variantGenerator role. */
export const VariantSchema = z.object({
  question: z.string().min(1),
});

export type Variant = z.infer<typeof VariantSchema>;

/** Mean of the five criterion scores of an evaluation (0–4). */
export function averageScore(evaluation: Evaluation): number {
  const values = Object.values(evaluation.scores);
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/**
 * Evaluations averaging below this threshold spawn a `lapse` review card
 * (an isomorphic variant of the failed question).
 */
export const LAPSE_THRESHOLD = 2.0;
