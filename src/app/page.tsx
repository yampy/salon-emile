/**
 * Roadmap screen — the 17-session journey in three parts with plain
 * progress bars. The mastery gate is soft: reaching it only marks the next
 * session as recommended; nothing is ever locked.
 */
import Link from "next/link";
import { ProgressOverview } from "@/components/progress-overview";
import { getDb } from "@/db/client";
import { LESSON_STEPS } from "@/domain/lesson";
import { listSessions } from "@/server/canon";
import { listActiveRuns, listCompletedRuns } from "@/server/lesson";
import { isSessionMasteryReached } from "@/server/mastery";
import { reviewedCountsByKind } from "@/server/review";

export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  const db = getDb();
  const sessions = listSessions(db);
  const completed = new Set(listCompletedRuns(db).map((r) => r.sessionN));
  const cardProgress = reviewedCountsByKind(db);
  const inProgress = new Map(
    listActiveRuns(db)
      .filter((r) => !completed.has(r.sessionN))
      .map((r) => [r.sessionN, LESSON_STEPS.indexOf(r.step) + 1])
  );

  // Soft gate: session n recommends n+1 when its mastery average clears the
  // threshold (session 0 has no notions — completing it recommends session 1).
  const recommended = new Set<number>();
  for (const session of sessions) {
    const gateReached =
      session.n === 0
        ? completed.has(0)
        : isSessionMasteryReached(db, session.n);
    if (gateReached && sessions.some((s) => s.n === session.n + 1)) {
      recommended.add(session.n + 1);
    }
  }

  const phases = new Map<string, typeof sessions>();
  for (const session of sessions) {
    const group = phases.get(session.phase) ?? [];
    group.push(session);
    phases.set(session.phase, group);
  }

  return (
    <div className="flex flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">ロードマップ</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          全17回。どの回もいつでも開けます — 習熟度が育つと次の回に「推奨」が灯ります。
        </p>
      </div>

      <ProgressOverview
        items={[
          { label: "レッスン完了", done: completed.size, total: sessions.length },
          {
            label: "repères 復習済み",
            done: cardProgress.repere.reviewed,
            total: cardProgress.repere.total,
          },
          {
            label: "テーゼ 復習済み",
            done: cardProgress.thesis.reviewed,
            total: cardProgress.thesis.total,
          },
        ]}
      />

      {[...phases.entries()].map(([phase, group]) => (
        <section key={phase}>
          <h2 className="mb-3 border-b border-border pb-1 text-lg">{phase}</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {group.map((session) => (
              <li key={session.n}>
                <Link
                  href={`/lessons/${session.n}`}
                  data-testid={`session-node-${session.n}`}
                  className="block rounded-md border border-border bg-card px-4 py-3 transition-colors hover:border-primary"
                >
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-medium">
                      第{session.n}回 {session.title}
                    </span>
                    <span className="flex gap-2 text-xs">
                      {recommended.has(session.n) && !completed.has(session.n) && (
                        <span className="rounded-sm bg-accent px-1.5 py-0.5 text-accent-foreground">
                          推奨
                        </span>
                      )}
                      {inProgress.has(session.n) && (
                        <span
                          className="rounded-sm border border-primary/40 px-1.5 py-0.5 text-primary"
                          data-testid={`in-progress-${session.n}`}
                        >
                          対話中 {inProgress.get(session.n)}/{LESSON_STEPS.length}
                        </span>
                      )}
                      {completed.has(session.n) && (
                        <span className="text-primary">完了</span>
                      )}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs italic text-muted-foreground">
                    {session.fr}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
