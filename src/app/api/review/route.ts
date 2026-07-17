/**
 * GET  /api/review — the current round of due cards.
 * POST /api/review — grade one card answer and reschedule via ts-fsrs.
 */
import { z } from "zod";
import { getDb } from "@/db/client";
import { answerCard, countDueCards, listDueCards } from "@/server/review";

export async function GET(): Promise<Response> {
  const db = getDb();
  const now = new Date();
  return Response.json({
    dueCount: countDueCards(db, now),
    cards: listDueCards(db, now),
  });
}

const BodySchema = z.object({
  cardId: z.string().min(1),
  answer: z.string().trim().min(1),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const db = getDb();
  const outcome = await answerCard(db, parsed.data.cardId, parsed.data.answer);
  if (!outcome) {
    return Response.json({ error: "card not found or not due" }, { status: 404 });
  }
  return Response.json(outcome);
}
