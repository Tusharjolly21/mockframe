"use client";

import { ANDROID_FONT, HELV_FONT, IOS_FONT, SERIF_FONT, systemFont, type Platform } from "./common";
import type { AiModel, ScreenApp } from "./types";

/**
 * Per-app font registry. Each real app ships its own typeface; we map to the
 * closest web-safe stack so screens read as that brand and differ from each
 * other (the user asked for this explicitly). Custom webfonts can't load in a
 * pure-SVG data URI, so brand fonts fall back to a matching system family.
 *
 * Most chat apps just use the OS system font (SF on iOS, Roboto on Android),
 * which is why `fontFor` defaults to `systemFont(platform)`.
 */

const BRAND: Partial<Record<ScreenApp, string>> = {
  // Discord ships "gg sans" (a Helvetica-like grotesque)
  discord: "'gg sans','Helvetica Neue',Helvetica,Arial,sans-serif",
  // X ships "Chirp"
  xpost: "'Chirp','Helvetica Neue',Helvetica,Arial,sans-serif",
  // YouTube uses Roboto on BOTH platforms (not the OS system font)
  youtube: "Roboto,'Noto Sans','Helvetica Neue',Arial,sans-serif",
  // Microsoft Teams uses Segoe UI
  teams: "'Segoe UI','Segoe UI Web',-apple-system,Roboto,'Helvetica Neue',Arial,sans-serif",
  // Bluesky ships "Inter"
  bluesky: "'Inter','SF Pro Text',system-ui,'Helvetica Neue',Arial,sans-serif",
};

/**
 * Monospace code fonts for the Code generator. Custom webfonts can't embed in a
 * pure-SVG data URI, so each falls back through the common editor fonts to a
 * generic monospace — the choice still reads distinct wherever the font is
 * installed (which it commonly is for these popular dev fonts).
 */
export const CODE_FONTS: Record<string, string> = {
  jetbrains: "'JetBrains Mono','SF Mono',ui-monospace,Menlo,Consolas,monospace",
  fira: "'Fira Code','JetBrains Mono',ui-monospace,Menlo,Consolas,monospace",
  sfmono: "'SF Mono',ui-monospace,Menlo,Monaco,Consolas,monospace",
  ibmplex: "'IBM Plex Mono','SF Mono',ui-monospace,Menlo,Consolas,monospace",
  source: "'Source Code Pro','SF Mono',ui-monospace,Menlo,Consolas,monospace",
  cascadia: "'Cascadia Code','Cascadia Mono',ui-monospace,Consolas,Menlo,monospace",
  geist: "'Geist Mono','SF Mono',ui-monospace,Menlo,Consolas,monospace",
  menlo: "Menlo,Monaco,'SF Mono',Consolas,ui-monospace,monospace",
};

export const CODE_FONT_LABELS: Record<string, string> = {
  jetbrains: "JetBrains Mono",
  fira: "Fira Code",
  sfmono: "SF Mono",
  ibmplex: "IBM Plex Mono",
  source: "Source Code Pro",
  cascadia: "Cascadia Code",
  geist: "Geist Mono",
  menlo: "Menlo",
};

export function codeFontFor(key: string): string {
  return CODE_FONTS[key] ?? CODE_FONTS.jetbrains;
}

const AI_FONT: Record<AiModel, string> = {
  chatgpt: HELV_FONT, // OpenAI "Söhne" ~ Helvetica grotesque
  claude: SERIF_FONT, // Anthropic "Tiempos" serif — the visibly different one
  gemini: "'Google Sans','Product Sans',Roboto,Arial,sans-serif",
  grok: "'Inter',system-ui,'Helvetica Neue',Arial,sans-serif",
  perplexity: "'FK Grotesk Neue','Inter',system-ui,Arial,sans-serif",
};

export function fontFor(app: ScreenApp, platform: Platform, model?: AiModel): string {
  if (app === "ai" && model) return AI_FONT[model];
  return BRAND[app] ?? systemFont(platform);
}

export { ANDROID_FONT, IOS_FONT, SERIF_FONT };
