"use client";

/**
 * The global Q&A chat: ask anything, get an answer grounded in the whole
 * curriculum. Mentions of 第N回 in answers become links to that session's
 * textbook page.
 */
import Link from "next/link";
import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export type AskDisplayMessage = {
  role: "user" | "assistant";
  content: string;
};

const SESSION_REF = /第(\d{1,2})回/g;

/** Render assistant text, turning 第N回 mentions into textbook links. */
function LinkifiedText({ text }: { text: string }) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  for (const match of text.matchAll(SESSION_REF)) {
    const n = Number(match[1]);
    const start = match.index;
    if (start > lastIndex) {
      parts.push(text.slice(lastIndex, start));
    }
    if (n >= 0 && n <= 16) {
      parts.push(
        <Link
          key={`${start}-${n}`}
          href={`/lessons/${n}`}
          className="text-primary underline underline-offset-2 hover:opacity-80"
          data-testid={`session-ref-${n}`}
        >
          {match[0]}
        </Link>
      );
    } else {
      parts.push(match[0]);
    }
    lastIndex = start + match[0].length;
  }
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{part}</Fragment>
      ))}
    </>
  );
}

const SUGGESTIONS = [
  "どの回から始めるのがおすすめですか?",
  "problématique(問題化)がまだピンときません",
  "復習はどう進めればいいですか?",
];

type Props = {
  initialMessages: AskDisplayMessage[];
};

export function AskChat({ initialMessages }: Props) {
  const [messages, setMessages] = useState<AskDisplayMessage[]>(initialMessages);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: "end" });
  }, [messages]);

  const ask = useCallback(
    async (question: string) => {
      if (!question.trim() || busy) return;
      setBusy(true);
      setError(null);
      setMessages((prev) => [
        ...prev,
        { role: "user", content: question },
        { role: "assistant", content: "" },
      ]);
      try {
        const res = await fetch("/api/ask", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: question }),
        });
        if (!res.ok || !res.body) {
          throw new Error(`質問に失敗しました (${res.status})`);
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
      } catch (e) {
        setMessages((prev) => prev.slice(0, -2));
        setError(e instanceof Error ? e.message : "質問に失敗しました");
      } finally {
        setBusy(false);
      }
    },
    [busy]
  );

  const send = useCallback(() => {
    const question = input.trim();
    if (!question) return;
    setInput("");
    void ask(question);
  }, [input, ask]);

  async function clearThread() {
    if (busy) return;
    await fetch("/api/ask", { method: "DELETE" });
    setMessages([]);
    setError(null);
  }

  return (
    <div className="flex flex-col gap-4">
      <div
        className="flex min-h-72 flex-col gap-3 rounded-md border border-border bg-card p-4"
        data-testid="ask-log"
      >
        {messages.length === 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-muted-foreground">
              講座のこと、概念のこと、勉強の進め方 — なんでも聞いてください。
              どの回が参考になるかも合わせて案内します。
            </p>
            <div className="flex flex-wrap gap-2">
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void ask(s)}
                  className="rounded-md border border-border bg-background px-3 py-1.5 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-foreground"
                  data-testid="ask-suggestion"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
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
            {m.role === "assistant" ? <LinkifiedText text={m.content} /> : m.content}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
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
          placeholder="質問を書いてください(Enterで改行、送信はボタン)"
          className="min-h-20 flex-1 bg-card"
          data-testid="ask-input"
          disabled={busy}
        />
        <Button type="submit" disabled={busy || input.trim().length === 0} data-testid="ask-send">
          質問する
        </Button>
      </form>

      {messages.length > 0 && (
        <button
          type="button"
          onClick={() => void clearThread()}
          disabled={busy}
          className="self-start text-xs text-muted-foreground transition-colors hover:text-destructive"
          data-testid="ask-clear"
        >
          会話を最初からやり直す
        </button>
      )}
    </div>
  );
}
