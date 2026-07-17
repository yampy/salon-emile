/**
 * POST /api/lessons/[n]/chat — one tutor exchange.
 *
 * Streams the tutor's reply as plain text. After the stream completes the
 * assistant message is persisted, usage recorded, and — if the tutor
 * requested `advance_step` — the server judges the transition (the client
 * refetches lesson state afterwards).
 */
import { z } from "zod";
import { getDb } from "@/db/client";
import { getModelSetting } from "@/db/settings";
import { getLlmClient } from "@/llm";
import { buildTutorSystem } from "@/llm/prompts/tutor";
import type { ChatMessage } from "@/llm/types";
import { getSessionPlan } from "@/server/canon";
import {
  getOrCreateActiveRun,
  listRunMessages,
  recordMessage,
  tryAdvance,
} from "@/server/lesson";
import { recordUsage } from "@/server/usage";

const BodySchema = z
  .object({
    message: z.string().trim().min(1).optional(),
    start: z.boolean().optional(),
  })
  .refine((body) => body.start === true || body.message !== undefined, {
    message: "either message or start is required",
  });

/** Unpersisted opener used when the learner starts a lesson. */
const START_PROMPT =
  "(システム: 学習者がレッスンを開始しました。導入の問いから対話を始めてください。)";

export async function POST(
  request: Request,
  context: { params: Promise<{ n: string }> }
): Promise<Response> {
  const { n: rawN } = await context.params;
  const sessionN = Number(rawN);
  const db = getDb();
  const plan = Number.isInteger(sessionN) ? getSessionPlan(db, sessionN) : null;
  if (!plan) {
    return Response.json({ error: "unknown session" }, { status: 404 });
  }

  const parsed = BodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return Response.json({ error: "invalid body" }, { status: 400 });
  }
  const { message, start } = parsed.data;

  const run = getOrCreateActiveRun(db, sessionN);
  if (run.status !== "active") {
    return Response.json({ error: "lesson already completed" }, { status: 409 });
  }
  if (message !== undefined) {
    recordMessage(db, run.id, "user", run.step, message);
  }

  const history: ChatMessage[] = listRunMessages(db, run.id).map((m) => ({
    role: m.role,
    content: m.content,
  }));
  if (history.length === 0 && start) {
    history.push({ role: "user", content: START_PROMPT });
  }

  const model = getModelSetting(db, "tutorModel");
  const chat = await getLlmClient().chatStream({
    model,
    system: buildTutorSystem({
      session: plan.session,
      theses: plan.theses,
      reperes: plan.reperes,
      step: run.step,
    }),
    messages: history,
    // An opener alone can never advance the lesson.
    allowAdvance: message !== undefined,
  });

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const chunk of chat.textStream) {
          controller.enqueue(encoder.encode(chunk));
        }
        const final = await chat.final();
        recordMessage(db, run.id, "assistant", run.step, final.text);
        recordUsage(db, "tutor", model, final.usage);
        if (final.advanceRequested) {
          tryAdvance(db, run);
        }
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
