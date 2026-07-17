/**
 * Zod schema for `src/data/curriculum.json` — the single canonical source of
 * all teaching material (notions, theses, questions, rubric, session plans).
 *
 * Everything the app displays or feeds to the LLM must flow through this
 * schema; no teaching content is ever hardcoded elsewhere.
 */
import { z } from "zod";

/** Expected cardinalities of the canon, checked by tests and `pnpm db:verify`. */
export const EXPECTED_COUNTS = {
  sessions: 17,
  notions: 17,
  reperes: 31,
  rubric: 5,
  theses: 64,
  finalEssayQuestions: 10,
} as const;

/** The five rubric criteria used by the grader (fixed order). */
export const RUBRIC_CRITERIA = [
  "problematisation",
  "concepts",
  "argumentation",
  "culture",
  "expression",
] as const;

export type RubricCriterion = (typeof RUBRIC_CRITERIA)[number];

const FIRST_SESSION = 0;
const LAST_SESSION = 16;

const sessionNumber = z.number().int().min(FIRST_SESSION).max(LAST_SESSION);

const MetaSchema = z.object({
  id: z.string().min(1),
  version: z.string().min(1),
  locale: z.string().min(1),
  title: z.string().min(1),
  description: z.string().min(1),
  generatedAt: z.string().min(1),
});

const RubricEntrySchema = z.object({
  id: z.enum(RUBRIC_CRITERIA),
  name: z.string().min(1),
  focus: z.string().min(1),
});

const NotionSchema = z.object({
  id: z.string().min(1),
  ja: z.string().min(1),
  fr: z.string().min(1),
  session: sessionNumber,
});

const RepereSchema = z.object({
  id: z.string().min(1),
  fr: z.string().min(1),
  ja: z.string().min(1),
  sessions: z.array(sessionNumber).min(1),
});

const ThesisSchema = z.object({
  philosopher: z.string().min(1),
  claim: z.string().min(1),
});

const SessionSchema = z.object({
  n: sessionNumber,
  title: z.string().min(1),
  fr: z.string().min(1),
  phase: z.string().min(1),
  notionIds: z.array(z.string().min(1)),
  goal: z.string().min(1),
  intro: z.string().min(1),
  notes: z.string().min(1),
  theses: z.array(ThesisSchema),
  questions: z.array(z.string().min(1)),
  // Session 0 (methodology) carries method/exercise; regular sessions carry
  // reperesNote and a bridge to the next session (absent on the last one).
  core: z.string().min(1).optional(),
  method: z.string().min(1).optional(),
  exercise: z.string().min(1).optional(),
  reperesNote: z.string().min(1).optional(),
  bridge: z.string().min(1).optional(),
});

const FinalEssayQuestionSchema = z.object({
  question: z.string().min(1),
  notion: z.string().min(1),
});

export const CurriculumSchema = z
  .object({
    meta: MetaSchema,
    rubric: z.array(RubricEntrySchema).min(1),
    notions: z.array(NotionSchema).min(1),
    reperes: z.array(RepereSchema).min(1),
    sessions: z.array(SessionSchema).min(1),
    finalEssayQuestions: z.array(FinalEssayQuestionSchema).min(1),
  })
  .superRefine((curriculum, ctx) => {
    const notionIds = new Set(curriculum.notions.map((n) => n.id));
    const sessionNs = new Set<number>();

    for (const [i, session] of curriculum.sessions.entries()) {
      if (sessionNs.has(session.n)) {
        ctx.addIssue({
          code: "custom",
          path: ["sessions", i, "n"],
          message: `duplicate session number ${session.n}`,
        });
      }
      sessionNs.add(session.n);

      for (const notionId of session.notionIds) {
        if (!notionIds.has(notionId)) {
          ctx.addIssue({
            code: "custom",
            path: ["sessions", i, "notionIds"],
            message: `unknown notion id "${notionId}" in session ${session.n}`,
          });
        }
      }
    }

    for (const [i, question] of curriculum.finalEssayQuestions.entries()) {
      if (!notionIds.has(question.notion)) {
        ctx.addIssue({
          code: "custom",
          path: ["finalEssayQuestions", i, "notion"],
          message: `unknown notion id "${question.notion}"`,
        });
      }
    }
  });

export type Curriculum = z.infer<typeof CurriculumSchema>;
export type CurriculumMeta = Curriculum["meta"];
export type RubricEntry = Curriculum["rubric"][number];
export type Notion = Curriculum["notions"][number];
export type Repere = Curriculum["reperes"][number];
export type CurriculumSession = Curriculum["sessions"][number];
export type Thesis = CurriculumSession["theses"][number];
export type FinalEssayQuestion = Curriculum["finalEssayQuestions"][number];

/**
 * Parse and validate raw JSON as the curriculum canon.
 * Throws a ZodError describing every violation when the input is invalid.
 */
export function parseCurriculum(raw: unknown): Curriculum {
  return CurriculumSchema.parse(raw);
}

/**
 * Deterministic identifier for a thesis, derived from its position in the
 * canon (theses carry no explicit id in curriculum.json). Used to enforce the
 * canon-only guardrail: the UI and prompts refer to theses by these ids and
 * anything that fails to resolve against them is never displayed.
 */
export function thesisId(sessionN: number, indexInSession: number): string {
  return `s${sessionN}-t${indexInSession + 1}`;
}

/** Count all theses across sessions (the canon holds them per session). */
export function countTheses(curriculum: Curriculum): number {
  return curriculum.sessions.reduce((sum, s) => sum + s.theses.length, 0);
}

/**
 * Assert the canon carries exactly the cardinalities in EXPECTED_COUNTS.
 * Returns the tallied counts; throws listing every mismatch otherwise.
 */
export function assertExpectedCounts(
  curriculum: Curriculum
): Record<keyof typeof EXPECTED_COUNTS, number> {
  const actual = {
    sessions: curriculum.sessions.length,
    notions: curriculum.notions.length,
    reperes: curriculum.reperes.length,
    rubric: curriculum.rubric.length,
    theses: countTheses(curriculum),
    finalEssayQuestions: curriculum.finalEssayQuestions.length,
  };
  const mismatches = (
    Object.keys(EXPECTED_COUNTS) as (keyof typeof EXPECTED_COUNTS)[]
  ).filter((key) => actual[key] !== EXPECTED_COUNTS[key]);
  if (mismatches.length > 0) {
    const detail = mismatches
      .map((key) => `${key}: expected ${EXPECTED_COUNTS[key]}, got ${actual[key]}`)
      .join("; ");
    throw new Error(`curriculum counts mismatch — ${detail}`);
  }
  return actual;
}
