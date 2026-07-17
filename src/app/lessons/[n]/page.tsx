/**
 * Textbook screen — the session as a reading. The friendly generated 読み物
 * (5E structure, cached) carries the narrative; the canonical questions
 * follow with model answers; the raw canon stays available as reference.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModelAnswerToggle } from "@/components/model-answer-toggle";
import { SessionReadingView } from "@/components/session-reading";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { LESSON_STEPS } from "@/domain/lesson";
import { getSessionPlan } from "@/server/canon";
import { getLatestRun } from "@/server/lesson";

export const dynamic = "force-dynamic";

export default async function TextbookPage({
  params,
}: {
  params: Promise<{ n: string }>;
}) {
  const { n: rawN } = await params;
  const sessionN = Number(rawN);
  const db = getDb();
  const plan = Number.isInteger(sessionN) ? getSessionPlan(db, sessionN) : null;
  if (!plan) {
    notFound();
  }
  const { session } = plan;
  const run = getLatestRun(db, sessionN);
  const stepIndex = run ? LESSON_STEPS.indexOf(run.step) + 1 : 0;
  const hasNext = getSessionPlan(db, sessionN + 1) !== null;

  const questions =
    session.questions.length > 0
      ? session.questions
      : session.exercise
        ? [session.exercise]
        : [];

  const dialogueCta = (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href={`/lessons/${sessionN}/dialogue`}
        className={buttonVariants()}
        data-testid="to-dialogue"
      >
        {run
          ? run.status === "completed"
            ? "対話の記録を見る"
            : `対話レッスンを続ける(${stepIndex}/${LESSON_STEPS.length})`
          : "対話レッスンをはじめる"}
      </Link>
      <Link
        href={`/practice?session=${sessionN}&kind=mini_essay`}
        className={buttonVariants({ variant: "outline" })}
      >
        演習で試す
      </Link>
      {run?.status === "completed" && (
        <span className="text-sm text-primary">この回の対話は完了しています</span>
      )}
    </div>
  );

  return (
    <article className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            ロードマップ
          </Link>
          {" / "}
          {session.phase}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          第{session.n}回 {session.title}
        </h1>
        <p className="italic text-muted-foreground">{session.fr}</p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-muted-foreground">
          {session.goal}
        </p>
      </div>

      {dialogueCta}

      <div className="max-w-3xl" data-testid="textbook">
        <SessionReadingView sessionN={sessionN} theses={plan.theses} />

        {plan.reperes.length > 0 && (
          <section className="mt-8 border-t border-border pt-5">
            <h2 className="mb-2 text-lg font-semibold">
              repères(概念対)
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                この回で使う道具
              </span>
            </h2>
            {session.reperesNote && (
              <p className="text-sm leading-loose">{session.reperesNote}</p>
            )}
            <ul className="mt-2 flex flex-wrap gap-2 text-sm">
              {plan.reperes.map((r) => (
                <li
                  key={r.id}
                  className="rounded-sm border border-border bg-card px-2 py-1"
                >
                  <span className="italic">{r.fr}</span>
                  <span className="text-muted-foreground"> — {r.ja}</span>
                </li>
              ))}
            </ul>
          </section>
        )}

        {questions.length > 0 && (
          <section className="mt-8 border-t border-border pt-5">
            <h2 className="mb-2 text-lg font-semibold">
              問い
              <span className="ml-2 text-sm font-normal italic text-muted-foreground">
                les questions
              </span>
            </h2>
            <ol className="flex flex-col gap-4">
              {questions.map((q) => (
                <li key={q} className="rounded-md border border-border bg-card p-4">
                  <p className="leading-relaxed">{q}</p>
                  <ModelAnswerToggle sessionN={sessionN} question={q} />
                </li>
              ))}
            </ol>
            <p className="mt-2 text-xs text-muted-foreground">
              解答例は形式の手本です。まず自分で書いてから読むほうが力になります(演習では採点つきで試せます)。
            </p>
          </section>
        )}

        {session.bridge && (
          <section className="mt-8 border-t border-border pt-5">
            <h2 className="mb-2 text-lg font-semibold">次回への橋渡し</h2>
            <p className="leading-loose">{session.bridge}</p>
            {hasNext && (
              <p className="mt-2 text-sm">
                <Link
                  href={`/lessons/${sessionN + 1}`}
                  className="text-primary hover:underline"
                >
                  → 第{sessionN + 1}回の教科書へ
                </Link>
              </p>
            )}
          </section>
        )}

        <details className="mt-8 rounded-md border border-border bg-card p-4" data-testid="canon-source">
          <summary className="cursor-pointer text-sm font-semibold hover:text-primary">
            原典資料(教師用指導案・curriculum.json)を読む
          </summary>
          <div className="mt-3 flex flex-col gap-4 text-sm leading-loose">
            <div>
              <h3 className="font-semibold">到達目標</h3>
              <p>{session.goal}</p>
            </div>
            <div>
              <h3 className="font-semibold">導入</h3>
              <p>{session.intro}</p>
            </div>
            {session.core && (
              <div>
                <h3 className="font-semibold">核心</h3>
                <p>{session.core}</p>
              </div>
            )}
            {session.method && (
              <div>
                <h3 className="font-semibold">方法</h3>
                <p>{session.method}</p>
              </div>
            )}
            {session.exercise && (
              <div>
                <h3 className="font-semibold">演習(正典)</h3>
                <p>{session.exercise}</p>
              </div>
            )}
            {plan.theses.length > 0 && (
              <div>
                <h3 className="font-semibold">正典テーゼ</h3>
                <ul className="mt-1 flex flex-col gap-2">
                  {plan.theses.map((t) => (
                    <li key={t.id}>
                      <span className="text-xs text-muted-foreground">[{t.id}]</span>{" "}
                      <span className="font-medium">{t.philosopher}</span>: {t.claim}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h3 className="font-semibold">学びの視点</h3>
              <p>{session.notes}</p>
            </div>
          </div>
        </details>
      </div>

      <div className="border-t border-border pt-5">{dialogueCta}</div>
    </article>
  );
}
