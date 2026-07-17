/**
 * GET /api/lessons/[n] — current lesson state (run step/status + dialogue),
 * consumed by the lesson client after each streamed exchange.
 */
import { getDb } from "@/db/client";
import { getSessionPlan } from "@/server/canon";
import { getLatestRun, listRunMessages } from "@/server/lesson";

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

  return Response.json({
    session: { n: plan.session.n, title: plan.session.title, fr: plan.session.fr },
    run: run
      ? {
          id: run.id,
          step: run.step,
          status: run.status,
          messages: listRunMessages(db, run.id).map((m) => ({
            role: m.role,
            step: m.step,
            content: m.content,
          })),
        }
      : null,
  });
}
