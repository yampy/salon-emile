/**
 * POST /api/model-answers — textbook model answer for a canonical question
 * of a session. Generated once (grader model slot), then served from cache.
 * Only canonical questions are accepted — no free-form generation surface.
 */
import { z } from "zod";
import { getDb } from "@/db/client";
import { getSessionPlan } from "@/server/canon";
import { getOrCreateModelAnswer } from "@/server/model-answer";

const BodySchema = z.object({
  sessionN: z.number().int().min(0),
  question: z.string().trim().min(1),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const db = getDb();
  const plan = getSessionPlan(db, parsed.data.sessionN);
  if (!plan) {
    return Response.json({ error: "unknown session" }, { status: 404 });
  }
  const canonQuestions = [
    ...plan.session.questions,
    ...(plan.session.exercise ? [plan.session.exercise] : []),
  ];
  if (!canonQuestions.includes(parsed.data.question)) {
    return Response.json({ error: "not a canonical question" }, { status: 422 });
  }
  const answer = await getOrCreateModelAnswer(db, plan, parsed.data.question);
  return Response.json(answer);
}
