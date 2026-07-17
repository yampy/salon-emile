/**
 * Read-side access to the canon tables (seeded from curriculum.json),
 * shaped for prompt building and page rendering. All teaching material the
 * app shows or sends to the LLM flows through here.
 */
import { asc, eq } from "drizzle-orm";
import type { Db } from "@/db/client";
import {
  notions,
  reperes,
  rubricEntries,
  sessions,
  theses,
} from "@/db/schema";
import type {
  RepereRef,
  RubricRef,
  SessionPlan,
  ThesisRef,
} from "@/llm/prompts/context";

export type SessionPlanData = {
  session: SessionPlan;
  theses: ThesisRef[];
  reperes: RepereRef[];
  rubric: RubricRef[];
  notionIds: string[];
};

/** All sessions ordered by number (for the roadmap). */
export function listSessions(db: Db) {
  return db.select().from(sessions).orderBy(asc(sessions.n)).all();
}

/** All notions (for roadmap/dashboard labels). */
export function listNotions(db: Db) {
  return db.select().from(notions).orderBy(asc(notions.session)).all();
}

/** All reperes (for review cards and session plans). */
export function listReperes(db: Db) {
  return db.select().from(reperes).all();
}

/** The rubric in canonical order. */
export function listRubric(db: Db): RubricRef[] {
  return db
    .select()
    .from(rubricEntries)
    .orderBy(asc(rubricEntries.position))
    .all();
}

/** Full plan data for one session; null when the session doesn't exist. */
export function getSessionPlan(db: Db, n: number): SessionPlanData | null {
  const session = db.select().from(sessions).where(eq(sessions.n, n)).get();
  if (!session) {
    return null;
  }
  const sessionTheses = db
    .select()
    .from(theses)
    .where(eq(theses.sessionN, n))
    .orderBy(asc(theses.position))
    .all();
  const sessionReperes = db
    .select()
    .from(reperes)
    .all()
    .filter((r) => r.sessions.includes(n));
  return {
    session,
    theses: sessionTheses,
    reperes: sessionReperes,
    rubric: listRubric(db),
    notionIds: session.notionIds,
  };
}

/** Resolve a thesis by canon id — the display-time guardrail lookup. */
export function getThesis(db: Db, id: string): ThesisRef | null {
  return db.select().from(theses).where(eq(theses.id, id)).get() ?? null;
}
