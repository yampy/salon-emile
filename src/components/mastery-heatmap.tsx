/**
 * Notion × criterion mastery heatmap. Sequential single-hue (ultramarine,
 * light→dark via opacity); every measured cell carries its value as text so
 * magnitude never relies on color alone. Unmeasured cells stay paper-blank.
 */
import type { RubricRef } from "@/llm/prompts/context";

type NotionRow = { id: string; ja: string; fr: string; session: number };

type Props = {
  notions: NotionRow[];
  rubric: RubricRef[];
  /** mastery value per `${notionId}:${criterion}`. */
  values: Map<string, number>;
};

export function MasteryHeatmap({ notions, rubric, values }: Props) {
  return (
    <div className="overflow-x-auto" data-testid="mastery-heatmap">
      <table className="w-full border-collapse text-xs">
        <thead>
          <tr>
            <th className="py-1 pr-2 text-left font-normal text-muted-foreground">
              概念(notion)
            </th>
            {rubric.map((r) => (
              <th
                key={r.id}
                className="px-1 py-1 text-center font-normal text-muted-foreground"
              >
                {r.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {notions.map((notion) => (
            <tr key={notion.id} className="border-t border-border/60">
              <td className="py-1 pr-2 whitespace-nowrap">
                {notion.ja}
                <span className="ml-1 italic text-muted-foreground">
                  {notion.fr}
                </span>
              </td>
              {rubric.map((r) => {
                const value = values.get(`${notion.id}:${r.id}`);
                return (
                  <td key={r.id} className="p-0.5 text-center">
                    {value === undefined ? (
                      <div
                        className="rounded-sm border border-border/50 py-1 text-muted-foreground/50"
                        title={`${notion.ja} × ${r.name}: 未計測`}
                      >
                        ・
                      </div>
                    ) : (
                      <div
                        className="rounded-sm py-1"
                        style={{
                          backgroundColor: `color-mix(in oklch, var(--primary) ${Math.round(
                            12 + value * 78
                          )}%, var(--card))`,
                          color: value > 0.55 ? "var(--primary-foreground)" : "var(--foreground)",
                        }}
                        title={`${notion.ja} × ${r.name}: ${(value * 100).toFixed(0)}%`}
                      >
                        {(value * 100).toFixed(0)}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
