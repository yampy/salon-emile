"use client";

/**
 * Client side of the lesson dialogue. The chat is per-step:
 * - advancing shows a banner; entering the next step starts a clean chat
 *   (earlier productions still reach the tutor via system context);
 * - 「このステップを最初から」 wipes the current step's dialogue and its
 *   productions, restarting the advance gate;
 * - transitions are always judged server-side.
 */
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { Button, buttonVariants } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { LessonStep } from "@/domain/lesson";
import { STEP_GUIDANCE } from "@/llm/prompts/context";

export type ChatDisplayMessage = {
  role: "user" | "assistant";
  content: string;
};

const STEP_LABELS: Record<LessonStep, string> = {
  intuition: "直観",
  definition_reperes: "定義とrepères",
  theses: "テーゼ",
  question: "問い",
  essay: "論述",
  bridge: "橋渡し",
};

const STEP_ORDER: LessonStep[] = [
  "intuition",
  "definition_reperes",
  "theses",
  "question",
  "essay",
  "bridge",
];

type LessonState = {
  step: LessonStep;
  status: "active" | "completed";
};

type ServerState = LessonState & { messages: ChatDisplayMessage[] };

type Props = {
  sessionN: number;
  initialStep: LessonStep;
  initialStatus: "active" | "completed";
  initialMessages: ChatDisplayMessage[];
  hasNextSession: boolean;
};

