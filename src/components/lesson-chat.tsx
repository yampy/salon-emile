"use client";

/**
 * Client side of the lesson dialogue: sends learner messages, renders the
 * tutor's streamed reply, and refetches lesson state (step/status) after
 * each exchange — the server alone decides step transitions.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { LessonStep } from "@/domain/lesson";

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

type Props = {
  sessionN: number;
  initialStep: LessonStep;
  initialStatus: "active" | "completed";
  initialMessages: ChatDisplayMessage[];
};

export function LessonChat({
  sessionN,
  initialStep,
  initialStatus,
  initialMessages,
}: Props) {
  const [messages, setMessages] = useState<ChatDisplayMessage[]>(initialMessages);
  const [lesson, setLesson] = useState<LessonState>({
    step: initialStep,
    status: initialStatus,
  });
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const refreshState = useCallback(async () => {
    const res = await fetch(`/api/lessons/${sessionN}`, { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as {
      run: { step: LessonStep; status: "active" | "completed" } | null;
    };
    if (data.run) {
      setLesson({ step: data.run.step, status: data.run.status });
    }
  }, [sessionN]);

  const exchange = useCallback(
    async (body: { message?: string; start?: boolean }) => {
      setBusy(true);
      setError(null);
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
            next[next.length - 1] = {
              ...last,
              content: last.content + chunk,
            };
            return next;
          });
        }
        await refreshState();
      } catch (e) {
        setMessages((prev) => prev.slice(0, -1));
        setError(e instanceof Error ? e.message : "通信に失敗しました");
      } finally {
        setBusy(false);
      }
    },
    [sessionN, refreshState]
  );

  const send = useCallback(() => {
    const message = input.trim();
    if (!message || busy) return;
    setInput("");
    void exchange({ message });
  }, [input, busy, exchange]);

  const started = messages.length > 0;
  const completed = lesson.status === "completed";
  const currentIndex = STEP_ORDER.indexOf(lesson.step);

  return (
    <div className="flex flex-col gap-4">
      <ol
        className="flex flex-wrap gap-x-4 gap-y-1 text-sm"
        aria-label="レッスンの進行"
        data-testid="step-indicator"
        data-current-step={lesson.step}
        data-status={lesson.status}
      >
        {STEP_ORDER.map((step, i) => (
          <li
            key={step}
            data-step={step}
            className={
              step === lesson.step && !completed
                ? "font-semibold text-primary"
                : i < currentIndex || completed
                  ? "text-foreground"
                  : "text-muted-foreground"
            }
          >
            {i + 1}. {STEP_LABELS[step]}
          </li>
        ))}
      </ol>

      <div
        className="flex min-h-64 flex-col gap-3 rounded-md border border-border bg-card p-4"
        data-testid="chat-log"
      >
        {!started && (
          <p className="text-muted-foreground">
            準備ができたら、レッスンを開始してください。
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

      {completed ? (
        <p data-testid="lesson-completed" className="text-primary">
          本回のレッスンは完了しました。復習キューで定着させましょう。
        </p>
      ) : !started ? (
        <Button
          onClick={() => void exchange({ start: true })}
          disabled={busy}
          data-testid="start-lesson"
        >
          レッスンを開始
        </Button>
      ) : (
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
          <Button type="submit" disabled={busy || input.trim().length === 0} data-testid="chat-send">
            送信
          </Button>
        </form>
      )}
    </div>
  );
}
