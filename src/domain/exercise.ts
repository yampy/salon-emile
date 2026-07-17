/**
 * The six exercise formats. Each format wraps a canonical question (from
 * curriculum.json via the DB) in instructional framing — the teaching
 * content itself always comes from the canon.
 */

export const EXERCISE_KINDS = [
  "intuitions",
  "repere_application",
  "one_sentence",
  "problematique",
  "plan",
  "mini_essay",
] as const;

export type ExerciseKind = (typeof EXERCISE_KINDS)[number];

export const EXERCISE_LABELS: Record<ExerciseKind, string> = {
  intuitions: "二直観抽出",
  repere_application: "repère適用",
  one_sentence: "一文論述",
  problematique: "problématique構築",
  plan: "プラン設計",
  mini_essay: "ミニ論述",
};

/** True when `value` names an exercise kind. */
export function isExerciseKind(value: string): value is ExerciseKind {
  return (EXERCISE_KINDS as readonly string[]).includes(value);
}

export type ExerciseSource = {
  /** A canonical question of the session (or its exercise text). */
  question: string;
  /** A repère of the session, required by repere_application. */
  repere?: { fr: string; ja: string };
};

/**
 * Compose the learner-facing exercise statement for a format.
 * Deterministic: same inputs, same statement.
 */
export function buildExerciseStatement(
  kind: ExerciseKind,
  source: ExerciseSource
): string {
  const q = source.question;
  switch (kind) {
    case "intuitions":
      return `問い「${q}」に潜む、対立する二つの直観を、それぞれ1〜2文で書き出してください。両方に理があるように書くこと。`;
    case "repere_application":
      if (source.repere) {
        return `repère「${source.repere.fr}(${source.repere.ja})」を、問い「${q}」に適用して、その区別が問いのどこに効くかを一文で説明してください。`;
      }
      return `本回のrepèreを、問い「${q}」に適用して、その区別が問いのどこに効くかを一文で説明してください。`;
    case "one_sentence":
      return `問い「${q}」へのあなたの立場を、理由を含む一文で述べてください。`;
    case "problematique":
      return `問い「${q}」を、対立する二つの直観の緊張(problématique)として定式化してください。緊張が一文で見えるように書くこと。`;
    case "plan":
      return `問い「${q}」について、thèse → antithèse → dépassement の三部プランを、各部の見出しと一文の要旨で設計してください。`;
    case "mini_essay":
      return `問い「${q}」について、thèse → antithèse → dépassement の三段構成でミニ論述(各段2〜4文)を書いてください。`;
  }
}
