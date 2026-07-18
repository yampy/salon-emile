/**
 * Structural types for the canon data injected into prompts, plus shared
 * rendering helpers. All teaching content flows in from the DB (seeded from
 * curriculum.json) — prompt modules only add instructional framing.
 */
import type { RubricCriterion } from "@/domain/curriculum.schema";

export type SessionPlan = {
  n: number;
  title: string;
  fr: string;
  phase: string;
  goal: string;
  intro: string;
  notes: string;
  questions: string[];
  core: string | null;
  method: string | null;
  exercise: string | null;
  reperesNote: string | null;
  bridge: string | null;
};

export type ThesisRef = {
  id: string;
  philosopher: string;
  claim: string;
};

export type RepereRef = {
  id: string;
  fr: string;
  ja: string;
};

export type RubricRef = {
  id: RubricCriterion;
  name: string;
  focus: string;
};

/** Render the per-session teaching plan (cacheable system block). */
export function renderSessionPlan(
  session: SessionPlan,
  theses: ThesisRef[],
  reperes: RepereRef[]
): string {
  const lines: string[] = [
    `# 第${session.n}回 ${session.title}(${session.fr})`,
    `フェーズ: ${session.phase}`,
    `到達目標: ${session.goal}`,
    `導入: ${session.intro}`,
  ];
  if (session.core) lines.push(`核心: ${session.core}`);
  if (session.method) lines.push(`方法: ${session.method}`);
  if (session.exercise) lines.push(`演習: ${session.exercise}`);
  if (session.reperesNote) lines.push(`repères解説: ${session.reperesNote}`);
  if (reperes.length > 0) {
    lines.push(
      "本回のrepères(概念対): " +
        reperes.map((r) => `${r.fr}=${r.ja} [${r.id}]`).join(" / ")
    );
  }
  if (theses.length > 0) {
    lines.push("正典テーゼ(必ずIDで参照する):");
    for (const t of theses) {
      lines.push(`- [${t.id}] ${t.philosopher}: ${t.claim}`);
    }
  }
  if (session.questions.length > 0) {
    lines.push("本回の問い: " + session.questions.join(" / "));
  }
  lines.push(`指導ノート: ${session.notes}`);
  if (session.bridge) lines.push(`次回への橋渡し: ${session.bridge}`);
  return lines.join("\n");
}

