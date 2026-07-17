/**
 * POST /api/attempts — submit a learner production for grading.
 * Returns the five-criterion evaluation; weak attempts spawn a lapse card.
 */
import { z } from "zod";
import { getDb } from "@/db/client";
import { EXERCISE_KINDS } from "@/domain/exercise";
import {
  gradeAttempt,
  requireSessionPlan,
  SessionNotFoundError,
} from "@/server/grading";

const BodySchema = z.object({
  sessionN: z.number().int().min(0),
  kind: z.enum(["exercise", "essay", "variant"]),
  exerciseKind: z.enum(EXERCISE_KINDS).optional(),
  question: z.string().trim().min(1),
  answer: z.string().trim().min(1),
  lessonRunId: z.number().int().positive().optional(),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const db = getDb();
  try {
    const plan = requireSessionPlan(db, parsed.data.sessionN);
    const result = await gradeAttempt(db, plan, parsed.data);
    return Response.json(result);
  } catch (error) {
    if (error instanceof SessionNotFoundError) {
      return Response.json({ error: "unknown session" }, { status: 404 });
    }
    throw error;
  }
}
