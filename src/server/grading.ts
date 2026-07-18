/**
 * Grading flow: persist the attempt, run the grader (structured output
 * only), fold scores into mastery, and — for weak attempts — spawn a lapse
 * review card carrying an isomorphic variant question.
 *
 * Also implements the "reveal" guardrail: revealing canon material is
 * recorded as an attempt and immediately followed by a mandatory variant
 * question.
 */
import { and, desc, eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { attempts, cards, evaluations, type AttemptKind } from "@/db/schema";
import { getModelSetting } from "@/db/settings";
import {
  averageScore,
  EvaluationSchema,
  LAPSE_THRESHOLD,
  VariantSchema,
  type Evaluation,
} from "@/domain/evaluation.schema";
import type { ExerciseKind } from "@/domain/exercise";
import { newCard } from "@/domain/fsrs";
import { getLlmClient } from "@/llm";
import { buildGraderPrompt, buildGraderSystem } from "@/llm/prompts/grader";
import { buildVariantPrompt, buildVariantSystem } from "@/llm/prompts/variantGenerator";
import { getSessionPlan, type SessionPlanData } from "@/server/canon";
import { applyEvaluationToMastery } from "@/server/mastery";
import { recordUsage } from "@/server/usage";
import { cardId } from "@/db/seed";

export type GradeInput = {
  sessionN: number;
  kind: Extract<AttemptKind, "exercise" | "essay" | "variant">;
  exerciseKind?: ExerciseKind;
  question: string;
  answer: string;
};

export type GradeResult = {
  attemptId: number;
  evaluation: Evaluation;
  average: number;
  lapseCardCreated: boolean;
};

/** Grade one learner attempt end to end. */
export async function gradeAttempt(
  db: Db,
  plan: SessionPlanData,
  input: GradeInput,
  now: Date = new Date()
): Promise<GradeResult> {
  const attempt = db
    .insert(attempts)
    .values({
      kind: input.kind,
      exerciseKind: input.exerciseKind ?? null,
      sessionN: input.sessionN,
      notionId: plan.notionIds[0] ?? null,
      question: input.question,
      answer: input.answer,
    })
    .returning()
    .get();

  const llm = getLlmClient();
  const graderModel = getModelSetting(db, "graderModel");
  const { object: evaluation, usage } = await llm.generateObject({
    model: graderModel,
    system: buildGraderSystem({
      rubric: plan.rubric,
      session: plan.session,
      theses: plan.theses,
      reperes: plan.reperes,
    }),
    prompt: buildGraderPrompt(input.question, input.answer),
    schema: EvaluationSchema,
    schemaName: "evaluation",
  });
  recordUsage(db, "grader", graderModel, usage);

  const average = averageScore(evaluation);
  db.insert(evaluations)
    .values({
      attemptId: attempt.id,
      scores: evaluation.scores,
      evidence: evaluation.evidence,
      feedback: evaluation.feedback,
      missingReperes: evaluation.missingReperes,
      missingTheses: evaluation.missingTheses,
      averageScore: average,
    })
    .run();

  applyEvaluationToMastery(db, plan.notionIds, evaluation, now);

  let lapseCardCreated = false;
  if (average < LAPSE_THRESHOLD) {
    const variant = await generateVariant(db, input.question, []);
    const fsrs = newCard(now);
    db.insert(cards)
      .values({
        id: cardId("lapse", attempt.id),
        kind: "lapse",
        sourceId: String(attempt.id),
        prompt: variant,
        due: fsrs.due,
        stability: fsrs.stability,
        difficulty: fsrs.difficulty,
        elapsedDays: fsrs.elapsed_days,
        scheduledDays: fsrs.scheduled_days,
        reps: fsrs.reps,
        lapses: fsrs.lapses,
        learningSteps: fsrs.learning_steps,
        state: fsrs.state,
        lastReview: null,
      })
      .onConflictDoNothing()
      .run();
    lapseCardCreated = true;
  }

  return { attemptId: attempt.id, evaluation, average, lapseCardCreated };
}

/** Produce an isomorphic variant of a question via the light model. */
export async function generateVariant(
  db: Db,
  question: string,
  previousVariants: string[]
): Promise<string> {
  const llm = getLlmClient();
  const lightModel = getModelSetting(db, "lightModel");
  const { object, usage } = await llm.generateObject({
    model: lightModel,
    system: buildVariantSystem(),
    prompt: buildVariantPrompt(question, previousVariants),
    schema: VariantSchema,
    schemaName: "variant",
  });
  recordUsage(db, "variantGenerator", lightModel, usage);
  return object.question;
}

export type RevealResult = {
  attemptId: number;
  /** Canon material shown to the learner (never generated content). */
  canon: {
    core: string | null;
    method: string | null;
    reperesNote: string | null;
    theses: { id: string; philosopher: string; claim: string }[];
  };
  /** Mandatory follow-up: an isomorphic variant the learner must answer. */
  variantQuestion: string;
};

/**
 * "答えを見る" guardrail: record the reveal as an attempt, hand back canon
 * material only, and require an immediate variant question.
 */
export async function revealAnswer(
  db: Db,
  plan: SessionPlanData,
  input: {
    sessionN: number;
    exerciseKind?: ExerciseKind;
    question: string;
  }
): Promise<RevealResult> {
  const attempt = db
    .insert(attempts)
    .values({
      kind: "reveal",
      exerciseKind: input.exerciseKind ?? null,
      sessionN: input.sessionN,
      notionId: plan.notionIds[0] ?? null,
      question: input.question,
      answer: "",
    })
    .returning()
    .get();

  const variantQuestion = await generateVariant(db, input.question, []);

  return {
    attemptId: attempt.id,
    canon: {
      core: plan.session.core,
      method: plan.session.method,
      reperesNote: plan.session.reperesNote,
      theses: plan.theses,
    },
    variantQuestion,
  };
}

export type AttemptHistoryEntry = {
  attempt: typeof attempts.$inferSelect;
  evaluation: typeof evaluations.$inferSelect | null;
};

/** Recent graded attempts for a session, newest first. */
export function listAttemptHistory(
  db: Db,
  sessionN: number,
  limit = 10
): AttemptHistoryEntry[] {
  const rows = db
    .select()
    .from(attempts)
    .where(
      and(
        eq(attempts.sessionN, sessionN),
        inArray(attempts.kind, ["exercise", "essay", "variant"])
      )
    )
    .orderBy(desc(attempts.id))
    .limit(limit)
    .all();
  return rows.map((attempt) => ({
    attempt,
    evaluation:
      db
        .select()
        .from(evaluations)
        .where(eq(evaluations.attemptId, attempt.id))
        .get() ?? null,
  }));
}

export type RevealStats = {
  reveals: number;
  answered: number;
  /** reveals / (reveals + answered); null before any activity. */
  rate: number | null;
};

/** How often the learner looked at the answer instead of attempting. */
export function revealStats(db: Db): RevealStats {
  const all = db.select({ kind: attempts.kind }).from(attempts).all();
  const reveals = all.filter((a) => a.kind === "reveal").length;
  const answered = all.length - reveals;
  const total = reveals + answered;
  return {
    reveals,
    answered,
    rate: total === 0 ? null : reveals / total,
  };
}

/** Look up a session plan or throw a typed 404-ish error for routes. */
export function requireSessionPlan(db: Db, sessionN: number): SessionPlanData {
  const plan = Number.isInteger(sessionN) ? getSessionPlan(db, sessionN) : null;
  if (!plan) {
    throw new SessionNotFoundError(sessionN);
  }
  return plan;
}

export class SessionNotFoundError extends Error {
  constructor(sessionN: number) {
    super(`unknown session ${sessionN}`);
    this.name = "SessionNotFoundError";
  }
}
