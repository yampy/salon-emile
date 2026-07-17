"use server";

/**
 * Settings mutations (server actions): update the three model slots.
 */
import { revalidatePath } from "next/cache";
import { getDb } from "@/db/client";
import { MODEL_SETTING_KEYS, setSetting } from "@/db/settings";

export async function updateModelSettings(formData: FormData): Promise<void> {
  const db = getDb();
  for (const key of MODEL_SETTING_KEYS) {
    const value = formData.get(key);
    if (typeof value === "string" && value.trim().length > 0) {
      setSetting(db, key, value.trim());
    }
  }
  revalidatePath("/settings");
}
