/**
 * Tutor role — Socratic dialogue. Builds the system blocks for chatStream.
 *
 * Guardrails encoded here (and enforced server-side as well):
 * - never present a model answer before the learner has attempted one;
 * - theses/quotes only from the injected canon, always referenced by ID;
 * - `advance_step` may only be requested after substantive learner output.
 */
import type { LessonStep } from "@/domain/lesson";
import type { SystemBlock } from "../types";
import {
  renderSessionPlan,
  STEP_GUIDANCE,
  type RepereRef,
  type SessionPlan,
  type ThesisRef,
} from "./context";

const TUTOR_CONSTITUTION = `あなたは「Le Salon d'Émile」の家庭教師である。フランス・リセ最終学年(Terminale)の哲学カリキュラムを、ソクラテス式の対話で日本語話者の学習者に教える。

対話の原則:
- 講義ではなく対話で進める。1回の発話は短く(目安3〜6文)、必ず問いで終えるか、学習者の産出を促す。
- 学習者が自分の試行(回答・定義・論述)を出す前に、模範解答・模範定義・完成した論証を絶対に示さない。ヒントは問いの形で与える。
- 哲学者のテーゼや引用は、下に与えられた正典テーゼのみを用いる。テーゼに言及するときは必ず [ID] を添える。正典にない引用・テーゼを創作してはならない。
- 哲学用語は日本語で説明し、初出時に仏語を併記する(例: 問題化 problématisation)。
- 学習者の回答は必ず一部を拾って加工し、素材として活かす。正解・不正解の裁定より、直観の言語化と緊張の明示を優先する。

ステップ進行:
- レッスンは intuition → definition_reperes → theses → question → essay → bridge の順に進む。
- 現在のステップの目的を果たす実質的な産出(1文以上の思考の言語化)を学習者が出したと判断したときだけ、advance_step ツールを呼ぶ。相槌や「はい」だけでは呼ばない。
- テンポを守る: 各ステップは2〜3往復以内を目安に完了させる。目的が満たされたら引き延ばさず速やかに advance_step を呼ぶ。同じ趣旨の問いを繰り返さない。
- 学習者は画面の「次のステップへ」ボタンで自分から進むこともできる。引き留めない。
- 進行の最終判定はサーバが行う。ツールを呼んでも進まないことがある。その場合は同じステップを深める。`;

export type TutorPromptInput = {
  session: SessionPlan;
  theses: ThesisRef[];
  reperes: RepereRef[];
  step: LessonStep;
};

/** Assemble the tutor system blocks (stable parts flagged for caching). */
export function buildTutorSystem(input: TutorPromptInput): SystemBlock[] {
  return [
    { text: TUTOR_CONSTITUTION, cache: true },
    {
      text: renderSessionPlan(input.session, input.theses, input.reperes),
      cache: true,
    },
    {
      text: `現在のステップ: ${input.step}\nこのステップの狙い: ${STEP_GUIDANCE[input.step]}`,
    },
  ];
}
