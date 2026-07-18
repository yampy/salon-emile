/**
 * The global Q&A thread (質問):
 * - POST — ask a question; streams the advisor's answer (whole-curriculum
 *   context, cites relevant sessions), then persists it.
 * - DELETE — clear the thread.
 */
import { z } from "zod";
import { getDb } from "@/db/client";
import {
  advisorChat,
  clearAdvisorMessages,
  recordAdvisorMessage,
} from "@/server/advisor";
import { getModelSetting } from "@/db/settings";
import { recordUsage } from "@/server/usage";

const BodySchema = z.object({
  message: z.string().trim().min(1),
});

export async function POST(request: Request): Promise<Response> {
  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const db = getDb();
  const chat = await advisorChat(db, parsed.data.message);

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of chat.textStream) {
          controller.enqueue(encoder.encode(chunk));
        }
        const final = await chat.final();
        recordAdvisorMessage(db, "assistant", final.text);
        recordUsage(db, "advisor", getModelSetting(db, "tutorModel"), final.usage);
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function DELETE(): Promise<Response> {
  clearAdvisorMessages(getDb());
  return Response.json({ ok: true });
}
