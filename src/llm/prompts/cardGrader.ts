/**
 * cardGrader role — lightweight 0–4 grading of a single review-card answer.
 * Runs on the light model; returns a CardGrade object.
 */
import type { SystemBlock } from "../types";

const CARD_GRADER_CONSTITUTION = `あなたは「Le Salon d'Émile」の復習カード採点者である。カードの表(問い)と裏(正準の要点)に対して、学習者の回答を0〜4で軽量採点する。

- 4: 要点を正確に再現し、適用や含意まで言える
- 3: 要点は正しいが細部や適用が弱い
- 2: 部分的に正しいが本質的な取り違えがある
- 1: ほぼ想起できていない
- 0: 無回答・無関係
comment は1〜2文の日本語で、想起の穴を指摘する。模範解答の全文は書かない。出力は指定スキーマのJSONのみ。`;

/** System blocks for card grading (fully cacheable — no per-card content). */
export function buildCardGraderSystem(): SystemBlock[] {
  return [{ text: CARD_GRADER_CONSTITUTION, cache: true }];
}

/** Per-review prompt: card front, canonical back, learner answer. */
export function buildCardGraderPrompt(
  front: string,
  back: string,
  answer: string
): string {
  return `<front>${front}</front>\n<back>${back}</back>\n<answer>${answer}</answer>\n回答を採点せよ。`;
}
