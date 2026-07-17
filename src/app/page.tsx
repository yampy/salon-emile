/**
 * Roadmap screen — the 17-session journey in three parts, with completion
 * marks and the soft recommendation gate (nothing is ever locked).
 */
import Link from "next/link";
import { getDb } from "@/db/client";
import { listSessions } from "@/server/canon";
import { listCompletedRuns } from "@/server/lesson";

export const dynamic = "force-dynamic";

export default async function RoadmapPage() {
  const db = getDb();
  const sessions = listSessions(db);
  const completed = new Set(listCompletedRuns(db).map((r) => r.sessionN));

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
          全17回。どの回もいつでも開けます — 完了した回には印がつきます。
        </p>
      </div>

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
                    {completed.has(session.n) && (
                      <span className="text-xs text-primary">完了</span>
                    )}
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
