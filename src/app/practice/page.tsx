/**
 * Exercise screen — six formats over the canonical questions of a session,
 * graded on the five-criterion rubric, with attempt history.
 */
import Link from "next/link";
import { ExerciseForm } from "@/components/exercise-form";
import { getDb } from "@/db/client";
import {
  buildExerciseStatement,
  EXERCISE_KINDS,
  EXERCISE_LABELS,
  isExerciseKind,
  type ExerciseKind,
} from "@/domain/exercise";
import { getSessionPlan, listSessions } from "@/server/canon";
import { listAttemptHistory } from "@/server/grading";

export const dynamic = "force-dynamic";

export default async function PracticePage({
  searchParams,
}: {
  searchParams: Promise<{ session?: string; kind?: string }>;
}) {
  const params = await searchParams;
  const db = getDb();
  const sessions = listSessions(db);

  const sessionN = Number(params.session ?? "0");
  const plan = Number.isInteger(sessionN) ? getSessionPlan(db, sessionN) : null;
  const activePlan = plan ?? getSessionPlan(db, 0)!;
  const kind: ExerciseKind =
    params.kind && isExerciseKind(params.kind) ? params.kind : "intuitions";

  const baseQuestion =
    activePlan.session.questions[0] ??
    activePlan.session.exercise ??
    activePlan.session.goal;
  const statement = buildExerciseStatement(kind, {
    question: baseQuestion,
    repere: activePlan.reperes[0],
  });

  const history = listAttemptHistory(db, activePlan.session.n, 5);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">演習</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          6つの形式で、正典の問いに取り組みます。提出すると5観点で採点されます。
        </p>
      </div>

      <form method="GET" className="flex flex-wrap items-center gap-2 text-sm">
        <label htmlFor="session-select" className="text-muted-foreground">
          回:
        </label>
        <select
          id="session-select"
          name="session"
          defaultValue={String(activePlan.session.n)}
          className="rounded-md border border-input bg-card px-2 py-1.5"
          data-testid="practice-session-select"
        >
          {sessions.map((s) => (
            <option key={s.n} value={s.n}>
              第{s.n}回 {s.title}
            </option>
          ))}
        </select>
        <input type="hidden" name="kind" value={kind} />
        <button
          type="submit"
          className="rounded-md border border-border bg-card px-3 py-1.5 transition-colors hover:border-primary"
        >
          切替
        </button>
      </form>

      <nav className="flex flex-wrap gap-2 text-sm" aria-label="演習形式">
        {EXERCISE_KINDS.map((k) => (
          <Link
            key={k}
            href={`/practice?session=${activePlan.session.n}&kind=${k}`}
            data-testid={`kind-tab-${k}`}
            className={
              k === kind
                ? "rounded-md bg-primary px-3 py-1.5 text-primary-foreground"
                : "rounded-md border border-border bg-card px-3 py-1.5 text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
            }
          >
            {EXERCISE_LABELS[k]}
          </Link>
        ))}
      </nav>

      <ExerciseForm
        key={`${activePlan.session.n}-${kind}`}
        sessionN={activePlan.session.n}
        exerciseKind={kind}
        question={statement}
        rubric={activePlan.rubric}
      />

      {history.length > 0 && (
        <section>
          <h2 className="mb-2 text-lg">この回の履歴</h2>
          <ul className="flex flex-col gap-2 text-sm" data-testid="attempt-history">
            {history.map(({ attempt, evaluation }) => (
              <li
                key={attempt.id}
                className="rounded-md border border-border bg-card px-4 py-3"
              >
                <p className="text-xs text-muted-foreground">
                  {attempt.exerciseKind
                    ? EXERCISE_LABELS[attempt.exerciseKind]
                    : attempt.kind}
                  {" ・ "}
                  {attempt.createdAt.toLocaleString("ja-JP")}
                  {evaluation && (
                    <span className="ml-2 font-semibold text-primary">
                      平均 {evaluation.averageScore.toFixed(1)} / 4
                    </span>
                  )}
                </p>
                <p className="mt-1 line-clamp-2 leading-relaxed">{attempt.answer}</p>
                {evaluation && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    {evaluation.feedback}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
