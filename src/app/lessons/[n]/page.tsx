/**
 * Textbook screen — the session as a reading: every canon section laid out
 * for study first (goal, introduction, core, method, repères, theses,
 * questions with model answers), with the dialogue lesson and exercises as
 * onward paths.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { ModelAnswerToggle } from "@/components/model-answer-toggle";
import { buttonVariants } from "@/components/ui/button";
import { getDb } from "@/db/client";
import { LESSON_STEPS } from "@/domain/lesson";
import { getSessionPlan } from "@/server/canon";
import { getLatestRun } from "@/server/lesson";

export const dynamic = "force-dynamic";

function Section({
  title,
  fr,
  children,
}: {
  title: string;
  fr?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="border-t border-border pt-5">
      <h2 className="mb-2 text-lg font-semibold">
        {title}
        {fr && <span className="ml-2 text-sm font-normal italic text-muted-foreground">{fr}</span>}
      </h2>
      {children}
    </section>
  );
}

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
      </div>

      {dialogueCta}

      <div className="flex max-w-3xl flex-col gap-6" data-testid="textbook">
        <Section title="この回の到達目標">
          <p className="leading-loose">{session.goal}</p>
        </Section>

        <Section title="導入" fr="introduction">
          <p className="leading-loose">{session.intro}</p>
        </Section>

        {session.core && (
          <Section title="核心" fr="le cœur">
            <p className="leading-loose">{session.core}</p>
          </Section>
        )}

        {session.method && (
          <Section title="方法" fr="la méthode">
            <p className="leading-loose">{session.method}</p>
          </Section>
        )}

        {(session.reperesNote || plan.reperes.length > 0) && (
          <Section title="repères(概念対)">
            {session.reperesNote && (
              <p className="leading-loose">{session.reperesNote}</p>
            )}
            {plan.reperes.length > 0 && (
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
            )}
          </Section>
        )}

        {plan.theses.length > 0 && (
          <Section title="正典テーゼ" fr="les thèses">
            <ul className="flex flex-col gap-3">
              {plan.theses.map((t) => (
                <li key={t.id} className="rounded-md border border-border bg-card p-3">
                  <p className="text-sm font-semibold">
                    {t.philosopher}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      [{t.id}]
                    </span>
                  </p>
                  <p className="mt-1 text-sm leading-relaxed">{t.claim}</p>
                </li>
              ))}
            </ul>
          </Section>
        )}

        {questions.length > 0 && (
          <Section title="問い" fr="les questions">
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
          </Section>
        )}

        <Section title="学びの視点" fr="notes">
          <p className="leading-loose">{session.notes}</p>
        </Section>

        {session.bridge && (
          <Section title="次回への橋渡し" fr="le pont">
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
          </Section>
        )}
      </div>

      <div className="border-t border-border pt-5">{dialogueCta}</div>
    </article>
  );
}
