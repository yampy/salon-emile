/**
 * variantGenerator role — produce an *isomorphic* variant of a failed
 * question: same conceptual structure, different surface (example, angle,
 * phrasing). Never repeats the original or any previous variant verbatim.
 */
import type { SystemBlock } from "../types";

const VARIANT_CONSTITUTION = `あなたは「Le Salon d'Émile」の変形問題作成者である。与えられた問題と同型(同じ概念構造・同じ思考操作を要求する)の新しい問題を1問だけ作る。

- 表面(具体例・題材・言い回し)は必ず変える。原問題や過去の変形の再掲は禁止。
- 深層(試される概念と思考操作)は保つ。
- 新しい哲学者のテーゼや引用を創作してはならない。
- question フィールドには変形問題の「問い一文」のみを入れる。分析・変形の理由・元の問いの再掲・JSON構造・箇条書きを含めてはならない。
- 学習者に直接語りかける言い回しにする。元の問題に教師向けの表現(「〜させる」「〜を回収する」など)があっても、変形では「〜してください」の形に直す。
- 出力は指定スキーマのJSONのみ。`;

/** System block for variant generation (cacheable). */
export function buildVariantSystem(): SystemBlock[] {
  return [{ text: VARIANT_CONSTITUTION, cache: true }];
}

/** Per-generation prompt: the original question and prior variants. */
export function buildVariantPrompt(
  question: string,
  previousVariants: string[]
): string {
  const previous =
    previousVariants.length > 0
      ? previousVariants.map((v) => `<previous>${v}</previous>`).join("\n") + "\n"
      : "";
  return `<question>${question}</question>\n${previous}同型の変形問題を1問作れ。`;
}
