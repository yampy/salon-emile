/**
 * Five-criterion evaluation display: score table, evidence quotes,
 * next moves, and missing repères/theses. Pure presentation.
 */
import type { Evaluation } from "@/domain/evaluation.schema";
import type { RubricRef } from "@/llm/prompts/context";

const MAX_SCORE = 4;

type Props = {
  evaluation: Evaluation;
  rubric: RubricRef[];
};

export function EvaluationView({ evaluation, rubric }: Props) {
  return (
    <div className="flex flex-col gap-4" data-testid="evaluation">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-border text-left text-muted-foreground">
            <th className="py-1 pr-2 font-normal">観点</th>
            <th className="py-1 pr-2 font-normal">得点</th>
            <th className="py-1 font-normal">焦点</th>
          </tr>
        </thead>
        <tbody>
          {rubric.map((r) => {
            const score = evaluation.scores[r.id];
            return (
              <tr
                key={r.id}
                className="border-b border-border/60"
                data-testid={`score-${r.id}`}
                data-score={score}
              >
                <td className="py-1.5 pr-2 whitespace-nowrap">
                  {r.name}
                  <span className="ml-1 text-xs text-muted-foreground">
                    {r.id}
                  </span>
                </td>
                <td className="py-1.5 pr-2 font-semibold text-primary">
                  {score} / {MAX_SCORE}
                </td>
                <td className="py-1.5 text-xs text-muted-foreground">
                  {r.focus}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {evaluation.evidence.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold">根拠</h3>
          <ul className="mt-1 flex flex-col gap-1 text-sm">
            {evaluation.evidence.map((e, i) => (
              <li key={i}>
                <blockquote className="border-l-2 border-primary/50 pl-2 italic">
                  「{e.quote}」
                </blockquote>
                <p className="text-xs text-muted-foreground">
                  {e.criterion} — {e.comment}
                </p>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <h3 className="text-sm font-semibold">次の一手</h3>
        <p className="mt-1 text-sm leading-relaxed" data-testid="feedback">
          {evaluation.feedback}
        </p>
      </div>

      {(evaluation.missingReperes.length > 0 ||
        evaluation.missingTheses.length > 0) && (
        <p className="text-xs text-muted-foreground">
          未使用の素材:{" "}
          {[...evaluation.missingReperes, ...evaluation.missingTheses].join(", ")}
        </p>
      )}
    </div>
  );
}
