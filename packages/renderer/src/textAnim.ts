import type { CSSProperties } from "react";
import type { TextAnimation } from "@framekit/scene";

/**
 * Text entrance animations as a pure function of clip time, so the editor
 * preview and every exported frame are identical. Each piece of text (the
 * whole block, a word, or a letter) gets a 0..1 progress and a style for it;
 * hidden pieces keep their layout space so centred text never shifts.
 */

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const easeOutBack = (t: number) => {
  const c1 = 1.5;
  return 1 + (c1 + 1) * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

/** Overall progress of an animation at `timeMs` (1 = finished / no animation running). */
export function textAnimProgress(anim: TextAnimation | undefined, timeMs: number | null | undefined): number {
  if (!anim || timeMs == null) return 1;
  return clamp01((timeMs - anim.delayMs) / anim.durationMs);
}

/** Style for the whole text block (block-level animations). */
export function blockAnimStyle(type: TextAnimation["type"], p: number): CSSProperties | null {
  if (p >= 1) return null;
  const e = easeOutCubic(p);
  switch (type) {
    case "fade-up":
      return { opacity: e, translate: `0 ${(1 - e) * 0.6}em` };
    case "blur-in":
      return { opacity: e, filter: `blur(${(1 - e) * 0.35}em)`, scale: `${1.06 - 0.06 * e}` };
    case "pop": {
      const b = easeOutBack(p);
      return { opacity: clamp01(p * 3), scale: `${0.55 + 0.45 * b}` };
    }
    case "slide":
      return { opacity: e, translate: `${(e - 1) * 1.2}em 0` };
    default:
      return null;
  }
}

/** Style for piece `i` of `n` in a staggered (words / letters) animation. */
export function pieceAnimStyle(p: number, i: number, n: number): CSSProperties | undefined {
  if (p >= 1) return undefined;
  const spread = n > 1 ? 0.6 : 0; // first piece starts at 0, last at 60% of the animation
  const start = n > 1 ? (i / (n - 1)) * spread : 0;
  const local = clamp01((p - start) / (1 - spread));
  if (local >= 1) return undefined;
  const e = easeOutCubic(local);
  return { opacity: e, translate: `0 ${(1 - e) * 0.45}em`, filter: local < 1 ? `blur(${(1 - e) * 0.12}em)` : undefined };
}

/** How many code points of `content` a typewriter shows at progress p. */
export function typewriterCount(content: string, p: number): number {
  return Math.round(Array.from(content).length * clamp01(p));
}

/** Split for staggered animations: words keep their whitespace as separate unanimated tokens. */
export function splitPieces(content: string, mode: "words" | "letters"): { text: string; animated: boolean }[] {
  if (mode === "words") {
    return content
      .split(/(\s+)/)
      .filter((t) => t.length > 0)
      .map((t) => ({ text: t, animated: !/^\s+$/.test(t) }));
  }
  return Array.from(content).map((ch) => ({ text: ch, animated: !/\s/.test(ch) }));
}
