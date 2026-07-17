/**
 * Structural types for the canon data injected into prompts, plus shared
 * rendering helpers. All teaching content flows in from the DB (seeded from
 * curriculum.json) — prompt modules only add instructional framing.
 */
import type { LessonStep } from "@/domain/lesson";

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
  id: string;
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

/** Human-readable step guidance for the tutor (volatile system block). */
export const STEP_GUIDANCE: Record<LessonStep, string> = {
  intuition:
    "導入の問いを提示し、学習者から対立する直観を引き出す。学習者が最初の直観を言語化するまで先へ進まない。",
  definition_reperes:
    "本回の核心概念とrepèresを、学習者の直観に接続しながら定義させる。定義文は学習者自身に書かせる。",
  theses:
    "正典テーゼを1つずつ検討させる。テーゼは必ずID付きで提示し、学習者に賛否と理由を言語化させる。",
  question:
    "本回の問いをproblématique(対立する直観の緊張)として定式化させる。",
  essay: "ミニ論述(thèse→antithèse→dépassement)を書かせる。書き終えるまで採点や模範例を示さない。",
  bridge:
    "本回の学びを要約させ、次回への橋渡しを予告する。学習者自身の言葉での要約を促す。",
};
