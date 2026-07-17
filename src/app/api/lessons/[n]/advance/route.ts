/**
 * POST /api/lessons/[n]/advance — learner-initiated step advance.
 * Same server-side judgment as the tutor's advance_step tool: the step
 * moves only when the current step holds at least one substantive learner
 * production. 409 with a reason otherwise.
 */
import { getDb } from "@/db/client";
import { getSessionPlan } from "@/server/canon";
import { getActiveRun, tryAdvance } from "@/server/lesson";

export async function POST(
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
  const run = getActiveRun(db, sessionN);
  if (!run) {
    return Response.json({ error: "no active lesson run" }, { status: 404 });
  }
  const outcome = tryAdvance(db, run);
  if (!outcome.advanced && !outcome.completed) {
    return Response.json(
      {
        error: "no_production",
        message:
          "このステップでのあなたの産出がまだありません。1文以上、考えを書いてから進んでください。",
        step: outcome.step,
      },
      { status: 409 }
    );
  }
  return Response.json(outcome);
}
