/**
 * POST /api/reveal — the "答えを見る" guardrail. Records the reveal event,
 * returns canon material only, plus a mandatory isomorphic variant question.
 */
import { z } from "zod";
import { getDb } from "@/db/client";
import { EXERCISE_KINDS } from "@/domain/exercise";
import {
  requireSessionPlan,
  revealAnswer,
  SessionNotFoundError,
} from "@/server/grading";

const BodySchema = z.object({
  sessionN: z.number().int().min(0),
  exerciseKind: z.enum(EXERCISE_KINDS).optional(),
  question: z.string().trim().min(1),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const db = getDb();
  try {
    const plan = requireSessionPlan(db, parsed.data.sessionN);
    const result = await revealAnswer(db, plan, parsed.data);
    return Response.json(result);
  } catch (error) {
    if (error instanceof SessionNotFoundError) {
      return Response.json({ error: "unknown session" }, { status: 404 });
    }
    throw error;
  }
}
