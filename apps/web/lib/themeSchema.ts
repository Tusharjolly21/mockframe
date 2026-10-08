import { BackdropSchema, BackgroundSchema, EffectSchema } from "@framekit/scene";
import type { StyleTheme } from "./themes";

/**
 * Themes arrive from places we don't control: the shared-theme API, an imported
 * file, localStorage. The theme panel reads `background.stops`, `cx` and friends
 * without checking, so a malformed one would throw while rendering and leave the
 * editor blank on every open. Rebuild each theme from validated pieces instead.
 *
 * A bad background drops the whole theme; a bad backdrop, effect list, radius or
 * border is dropped on its own, so an older theme keeps its colours.
 */
export function parseTheme(value: unknown): StyleTheme | null {
  if (!value || typeof value !== "object") return null;
  const v = value as Record<string, unknown>;
  if (typeof v.id !== "string" || typeof v.name !== "string") return null;
  const background = BackgroundSchema.safeParse(v.background);
  if (!background.success) return null;

  const theme: StyleTheme = { id: v.id.slice(0, 120), name: v.name.slice(0, 120), background: background.data };
  const backdrop = BackdropSchema.safeParse(v.backdrop);
  if (v.backdrop !== undefined && backdrop.success) theme.backdrop = backdrop.data;
  if (Array.isArray(v.effects)) {
    const effects = v.effects.map((e) => EffectSchema.safeParse(e)).filter((r) => r.success).map((r) => r.data!);
    if (effects.length) theme.effects = effects;
  }
  if (typeof v.cornerRadius === "number" && Number.isFinite(v.cornerRadius) && v.cornerRadius >= 0 && v.cornerRadius < 10_000) theme.cornerRadius = v.cornerRadius;
  const border = v.border as { width?: unknown; color?: unknown } | undefined;
  if (border && typeof border.width === "number" && Number.isFinite(border.width) && border.width >= 0 && typeof border.color === "string" && isSafeColor(border.color)) {
    theme.border = { width: border.width, color: border.color };
  }
  if (v.builtin === true) theme.builtin = true;
  return theme;
}

/** Colours go into CSS strings: refuse anything that could open a url(), a new declaration or a new rule. */
export function isSafeColor(color: string): boolean {
  return color.length <= 200 && !/[;{}\\<>]|url\s*\(|@import|expression\s*\(/i.test(color);
}
