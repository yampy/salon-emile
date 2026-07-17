/**
 * Schema for the generated per-session reading (読み物) — the friendly,
 * step-by-step study text derived from the canon. Structure follows the 5E
 * sequence; style rules live in docs/writing-guide.md and the prompt.
 */
import { z } from "zod";

export const ReadingStepSchema = z.object({
  /** Step heading, ideally phrased as a question or discovery. */
  title: z.string().min(1),
  /** Explanation in conversational Japanese (concrete → abstract). */
  body: z.string().min(1),
  /** One everyday example/analogy for Japanese teens. */
  example: z.string().min(1),
});

export const SessionReadingSchema = z.object({
  /** One-line catch for the session. */
  catchphrase: z.string().min(1),
  /** Engage: the opening hook connecting daily life to the question. */
  hook: z.string().min(1),
  /** Explore/Explain: 3–6 understanding steps, easy to hard. */
  steps: z.array(ReadingStepSchema).min(3).max(6),
  /** Elaborate: canon theses broken down, keyed by canonical id. */
  thesesGuide: z.array(
    z.object({
      id: z.string().min(1),
      friendly: z.string().min(1),
    })
  ),
  /** Evaluate: three-line recap that names what the reader can now do. */
  recap: z.string().min(1),
});

export type SessionReading = z.infer<typeof SessionReadingSchema>;
export type ReadingStep = z.infer<typeof ReadingStepSchema>;
