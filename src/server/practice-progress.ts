/**
 * Practice progress — the session journey is the six exercise formats,
 * revisitable in any order. A session counts as complete once its
 * mini-essay (the capstone format) has been graded at least once.
 */
import { eq, inArray } from "drizzle-orm";
import type { Db } from "@/db/client";
import { attempts, evaluations } from "@/db/schema";
import { EXERCISE_KINDS, type ExerciseKind } from "@/domain/exercise";

export type SessionPracticeProgress = {
  /** Formats with at least one graded attempt. */
  attemptedKinds: ExerciseKind[];
  /** True once the mini-essay has been graded. */
  completed: boolean;
};

/** Graded-format progress for every session that has any. */
export function practiceProgressBySession(
  db: Db
): Map<number, SessionPracticeProgress> {
  const rows = db
    .select({
      sessionN: attempts.sessionN,
      exerciseKind: attempts.exerciseKind,
      attemptId: attempts.id,
    })
    .from(attempts)
    .where(inArray(attempts.kind, ["exercise", "essay", "variant"]))
    .all();
  const gradedIds = new Set(
    db.select({ attemptId: evaluations.attemptId }).from(evaluations).all()
      .map((r) => r.attemptId)
  );

  const map = new Map<number, Set<ExerciseKind>>();
  for (const row of rows) {
    if (!row.exerciseKind || !gradedIds.has(row.attemptId)) continue;
    const set = map.get(row.sessionN) ?? new Set<ExerciseKind>();
    set.add(row.exerciseKind);
    map.set(row.sessionN, set);
  }

  return new Map(
    [...map.entries()].map(([sessionN, kinds]) => [
      sessionN,
      {
        attemptedKinds: EXERCISE_KINDS.filter((k) => kinds.has(k)),
        completed: kinds.has("mini_essay"),
      },
    ])
  );
}

/** Progress for one session (empty when nothing is graded yet). */
export function practiceProgress(
  db: Db,
  sessionN: number
): SessionPracticeProgress {
  const rows = db
    .select()
    .from(attempts)
    .where(eq(attempts.sessionN, sessionN))
    .all()
    .filter((a) => a.kind !== "reveal" && a.exerciseKind !== null);
  const gradedIds = new Set(
    db.select({ attemptId: evaluations.attemptId }).from(evaluations).all()
      .map((r) => r.attemptId)
  );
  const kinds = new Set(
    rows.filter((a) => gradedIds.has(a.id)).map((a) => a.exerciseKind!)
  );
  return {
    attemptedKinds: EXERCISE_KINDS.filter((k) => kinds.has(k)),
    completed: kinds.has("mini_essay"),
  };
}
