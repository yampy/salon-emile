/**
 * Settings access. Model choices live in the DB (three slots), never in
 * code; the defaults below are only seed values (`pnpm db:seed`).
 */
import { eq } from "drizzle-orm";
import type { Db } from "./client";
import { settings } from "./schema";

export const MODEL_SETTING_KEYS = [
  "tutorModel",
  "graderModel",
  "lightModel",
] as const;

export type ModelSettingKey = (typeof MODEL_SETTING_KEYS)[number];

/** Seed-time defaults for the three model slots. */
export const DEFAULT_SETTINGS: Record<ModelSettingKey, string> = {
  tutorModel: "claude-opus-4-8",
  graderModel: "claude-opus-4-8",
  lightModel: "claude-haiku-4-5",
};

/** Read one setting; null when unset. */
export function getSetting(db: Db, key: string): string | null {
  const row = db.select().from(settings).where(eq(settings.key, key)).get();
  return row?.value ?? null;
}

/** Read a model slot, falling back to its seed default. */
export function getModelSetting(db: Db, key: ModelSettingKey): string {
  return getSetting(db, key) ?? DEFAULT_SETTINGS[key];
}

/** Create or update one setting. */
export function setSetting(db: Db, key: string, value: string): void {
  db.insert(settings)
    .values({ key, value })
    .onConflictDoUpdate({ target: settings.key, set: { value } })
    .run();
}
