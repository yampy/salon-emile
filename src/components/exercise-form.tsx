"use client";

/**
 * Exercise workflow client: answer → grade → evaluation display, plus the
 * 「AIに回答させる」guardrail: the AI writes a worked answer for the current
 * exercise (recorded server-side), the original stays visible, and an
 * isomorphic variant question becomes the learner's task.
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

type AiTurn = {
  aiAnswer: string;
  canon: RevealCanon;
  variantQuestion: string;
};

type Props = {
  sessionN: number;
  exerciseKind: ExerciseKind;
  question: string;
  rubric: RubricRef[];
};

export function ExerciseForm({ sessionN, exerciseKind, question, rubric }: Props) {
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [aiBusy, setAiBusy] = useState(false);
  const [evaluation, setEvaluation] = useState<Evaluation | null>(null);
  const [aiTurn, setAiTurn] = useState<AiTurn | null>(null);
  const [error, setError] = useState<string | null>(null);

  // After the AI answered, the learner's task is the variant question.
  const activeQuestion = aiTurn ? aiTurn.variantQuestion : question;

  async function submit() {
    if (!answer.trim() || busy || aiBusy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionN,
          kind: aiTurn
            ? "variant"
            : exerciseKind === "mini_essay"
              ? "essay"
              : "exercise",
          exerciseKind,
          question: activeQuestion,
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

  async function askAi() {
    if (busy || aiBusy) return;
    setAiBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/reveal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionN, exerciseKind, question }),
      });
      if (!res.ok) throw new Error(`AIの回答生成に失敗しました (${res.status})`);
      const data = (await res.json()) as AiTurn;
      setAiTurn(data);
      setEvaluation(null);
      setAnswer("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "AIの回答生成に失敗しました");
    } finally {
      setAiBusy(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-md border border-border bg-card p-4">
        <p className="mb-1 text-xs text-muted-foreground">
          {aiTurn ? "元の問題(下でAIが回答済み)" : "問題"}
        </p>
        <p data-testid="exercise-question" className="leading-relaxed">
          {question}
        </p>
      </div>

      {aiTurn && (
        <>
          <section
            className="rounded-md border border-border bg-card p-4"
            data-testid="ai-answer"
          >
            <h2 className="text-sm font-semibold">
              AIの回答例
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                上の問題に対して
              </span>
            </h2>
            <p className="mt-2 whitespace-pre-wrap leading-relaxed">
              {aiTurn.aiAnswer}
            </p>
            <details className="mt-3">
              <summary
                className="cursor-pointer text-xs text-muted-foreground hover:text-primary"
                data-testid="canon-reveal-toggle"
              >
                正典の手がかりも読む(curriculum.json由来)
              </summary>
              <div
                className="mt-2 flex flex-col gap-2 text-sm leading-relaxed"
                data-testid="canon-reveal"
              >
                {aiTurn.canon.core && <p>{aiTurn.canon.core}</p>}
                {aiTurn.canon.method && <p>{aiTurn.canon.method}</p>}
                {aiTurn.canon.reperesNote && <p>{aiTurn.canon.reperesNote}</p>}
                {aiTurn.canon.theses.map((t) => (
                  <p key={t.id}>
                    <span className="text-xs text-muted-foreground">[{t.id}]</span>{" "}
                    {t.philosopher}: {t.claim}
                  </p>
                ))}
              </div>
            </details>
          </section>

          <div
            className="rounded-md border border-primary/40 bg-accent/30 p-4"
            data-testid="variant-turn"
          >
            <p className="text-sm font-semibold text-accent-foreground">
              今度はあなたの番 — 同型の変形問題
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              AIの回答を読んだ分、同じ型の別の問いで自分の手を動かします。下の入力欄はこの問いへの回答になります。
            </p>
            <p className="mt-2 leading-relaxed" data-testid="variant-question">
              {aiTurn.variantQuestion}
            </p>
          </div>
        </>
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
          placeholder={aiTurn ? "変形問題への回答をここに書いてください" : "ここに書いてください"}
          className="min-h-36 bg-card"
          data-testid="exercise-answer"
          disabled={busy || aiBusy}
        />
        <div className="flex items-center gap-2">
          <Button
            type="submit"
            disabled={busy || aiBusy || answer.trim().length === 0}
            data-testid="exercise-submit"
          >
            提出して採点
          </Button>
          {!aiTurn && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void askAi()}
              disabled={busy || aiBusy}
              data-testid="ai-answer-button"
            >
              {aiBusy ? "AIが回答中…" : "AIに回答させる"}
            </Button>
          )}
          {(busy || aiBusy) && (
            <span className="text-sm text-muted-foreground">
              {aiBusy ? "回答例と変形問題を用意しています…" : "採点中…"}
            </span>
          )}
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
