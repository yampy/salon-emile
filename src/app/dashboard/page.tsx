/**
 * Dashboard screen — five-criterion radar, notion × criterion heatmap,
 * reveal rate and review progress.
 */
import { MasteryHeatmap } from "@/components/mastery-heatmap";
import { MasteryRadar } from "@/components/mastery-radar";
import { getDb } from "@/db/client";
import { listNotions, listRubric } from "@/server/canon";
import { revealStats } from "@/server/grading";
import { listMastery, masteryByCriterion } from "@/server/mastery";
import { reviewedCardStats } from "@/server/review";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const db = getDb();
  const rubric = listRubric(db);
  const notions = listNotions(db);
  const radar = masteryByCriterion(db);
  const masteryValues = new Map(
    listMastery(db).map((row) => [`${row.notionId}:${row.criterion}`, row.value])
  );
  const reveal = revealStats(db);
  const cards = reviewedCardStats(db);

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">ダッシュボード</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          採点結果から更新される習熟度(EMA)と、学習の習慣を映します。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div
          className="rounded-md border border-border bg-card px-4 py-3"
          data-testid="reveal-rate"
        >
          <p className="text-xs text-muted-foreground">答えを見た率</p>
          <p className="mt-1 text-2xl font-semibold text-primary">
            {reveal.rate === null ? "—" : `${(reveal.rate * 100).toFixed(0)}%`}
          </p>
          <p className="text-xs text-muted-foreground">
            {reveal.reveals} 回 / 全 {reveal.reveals + reveal.answered} 試行
          </p>
        </div>
        <div className="rounded-md border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">復習済みカード</p>
          <p className="mt-1 text-2xl font-semibold text-primary">
            {cards.reviewed}
            <span className="text-sm text-muted-foreground"> / {cards.total}</span>
          </p>
          <p className="text-xs text-muted-foreground">repère・テーゼ・変形問題</p>
        </div>
        <div className="rounded-md border border-border bg-card px-4 py-3">
          <p className="text-xs text-muted-foreground">計測済みの概念×観点</p>
          <p className="mt-1 text-2xl font-semibold text-primary">
            {masteryValues.size}
            <span className="text-sm text-muted-foreground">
              {" "}
              / {notions.length * rubric.length}
            </span>
          </p>
          <p className="text-xs text-muted-foreground">論述の採点で増えます</p>
        </div>
      </div>

      <section className="grid gap-6 lg:grid-cols-[minmax(0,20rem)_1fr]">
        <div className="rounded-md border border-border bg-card p-4">
          <h2 className="mb-2 text-lg">5観点レーダー</h2>
          <MasteryRadar rubric={rubric} values={radar} />
        </div>
        <div className="rounded-md border border-border bg-card p-4">
          <h2 className="mb-2 text-lg">概念 × 観点ヒートマップ</h2>
          <MasteryHeatmap notions={notions} rubric={rubric} values={masteryValues} />
        </div>
      </section>
    </div>
  );
}
