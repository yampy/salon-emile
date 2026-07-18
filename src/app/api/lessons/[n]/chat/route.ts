/**
 * /api/lessons/[n]/chat — the lesson dialogue.
 *
 * POST streams one tutor exchange. The chat is per-step: only the current
 * step's messages are shown and sent as history (earlier steps' substantive
 * productions ride along in the system context), so every step starts
 * clean. DELETE resets the current step's dialogue entirely — including its
 * productions, so the advance gate starts over too.
 */
import { z } from "zod";
import { getDb } from "@/db/client";
import { getModelSetting } from "@/db/settings";
import { getLlmClient } from "@/llm";
import { buildTutorSystem } from "@/llm/prompts/tutor";
import type { ChatMessage } from "@/llm/types";
import { getSessionPlan } from "@/server/canon";
import {
  deleteStepMessages,
  getActiveRun,
  getOrCreateActiveRun,
  listPriorProductions,
  listStepMessages,
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

/** Unpersisted opener used when the learner starts a step's dialogue. */
const START_PROMPT =
  "(システム: 学習者がこのステップの対話を開始しました。ステップの狙いに沿って対話を始めてください。)";

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

  // Per-step clean chat: only the current step's dialogue is history.
  const history: ChatMessage[] = listStepMessages(db, run.id, run.step).map(
    (m) => ({ role: m.role, content: m.content })
  );
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
      priorProductions: listPriorProductions(db, run.id, run.step),
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

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ n: string }> }
): Promise<Response> {
  const { n: rawN } = await context.params;
  const sessionN = Number(rawN);
  const db = getDb();
  const run = Number.isInteger(sessionN) ? getActiveRun(db, sessionN) : null;
  if (!run) {
    return Response.json({ error: "no active lesson run" }, { status: 404 });
  }
  const deleted = deleteStepMessages(db, run.id, run.step);
  return Response.json({ deleted, step: run.step });
}
