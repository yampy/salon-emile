/**
 * Global Q&A (質問) — the advisor chat that spans the whole curriculum.
 * Builds a compact canon digest for the LLM, persists the single global
 * conversation thread, and streams answers that point to relevant sessions.
 */
import { asc } from "drizzle-orm";
import type { Db } from "@/db/client";
import { advisorMessages } from "@/db/schema";
import { getModelSetting } from "@/db/settings";
import { getLlmClient } from "@/llm";
import { buildAdvisorSystem } from "@/llm/prompts/advisor";
import type { ChatMessage, ChatStream } from "@/llm/types";
import { listReperes, listSessions } from "@/server/canon";
import { theses } from "@/db/schema";

/** Messages sent to the model per exchange (older history is dropped). */
const HISTORY_WINDOW = 20;

export type AdvisorMessage = typeof advisorMessages.$inferSelect;

/**
 * Compact rendering of the whole canon for the advisor's context:
 * every session (goal + questions), every repère, every thesis with id.
 */
export function buildCanonDigest(db: Db): string {
  const sessions = listSessions(db);
  const reperes = listReperes(db);
  const allTheses = db.select().from(theses).orderBy(asc(theses.id)).all();

  const lines: string[] = ["# 全17回の概要"];
  for (const s of sessions) {
    lines.push(
      `第${s.n}回「${s.title}」(${s.fr} / ${s.phase}) — ${s.goal}` +
        (s.questions.length > 0 ? ` 問い: ${s.questions.join(" / ")}` : "")
    );
  }
  lines.push("", "# repères(概念対・全31)");
  lines.push(
    reperes
      .map((r) => `${r.fr}=${r.ja} [${r.id}] (第${r.sessions.join("・")}回)`)
      .join(" / ")
  );
  lines.push("", "# 正典テーゼ(全64・IDで引用する)");
  for (const t of allTheses) {
    lines.push(`[${t.id}] ${t.philosopher}(第${t.sessionN}回): ${t.claim}`);
  }
  return lines.join("\n");
}

/** Full stored conversation, oldest first. */
export function listAdvisorMessages(db: Db): AdvisorMessage[] {
  return db.select().from(advisorMessages).orderBy(asc(advisorMessages.id)).all();
}

/** Persist one message of the global thread. */
export function recordAdvisorMessage(
  db: Db,
  role: "user" | "assistant",
  content: string
): AdvisorMessage {
  return db
    .insert(advisorMessages)
    .values({ role, content })
    .returning()
    .get();
}

/** Delete the whole thread (the「最初から」button). */
export function clearAdvisorMessages(db: Db): void {
  db.delete(advisorMessages).run();
}

/**
 * One advisor exchange: record the question, stream the answer over the
 * recent history window with the full canon digest in context.
 */
export async function advisorChat(db: Db, question: string): Promise<ChatStream> {
  recordAdvisorMessage(db, "user", question);
  const history: ChatMessage[] = listAdvisorMessages(db)
    .slice(-HISTORY_WINDOW)
    .map((m) => ({ role: m.role, content: m.content }));

  return getLlmClient().chatStream({
    model: getModelSetting(db, "tutorModel"),
    system: buildAdvisorSystem(buildCanonDigest(db)),
    messages: history,
  });
}
