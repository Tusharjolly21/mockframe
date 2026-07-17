import { Easing } from "remotion";

/** Shared motion + colour helpers so every template feels like one product. */

// Premium easing curves.
export const EASE_OUT = Easing.bezier(0.22, 1, 0.36, 1); // decisive settle
export const EASE_IN_OUT = Easing.bezier(0.65, 0, 0.35, 1);
export const EASE_OUT_BACK = Easing.bezier(0.34, 1.56, 0.64, 1); // tiny overshoot
export const EASE_CINE = Easing.bezier(0.16, 1, 0.3, 1); // long, weighty settle (expo-out)
export const EASE_IN_EXPO = Easing.bezier(0.7, 0, 0.84, 0); // accelerate into a move

// Spring configs.
export const SPRING_SOFT = { damping: 18, mass: 0.9, stiffness: 120 } as const;
export const SPRING_SNAPPY = { damping: 14, mass: 0.6, stiffness: 200 } as const;

/** #rrggbb → rgba(r,g,b,a). Falls back to the input for already-rgba strings. */
export function rgba(hex: string, alpha: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const r = (n >> 16) & 255;
  const g = (n >> 8) & 255;
  const b = n & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Pick a screen by (wrapping) index — templates cut through the screenshot list. */
export function screenAt<T>(list: T[], index: number): T {
  const n = list.length;
  return list[((index % n) + n) % n];
}

/** How many cut points have passed at this frame (drives the active screen). */
export function cutsPassed(frame: number, cuts: number[]): number {
  let n = 0;
  for (const c of cuts) if (frame >= c) n++;
  return n;
}

/** A short scale "bump" near each cue frame — the little zoom-punch on a beat. */
export function punchAt(frame: number, cues: number[], amp = 0.06, span = 7): number {
  let v = 0;
  for (const c of cues) v += Math.max(0, 1 - Math.abs(frame - c) / span) * amp;
  return v;
}

/** A shared, modern type stack. Inter is loaded by the app shell and present on
 *  most render hosts; the fallbacks keep previews and local renders looking
 *  right. (For Lambda, embed Inter as a font file — see DEPLOY.md.) */
export const FONT_STACK =
  '"Inter", "SF Pro Display", -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif';
