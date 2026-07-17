/**
 * Lesson-run management. The server is the sole authority over step
 * transitions: the tutor's `advance_step` request is honored only when the
 * learner produced at least one substantive message in the current step
 * (see domain/lesson.ts).
 */
import { and, asc, desc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import { lessonRuns, messages } from "@/db/schema";
import {
  advanceStep,
  INITIAL_STEP,
  isSubstantiveProduction,
  type LessonStep,
} from "@/domain/lesson";

export type LessonRun = typeof lessonRuns.$inferSelect;
export type LessonMessage = typeof messages.$inferSelect;

/** The active (not yet completed) run for a session, if any. */
export function getActiveRun(db: Db, sessionN: number): LessonRun | null {
  return (
    db
      .select()
      .from(lessonRuns)
      .where(
        and(eq(lessonRuns.sessionN, sessionN), eq(lessonRuns.status, "active"))
      )
      .get() ?? null
  );
}

/** The most recent run for a session regardless of status, if any. */
export function getLatestRun(db: Db, sessionN: number): LessonRun | null {
  return (
    db
      .select()
      .from(lessonRuns)
      .where(eq(lessonRuns.sessionN, sessionN))
      .orderBy(desc(lessonRuns.id))
      .get() ?? null
  );
}

/** The active run, creating one at the initial step when absent. */
export function getOrCreateActiveRun(db: Db, sessionN: number): LessonRun {
  const existing = getActiveRun(db, sessionN);
  if (existing) {
    return existing;
  }
  return db
    .insert(lessonRuns)
    .values({ sessionN, step: INITIAL_STEP, status: "active" })
    .returning()
    .get();
}

/** All completed runs (for roadmap progress display). */
export function listCompletedRuns(db: Db): LessonRun[] {
  return db
    .select()
    .from(lessonRuns)
    .where(eq(lessonRuns.status, "completed"))
    .all();
}

/** All in-progress runs (roadmap shows 対話中 with their step). */
export function listActiveRuns(db: Db): LessonRun[] {
  return db
    .select()
    .from(lessonRuns)
    .where(eq(lessonRuns.status, "active"))
    .all();
}

/** Dialogue history of a run, oldest first. */
export function listRunMessages(db: Db, runId: number): LessonMessage[] {
  return db
    .select()
    .from(messages)
    .where(eq(messages.lessonRunId, runId))
    .orderBy(asc(messages.id))
    .all();
}

/** Persist one dialogue message at the run's given step. */
export function recordMessage(
  db: Db,
  runId: number,
  role: "user" | "assistant",
  step: LessonStep,
  content: string
): LessonMessage {
  return db
    .insert(messages)
    .values({ lessonRunId: runId, role, step, content })
    .returning()
    .get();
}

export type AdvanceOutcome = {
  advanced: boolean;
  completed: boolean;
  step: LessonStep;
};

/**
 * Server-side judgment of a tutor advance request. Counts the learner's
 * messages in the current step; advances (or completes, at the terminal
 * step) only when at least one is substantive.
 */
export function tryAdvance(db: Db, run: LessonRun): AdvanceOutcome {
  const productions = db
    .select()
    .from(messages)
    .where(
      and(
        eq(messages.lessonRunId, run.id),
        eq(messages.role, "user"),
        eq(messages.step, run.step)
      )
    )
    .all()
    .map((m) => m.content);

  const result = advanceStep(run.step, productions);
  if (result.ok) {
    db.update(lessonRuns)
      .set({ step: result.next })
      .where(eq(lessonRuns.id, run.id))
      .run();
    return { advanced: true, completed: false, step: result.next };
  }
  if (
    result.reason === "terminal" &&
    productions.some(isSubstantiveProduction)
  ) {
    db.update(lessonRuns)
      .set({ status: "completed", completedAt: new Date() })
      .where(eq(lessonRuns.id, run.id))
      .run();
    return { advanced: false, completed: true, step: run.step };
  }
  return { advanced: false, completed: false, step: run.step };
}
