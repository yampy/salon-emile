/**
 * Review screen — the FSRS queue over the three card kinds
 * (31 repères / 64 theses / auto-generated lapse variants).
 */
import { ReviewQueue } from "@/components/review-queue";
import { getDb } from "@/db/client";
import { countDueCards, listDueCards } from "@/server/review";

export const dynamic = "force-dynamic";

export default async function ReviewPage() {
  const db = getDb();
  const now = new Date();
  const cards = listDueCards(db, now);
  const dueCount = countDueCards(db, now);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">復習</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          間隔反復(FSRS)が選んだカードに、自分の言葉で答えます。
        </p>
      </div>
      <ReviewQueue
        initialCards={cards.map((c) => ({
          id: c.id,
          kind: c.kind,
          front: c.front,
        }))}
        initialDueCount={dueCount}
      />
    </div>
  );
}
