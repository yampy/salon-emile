/**
 * POST /api/readings — the session's 読み物 (friendly study text).
 * Generated once from the canon (tutor model slot), then served from cache.
 */
import { z } from "zod";
import { getDb } from "@/db/client";
import { getSessionPlan } from "@/server/canon";
import { getOrCreateReading } from "@/server/reading";

const BodySchema = z.object({
  sessionN: z.number().int().min(0),
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
  const result = await getOrCreateReading(db, plan);
  return Response.json(result);
}
