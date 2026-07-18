/**
 * 質問 screen — the global Q&A chat. One persistent thread; the advisor
 * answers with the whole curriculum in view and points to the sessions
 * worth reading.
 */
import { AskChat, type AskDisplayMessage } from "@/components/ask-chat";
import { getDb } from "@/db/client";
import { listAdvisorMessages } from "@/server/advisor";

export const dynamic = "force-dynamic";

export default async function AskPage() {
  const db = getDb();
  const messages: AskDisplayMessage[] = listAdvisorMessages(db).map((m) => ({
    role: m.role,
    content: m.content,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">質問</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          レッスンの外で、講座全体を見渡して答える案内人です。回答には参考になる回へのリンクがつきます。
        </p>
      </div>
      <AskChat initialMessages={messages} />
    </div>
  );
}
