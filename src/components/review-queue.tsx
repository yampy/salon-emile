"use client";

/**
 * One review round: present each due card, grade the free-text answer via
 * the light model, show the outcome, move on. FSRS decides when each card
 * comes back.
 */
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

type QueueCard = {
  id: string;
  kind: "repere" | "thesis" | "lapse";
  front: string;
};

type Outcome = {
  score: number;
  comment: string;
  nextDue: string;
  remainingDue: number;
};

const KIND_LABELS: Record<QueueCard["kind"], string> = {
  repere: "repère",
  thesis: "テーゼ",
  lapse: "変形問題",
};

type Props = {
  initialCards: QueueCard[];
  initialDueCount: number;
};

export function ReviewQueue({ initialCards, initialDueCount }: Props) {
  const [cards] = useState<QueueCard[]>(initialCards);
  const [index, setIndex] = useState(0);
  const [answer, setAnswer] = useState("");
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const card = cards[index];
  const finished = index >= cards.length;

  async function submit() {
    if (!card || !answer.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, answer }),
      });
      if (!res.ok) throw new Error(`採点に失敗しました (${res.status})`);
      setOutcome((await res.json()) as Outcome);
    } catch (e) {
      setError(e instanceof Error ? e.message : "採点に失敗しました");
    } finally {
      setBusy(false);
    }
  }

  function nextCard() {
    setIndex((i) => i + 1);
    setAnswer("");
    setOutcome(null);
  }

  if (initialCards.length === 0) {
    return (
      <p data-testid="queue-empty" className="text-muted-foreground">
        いま復習すべきカードはありません。よく学びました。
      </p>
    );
  }

  if (finished) {
    return (
      <div data-testid="round-complete" className="flex flex-col gap-2">
        <p className="text-primary">このラウンドは完了しました。</p>
        <p className="text-sm text-muted-foreground">
          続けるにはページを再読み込みしてください。
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground" data-testid="queue-progress">
        {index + 1} / {cards.length} 枚(期限到来 {initialDueCount} 枚)
      </p>

      <div className="rounded-md border border-border bg-card p-4">
        <p className="mb-1 text-xs text-muted-foreground">
          {KIND_LABELS[card.kind]}
        </p>
        <p data-testid="card-front" className="leading-relaxed">
          {card.front}
        </p>
      </div>

      {outcome ? (
        <div
          className="flex flex-col gap-2 rounded-md border border-border bg-card p-4"
          data-testid="review-outcome"
          data-score={outcome.score}
        >
          <p>
            <span className="font-semibold text-primary">
              {outcome.score.toFixed(1)} / 4
            </span>
            <span className="ml-3 text-sm text-muted-foreground">
              次回: {new Date(outcome.nextDue).toLocaleString("ja-JP")}
            </span>
          </p>
          <p className="text-sm leading-relaxed">{outcome.comment}</p>
          <Button onClick={nextCard} data-testid="next-card" className="self-start">
            次のカードへ
          </Button>
        </div>
      ) : (
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
            placeholder="思い出して書いてください"
            className="min-h-28 bg-card"
            data-testid="review-answer"
            disabled={busy}
          />
          <Button
            type="submit"
            disabled={busy || answer.trim().length === 0}
            data-testid="review-submit"
            className="self-start"
          >
            回答する
          </Button>
        </form>
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
