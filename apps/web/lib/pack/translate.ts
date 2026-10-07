"use client";

import { firebaseFetch } from "../firebaseClient";
import { TRANSLATE_LOCALES_PER_REQUEST } from "../ai/translate";
import { SOURCE_LOCALE } from "./locales";
import type { PackDocument } from "./schema";

export type TranslateFailure = "signin" | "pro" | "limit" | "unconfigured" | "failed";

export class TranslateError extends Error {
  constructor(public reason: TranslateFailure, message: string) {
    super(message);
  }
}

type Captions = { title: string; subtitle?: string }[];

/**
 * Translate the pack's source captions into `locales`, a request per
 * TRANSLATE_LOCALES_PER_REQUEST languages. Each finished batch is handed to
 * `onBatch` right away, so a failure halfway keeps the languages already done.
 */
export async function translatePack(
  pack: PackDocument,
  locales: string[],
  onBatch: (translations: Record<string, Captions>, done: number, total: number) => void
): Promise<void> {
  const captions = pack.screens.map((s) => {
    const c = s.captions[SOURCE_LOCALE] ?? { title: "" };
    return c.subtitle?.trim() ? { title: c.title, subtitle: c.subtitle } : { title: c.title };
  });
  let done = 0;
  for (let i = 0; i < locales.length; i += TRANSLATE_LOCALES_PER_REQUEST) {
    const batch = locales.slice(i, i + TRANSLATE_LOCALES_PER_REQUEST);
    let res: Response;
    try {
      res = await firebaseFetch("/api/ai-translate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appName: pack.appName || undefined,
          description: pack.source?.description,
          tone: pack.source?.tone,
          captions,
          locales: batch,
        }),
      });
    } catch {
      throw new TranslateError("failed", "Couldn't reach the translation service — check your connection.");
    }
    if (res.status === 401) throw new TranslateError("signin", "Sign in to translate.");
    if (res.status === 402) throw new TranslateError("pro", "AI translation is a Pro feature.");
    if (res.status === 429) throw new TranslateError("limit", "Translation limit reached — try again later.");
    if (res.status === 501) throw new TranslateError("unconfigured", "AI translation isn't set up on this server.");
    if (!res.ok) throw new TranslateError("failed", "Translation failed — please retry.");
    const json = (await res.json()) as { translations?: Record<string, Captions> };
    done += batch.length;
    onBatch(json.translations ?? {}, done, locales.length);
  }
}
