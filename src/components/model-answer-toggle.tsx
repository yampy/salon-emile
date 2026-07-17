"use client";

/**
 * Textbook model answer: generated on first open (then cached server-side),
 * displayed as the three-part dissertation form.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { ModelAnswer } from "@/domain/evaluation.schema";

type Props = {
  sessionN: number;
  question: string;
};

const PART_LABELS: [keyof ModelAnswer, string][] = [
  ["problematique", "problématique(問題化)"],
  ["these", "thèse(定立)"],
  ["antithese", "antithèse(反定立)"],
  ["depassement", "dépassement(乗り越え)"],
];

export function ModelAnswerToggle({ sessionN, question }: Props) {
  const [answer, setAnswer] = useState<ModelAnswer | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (answer) {
      setOpen((o) => !o);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/model-answers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionN, question }),
      });
      if (!res.ok) throw new Error(`生成に失敗しました (${res.status})`);
      setAnswer((await res.json()) as ModelAnswer);
      setOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "生成に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mt-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => void load()}
        disabled={busy}
        data-testid="model-answer-toggle"
      >
        {busy ? "生成中…" : open ? "解答例を閉じる" : "解答例を読む(AI生成)"}
      </Button>
      {error && (
        <p role="alert" className="mt-1 text-sm text-destructive">
          {error}
        </p>
      )}
      {open && answer && (
        <dl
          className="mt-3 flex flex-col gap-3 rounded-md border border-accent bg-accent/30 p-4 text-sm leading-relaxed"
          data-testid="model-answer"
        >
          {PART_LABELS.map(([key, label]) => (
            <div key={key}>
              <dt className="font-semibold text-accent-foreground">{label}</dt>
              <dd className="mt-0.5">{answer[key]}</dd>
            </div>
          ))}
          <p className="text-xs text-muted-foreground">
            ※ AI生成の解答例です。哲学者への言及は正典テーゼ(ID付き)に限定されています。
          </p>
        </dl>
      )}
    </div>
  );
}
