/**
 * GET /api/lessons/[n] — current lesson state, consumed by the lesson
 * client after each exchange. Active runs return only the current step's
 * dialogue (each step starts clean); completed runs return the full
 * transcript.
 */
import { getDb } from "@/db/client";
import { getSessionPlan } from "@/server/canon";
import {
  getLatestRun,
  listRunMessages,
  listStepMessages,
} from "@/server/lesson";

export async function GET(
  _request: Request,
  context: { params: Promise<{ n: string }> }
): Promise<Response> {
  const { n: rawN } = await context.params;
  const sessionN = Number(rawN);
  const db = getDb();
  const plan = Number.isInteger(sessionN) ? getSessionPlan(db, sessionN) : null;
  if (!plan) {
    return Response.json({ error: "unknown session" }, { status: 404 });
  }

  const run = getLatestRun(db, sessionN);
  const messages = run
    ? run.status === "active"
      ? listStepMessages(db, run.id, run.step)
      : listRunMessages(db, run.id)
    : [];

  return Response.json({
    session: { n: plan.session.n, title: plan.session.title, fr: plan.session.fr },
    run: run
      ? {
          id: run.id,
          step: run.step,
          status: run.status,
          messages: messages.map((m) => ({
            role: m.role,
            step: m.step,
            content: m.content,
          })),
        }
      : null,
  });
}
