/**
 * Lesson screen — Socratic dialogue for one session of the curriculum.
 */
import Link from "next/link";
import { notFound } from "next/navigation";
import { LessonChat, type ChatDisplayMessage } from "@/components/lesson-chat";
import { getDb } from "@/db/client";
import type { LessonStep } from "@/domain/lesson";
import { getSessionPlan } from "@/server/canon";
import { getLatestRun, listRunMessages } from "@/server/lesson";

export const dynamic = "force-dynamic";

export default async function LessonPage({
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

  const run = getLatestRun(db, sessionN);
  const messages: ChatDisplayMessage[] = run
    ? listRunMessages(db, run.id).map((m) => ({
        role: m.role,
        content: m.content,
      }))
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">
          <Link href="/" className="hover:text-primary">
            ロードマップ
          </Link>
          {" / "}
          {plan.session.phase}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          第{plan.session.n}回 {plan.session.title}
        </h1>
        <p className="italic text-muted-foreground">{plan.session.fr}</p>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">
          {plan.session.goal}
        </p>
      </div>

      <LessonChat
        sessionN={sessionN}
        initialStep={(run?.step ?? "intuition") as LessonStep}
        initialStatus={(run?.status ?? "active") as "active" | "completed"}
        initialMessages={messages}
      />
    </div>
  );
}
