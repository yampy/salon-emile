/**
 * Plain progress bars for the roadmap: lessons completed, repères and
 * theses reviewed at least once. Numbers first, decoration second.
 */
import { Progress } from "@/components/ui/progress";

export type ProgressItem = {
  label: string;
  done: number;
  total: number;
};

export function ProgressOverview({ items }: { items: ProgressItem[] }) {
  return (
    <section
      className="grid gap-4 rounded-md border border-border bg-card p-4 sm:grid-cols-3"
      data-testid="progress-overview"
      aria-label="学習の進捗"
    >
      {items.map((item) => {
        const pct = item.total === 0 ? 0 : (item.done / item.total) * 100;
        return (
          <div key={item.label} className="flex flex-col gap-1.5">
            <div className="flex items-baseline justify-between text-sm">
              <span>{item.label}</span>
              <span className="font-semibold text-primary">
                {item.done}
                <span className="font-normal text-muted-foreground">
                  {" "}
                  / {item.total}
                </span>
              </span>
            </div>
            <Progress value={pct} aria-label={`${item.label} ${item.done}/${item.total}`} />
          </div>
        );
      })}
    </section>
  );
}
