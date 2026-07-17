/**
 * Five-criterion mastery radar (single series, single ultramarine hue).
 * Values are also written next to each axis label so identity and magnitude
 * never rely on color alone.
 */
import type { RubricCriterion } from "@/domain/curriculum.schema";
import type { RubricRef } from "@/llm/prompts/context";

const SIZE = 320;
const CENTER = SIZE / 2;
const RADIUS = 110;
const RINGS = [0.25, 0.5, 0.75, 1];

type Props = {
  rubric: RubricRef[];
  values: Record<RubricCriterion, number | null>;
};

function polar(angle: number, radius: number): [number, number] {
  return [
    CENTER + radius * Math.cos(angle - Math.PI / 2),
    CENTER + radius * Math.sin(angle - Math.PI / 2),
  ];
}

export function MasteryRadar({ rubric, values }: Props) {
  const n = rubric.length;
  const angles = rubric.map((_, i) => (i * 2 * Math.PI) / n);
  const points = rubric
    .map((r, i) => {
      const v = values[r.id] ?? 0;
      const [x, y] = polar(angles[i], v * RADIUS);
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");

  return (
    <figure data-testid="mastery-radar">
      <svg
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        role="img"
        aria-label="5観点の習熟度レーダー"
        className="mx-auto w-full max-w-xs"
      >
        {RINGS.map((ring) => (
          <polygon
            key={ring}
            points={angles
              .map((a) => polar(a, ring * RADIUS).map((v) => v.toFixed(1)).join(","))
              .join(" ")}
            fill="none"
            stroke="var(--border)"
            strokeWidth="1"
          />
        ))}
        {angles.map((a, i) => {
          const [x, y] = polar(a, RADIUS);
          return (
            <line
              key={i}
              x1={CENTER}
              y1={CENTER}
              x2={x}
              y2={y}
              stroke="var(--border)"
              strokeWidth="1"
            />
          );
        })}
        <polygon
          points={points}
          fill="var(--primary)"
          fillOpacity="0.18"
          stroke="var(--primary)"
          strokeWidth="2"
          strokeLinejoin="round"
        />
        {rubric.map((r, i) => {
          const v = values[r.id];
          const [dx, dy] = polar(angles[i], (v ?? 0) * RADIUS);
          const [lx, ly] = polar(angles[i], RADIUS + 24);
          return (
            <g key={r.id}>
              {v !== null && (
                <circle cx={dx} cy={dy} r="4" fill="var(--primary)">
                  <title>{`${r.name}: ${(v * 100).toFixed(0)}%`}</title>
                </circle>
              )}
              <text
                x={lx}
                y={ly}
                textAnchor="middle"
                fontSize="11"
                fill="var(--foreground)"
              >
                {r.name}
              </text>
              <text
                x={lx}
                y={ly + 13}
                textAnchor="middle"
                fontSize="10"
                fill="var(--muted-foreground)"
              >
                {v === null ? "—" : `${(v * 100).toFixed(0)}%`}
              </text>
            </g>
          );
        })}
      </svg>
      <figcaption className="mt-1 text-center text-xs text-muted-foreground">
        観点別の習熟度(EMA・0〜100%)
      </figcaption>
    </figure>
  );
}