export function LessonChat({
  sessionN,
  initialStep,
  initialStatus,
  initialMessages,
  hasNextSession,
}: Props) {
  const [messages, setMessages] = useState<ChatDisplayMessage[]>(initialMessages);
  const [lesson, setLesson] = useState<LessonState>({
    step: initialStep,
    status: initialStatus,
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advanceNote, setAdvanceNote] = useState<string | null>(null);
  /** Set when the server advanced mid-exchange; the banner offers the clean start. */
  const [pendingStep, setPendingStep] = useState<LessonStep | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const fetchState = useCallback(async (): Promise<ServerState | null> => {
    const res = await fetch(`/api/lessons/${sessionN}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      run:
        | (LessonState & {
            messages: { role: "user" | "assistant"; content: string }[];
          })
        | null;
    };
    if (!data.run) return null;
    return {
      step: data.run.step,
      status: data.run.status,
      messages: data.run.messages.map((m) => ({
        role: m.role,
        content: m.content,
      })),
    };
  }, [sessionN]);

  /** Enter the (already advanced) step with a clean chat. */
  const enterStep = useCallback(async () => {
    const state = await fetchState();
    if (!state) return;
    setLesson({ step: state.step, status: state.status });
    setMessages(state.messages);
    setPendingStep(null);
    setAdvanceNote(null);
  }, [fetchState]);

  const exchange = useCallback(
    async (body: { message?: string; start?: boolean }) => {
      setBusy(true);
      setError(null);
      setAdvanceNote(null);
      if (body.message) {
        setMessages((prev) => [...prev, { role: "user", content: body.message! }]);
      }
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      try {
        const res = await fetch(`/api/lessons/${sessionN}/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        if (!res.ok || !res.body) {
          throw new Error(`chat request failed (${res.status})`);
        }
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          const chunk = decoder.decode(value, { stream: true });
          setMessages((prev) => {
            const next = [...prev];
            const last = next[next.length - 1];
            next[next.length - 1] = { ...last, content: last.content + chunk };
            return next;
          });
        }
        // Detect a server-side advance without wiping what's on screen:
        // the banner lets the learner enter the next step cleanly.
        const state = await fetchState();
        if (state) {
          if (state.status === "completed") {
            setLesson({ step: state.step, status: state.status });
            setMessages(state.messages);
            setPendingStep(null);
          } else if (state.step !== lesson.step) {
            setPendingStep(state.step);
          }
        }
      } catch (e) {
        setMessages((prev) => prev.slice(0, -1));
        setError(e instanceof Error ? e.message : "通信に失敗しました");
      } finally {
        setBusy(false);
      }
    },
    [sessionN, fetchState, lesson.step]
  );

  const advance = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setAdvanceNote(null);
    try {
      const res = await fetch(`/api/lessons/${sessionN}/advance`, {
        method: "POST",
      });
      const data = (await res.json()) as { message?: string };
      if (res.status === 409) {
        setAdvanceNote(data.message ?? "まだ進めません。");
        return;
      }
      if (!res.ok) {
        throw new Error(`advance failed (${res.status})`);
      }
      // Manual advance = the learner wants to move on now: enter cleanly.
      await enterStep();
    } catch (e) {
      setError(e instanceof Error ? e.message : "通信に失敗しました");
    } finally {
      setBusy(false);
    }
  }, [busy, sessionN, enterStep]);

  const resetStep = useCallback(async () => {
    if (busy) return;
    setBusy(true);
    setError(null);
    setAdvanceNote(null);
    try {
      const res = await fetch(`/api/lessons/${sessionN}/chat`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error(`reset failed (${res.status})`);
      setMessages([]);
      setPendingStep(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "リセットに失敗しました");
    } finally {
      setBusy(false);
    }
  }, [busy, sessionN]);

  const send = useCallback(() => {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    void exchange({ message });
  }, [input, busy, exchange]);

  const started = messages.length > 0;
  const completed = lesson.status === "completed";
  const currentIndex = STEP_ORDER.indexOf(lesson.step);
  const isFirstStep = lesson.step === STEP_ORDER[0];

  return (
    <div className="flex flex-col gap-4">
      <ol
        className="flex flex-wrap gap-x-4 gap-y-1 text-sm"
        aria-label="レッスンの進行"
        data-testid="step-indicator"
        data-current-step={pendingStep ?? lesson.step}
        data-status={lesson.status}
      >
        {STEP_ORDER.map((step, i) => (
          <li
            key={step}
            data-step={step}
            className={
              step === (pendingStep ?? lesson.step) && !completed
                ? "font-semibold text-primary"
                : i < STEP_ORDER.indexOf(pendingStep ?? lesson.step) || completed
                  ? "text-foreground"
                  : "text-muted-foreground"
            }
          >
            {i + 1}. {STEP_LABELS[step]}
          </li>
        ))}
      </ol>

      {!completed && !pendingStep && (
        <div
          className="rounded-md border border-accent bg-accent/30 px-4 py-3 text-sm leading-relaxed"
          data-testid="step-goal"
        >
          <p>
            <span className="font-semibold text-accent-foreground">
              いまのステップ({currentIndex + 1}/{STEP_ORDER.length}):{" "}
              {STEP_LABELS[lesson.step]}
            </span>
            {" — "}
            {STEP_GUIDANCE[lesson.step]}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            進み方: このステップであなたの考えを1文以上書くと、チューターの判断または「次のステップへ」ボタンで進めます。ステップが進むと、チャットはまっさらな状態から始まります。
          </p>
        </div>
      )}

      <div
        className="flex min-h-64 flex-col gap-3 rounded-md border border-border bg-card p-4"
        data-testid="chat-log"
      >
        {!started && !completed && (
          <p className="text-muted-foreground">
            {isFirstStep
              ? "準備ができたら、レッスンを開始してください。教科書を先に読むのもおすすめです。"
              : "新しいステップです。チューターに口火を切ってもらうか、そのまま自分の考えを書き始めてください。"}
          </p>
        )}
        {messages.map((m, i) => (
          <div
            key={i}
            data-role={m.role}
            className={
              m.role === "user"
                ? "self-end max-w-[85%] rounded-md bg-accent px-3 py-2 text-accent-foreground"
                : "self-start max-w-[85%] whitespace-pre-wrap leading-relaxed"
            }
          >
            {m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {advanceNote && (
        <p className="text-sm text-primary" data-testid="advance-note">
          {advanceNote}
        </p>
      )}

      {pendingStep && !completed ? (
        <div
          className="flex flex-wrap items-center gap-3 rounded-md border border-primary/30 bg-accent/30 px-4 py-3"
          data-testid="step-transition"
        >
          <p className="text-sm">
            ステップが進みました: 次は
            <span className="mx-1 font-semibold text-primary">
              {STEP_LABELS[pendingStep]}
            </span>
            です。
          </p>
          <Button onClick={() => void enterStep()} disabled={busy} data-testid="enter-step">
            まっさらなチャットで始める →
          </Button>
        </div>
      ) : completed ? (
        <div className="flex flex-col gap-3" data-testid="lesson-completed">
          <p className="text-primary">
            本回のレッスンは完了しました。よく歩きました。上の記録は全ステップの対話です。
          </p>
          <div className="flex flex-wrap gap-3">
            <Link href="/review" className={buttonVariants()}>
              復習キューへ
            </Link>
            {hasNextSession && (
              <Link
                href={`/lessons/${sessionN + 1}`}
                className={buttonVariants({ variant: "outline" })}
              >
                第{sessionN + 1}回の教科書へ
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {!started && (
            <Button
              onClick={() => void exchange({ start: true })}
              disabled={busy}
              data-testid="start-lesson"
              className="self-start"
            >
              {isFirstStep ? "レッスンを開始" : "チューターに口火を切ってもらう"}
            </Button>
          )}
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send();
            }}
          >
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="あなたの考えを書いてください(Enterで改行、送信はボタン)"
              className="min-h-20 flex-1 bg-card"
              data-testid="chat-input"
              disabled={busy}
            />
            <Button
              type="submit"
              disabled={busy || input.trim().length === 0}
              data-testid="chat-send"
            >
              送信
            </Button>
          </form>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => void advance()}
              disabled={busy}
              data-testid="advance-step"
            >
              次のステップへ →
            </Button>
            {started && (
              <button
                type="button"
                onClick={() => void resetStep()}
                disabled={busy}
                className="text-xs text-muted-foreground transition-colors hover:text-destructive"
                data-testid="reset-step"
              >
                このステップを最初からやり直す
              </button>
            )}
            <span className="text-xs text-muted-foreground">
              自分のペースで進めてかまいません。
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
