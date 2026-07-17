/**
 * The 31 repères as a constellation: each star sits at a deterministic
 * position (by canon order and id hash), filled once its review card has
 * been answered at least once. Identity is carried by the label/tooltip,
 * never by color alone.
 */

type RepereRow = { id: string; fr: string; ja: string; sessions: number[] };

const WIDTH = 640;
const HEIGHT = 180;
const PADDING = 24;

function hash(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0) / 0xffffffff;
}

type Props = {
  reperes: RepereRow[];
  reviewedIds: Set<string>;
};

export function RepereConstellation({ reperes, reviewedIds }: Props) {
  const ordered = [...reperes].sort(
    (a, b) => Math.min(...a.sessions) - Math.min(...b.sessions) || a.id.localeCompare(b.id)
  );
  const stars = ordered.map((repere, i) => {
    const x =
      PADDING + ((WIDTH - 2 * PADDING) * i) / Math.max(1, ordered.length - 1);
    const y = PADDING + (HEIGHT - 2 * PADDING) * hash(repere.id);
    return { repere, x, y, reviewed: reviewedIds.has(repere.id) };
  });

  return (
    <figure data-testid="repere-constellation">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label="31のrepères(概念対)の星座"
        className="w-full rounded-md border border-border bg-card"
      >
        {stars.slice(1).map((star, i) => (
          <line
            key={star.repere.id}
            x1={stars[i].x}
            y1={stars[i].y}
            x2={star.x}
            y2={star.y}
            stroke="var(--border)"
            strokeWidth="0.75"
          />
        ))}
        {stars.map(({ repere, x, y, reviewed }) => (
          <g key={repere.id} data-reviewed={reviewed}>
            <path
              d={`M ${x} ${y - 5} L ${x + 3.5} ${y} L ${x} ${y + 5} L ${x - 3.5} ${y} Z`}
              fill={reviewed ? "var(--primary)" : "var(--card)"}
              stroke={reviewed ? "var(--primary)" : "var(--muted-foreground)"}
              strokeWidth="1"
            >
              <title>{`${repere.fr} — ${repere.ja}${reviewed ? "(復習済み)" : ""}`}</title>
            </path>
          </g>
        ))}
      </svg>
      <figcaption className="mt-1 text-xs text-muted-foreground">
        repères星座 — 復習済みの対は群青で灯ります({reviewedIds.size} / {reperes.length})
      </figcaption>
    </figure>
  );
}
