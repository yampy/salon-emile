"use client";

/**
 * The session's 読み物: fetched (and generated on first visit) from
 * /api/readings, rendered as hook → understanding steps → theses guide →
 * recap. Structure follows the 5E sequence (docs/writing-guide.md).
 */
import { useEffect, useState } from "react";
import type { SessionReading } from "@/domain/reading.schema";

type ThesisRef = { id: string; philosopher: string; claim: string };

type Props = {
  sessionN: number;
  theses: ThesisRef[];
};

export function SessionReadingView({ sessionN, theses }: Props) {
  const [reading, setReading] = useState<SessionReading | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/readings", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionN }),
        });
        if (!res.ok) throw new Error(`読み物の取得に失敗しました (${res.status})`);
        const data = (await res.json()) as { reading: SessionReading };
        if (!cancelled) setReading(data.reading);
      } catch (e) {
        if (!cancelled)
          setError(e instanceof Error ? e.message : "読み物の取得に失敗しました");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionN]);

  if (error) {
    return (
      <p role="alert" className="text-sm text-destructive">
        {error} — 下の原典資料から学習を続けられます。
      </p>
    );
  }

  if (!reading) {
    return (
      <div
        className="flex flex-col gap-2 rounded-md border border-border bg-card p-6"
        data-testid="reading-loading"
      >
        <p className="text-sm">この回の読み物を書いています…</p>
        <p className="text-xs text-muted-foreground">
          初回だけ1分ほどかかります。次からはすぐに開きます。
        </p>
      </div>
    );
  }

  const thesisById = new Map(theses.map((t) => [t.id, t]));

  return (
    <div className="flex flex-col gap-8" data-testid="reading">
      <p className="border-l-2 border-primary pl-3 text-lg font-semibold text-primary">
        {reading.catchphrase}
      </p>

      <p className="leading-loose" data-testid="reading-hook">
        {reading.hook}
      </p>

      <ol className="flex flex-col gap-6">
        {reading.steps.map((step, i) => (
          <li
            key={i}
            className="rounded-md border border-border bg-card p-5"
            data-testid="reading-step"
          >
            <h3 className="text-base font-semibold">
              <span className="mr-2 text-primary">STEP {i + 1}</span>
              {step.title}
            </h3>
            <p className="mt-2 leading-loose">{step.body}</p>
            <p className="mt-3 rounded-sm bg-accent/40 px-3 py-2 text-sm leading-relaxed text-accent-foreground">
              <span className="font-semibold">たとえば — </span>
              {step.example}
            </p>
          </li>
        ))}
      </ol>

      {reading.thesesGuide.length > 0 && (
        <section>
          <h3 className="mb-3 text-base font-semibold">
            哲学者たちはこう考えた
            <span className="ml-2 text-xs font-normal text-muted-foreground">
              正典テーゼの読み解き
            </span>
          </h3>
          <ul className="flex flex-col gap-3">
            {reading.thesesGuide.map((guide) => {
              const thesis = thesisById.get(guide.id);
              if (!thesis) return null;
              return (
                <li
                  key={guide.id}
                  className="rounded-md border border-border bg-card p-4"
                  data-testid="reading-thesis"
                >
                  <p className="text-sm font-semibold">
                    {thesis.philosopher}
                    <span className="ml-2 text-xs font-normal text-muted-foreground">
                      [{guide.id}]
                    </span>
                  </p>
                  <p className="mt-1 text-sm leading-relaxed">{guide.friendly}</p>
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-muted-foreground hover:text-primary">
                      正典の原文を読む
                    </summary>
                    <p className="mt-1 text-sm leading-relaxed">{thesis.claim}</p>
                  </details>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <div
        className="rounded-md border border-primary/30 bg-accent/30 p-4"
        data-testid="reading-recap"
      >
        <h3 className="text-sm font-semibold text-accent-foreground">この回のまとめ</h3>
        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed">
          {reading.recap}
        </p>
      </div>
    </div>
  );
}
