"use client";

/**
 * Exercise workflow client: answer → grade → evaluation display, plus the
 * "答えを見る" guardrail (reveal is recorded server-side and immediately
 * replaced by a mandatory variant question).
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { EvaluationView } from "@/components/evaluation-view";
import type { Evaluation } from "@/domain/evaluation.schema";
import type { ExerciseKind } from "@/domain/exercise";
import type { RubricRef } from "@/llm/prompts/context";

type RevealCanon = {
  core: string | null;
  method: string | null;
  reperesNote: string | null;
  theses: { id: string; philosopher: string; claim: string }[];
};

type Props = {
  sessionN: number;
  exerciseKind: ExerciseKind;
  question: string;
  rubric: RubricRef[];
};

export function ExerciseForm({ sessionN, exerciseKind, question, rubric }: Props) {
  const [currentQuestion, setCurrentQuestion] = useState(question);
  const [isVariant, setIsVariant] = useState(false);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [canon, setCanon] = useState<RevealCanon | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!answer.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionN,
          kind: isVariant
            ? "variant"
            : exerciseKind === "mini_essay"
              ? "essay"
              : "exercise",
          exerciseKind,
          question: currentQuestion,
          answer,
        }),
      });
      if (!res.ok) throw new Error(`採点に失敗しました (${res.status})`);
      const data = (await res.json()) as { evaluation: Evaluation };
      setEvaluation(data.evaluation);
    } catch (e) {
      setError(e instanceof Error ? e.message : "採点に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  async function reveal() {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionN, exerciseKind, question: currentQuestion }),
      });
      if (!res.ok) throw new Error(`取得に失敗しました (${res.status})`);
      const data = (await res.json()) as {
        canon: RevealCanon;
        variantQuestion: string;
      };
      setCanon(data.canon);
      setCurrentQuestion(data.variantQuestion);
      setIsVariant(true);
      setEvaluation(null);
      setAnswer("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "取得に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-border bg-card p-4">
        {isVariant && (
          <p className="mb-1 text-xs text-primary" data-testid="variant-notice">
            正典を見たので、同型の変形問題に答えてください。
          </p>
        )}
        <p data-testid="exercise-question" className="leading-relaxed">
          {currentQuestion}
        </p>
      </div>

      {canon && (
        <details
          open
          className="rounded-md border border-accent bg-accent/40 p-4 text-sm"
          data-testid="canon-reveal"
        >
          <summary className="cursor-pointer font-semibold">
            正典の手がかり(curriculum.json由来)
          </summary>
          <div className="mt-2 flex flex-col gap-2 leading-relaxed">
            {canon.core && <p>{canon.core}</p>}
            {canon.method && <p>{canon.method}</p>}
            {canon.reperesNote && <p>{canon.reperesNote}</p>}
            {canon.theses.map((t) => (
              <p key={t.id}>
                <span className="text-xs text-muted-foreground">[{t.id}]</span>{" "}
                {t.philosopher}: {t.claim}
              </p>
            ))}
          </div>
        </details>
      )}

      <form
        className="flex flex-col gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          placeholder="ここに書いてください"
          className="min-h-36 bg-card"
          data-testid="exercise-answer"
          disabled={busy}
        />
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            disabled={busy || answer.trim().length === 0}
            data-testid="exercise-submit"
          >
            提出して採点
          </Button>
          {!isVariant && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void reveal()}
              disabled={busy}
              data-testid="reveal-button"
            >
              答えを見る
            </Button>
          )}
          {busy && <span className="text-sm text-muted-foreground">処理中…</span>}
        </div>
      </form>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {evaluation && (
        <section className="rounded-md border border-border bg-card p-4">
          <h2 className="mb-3 text-lg">採点結果</h2>
          <EvaluationView evaluation={evaluation} rubric={rubric} />
        </section>
      )}
    </div>
  );
}
