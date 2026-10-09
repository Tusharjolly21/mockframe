/**
 * Background motion for animations: "live" backgrounds (a slow drift, a hue
 * shift, a gentle breathe) and the background half of the parallax preset.
 *
 * The renderer's background layer reads --fk-bg-x / --fk-bg-y / --fk-bg-scale
 * / --fk-bg-hue from the scene element (packages/renderer SceneRenderer), so
 * preview and export set those variables per frame and clear them after —
 * the scene document is never edited. Every curve here is periodic, so loops
 * stay seamless.
 */

export const LIVE_BACKGROUNDS = [
  { id: "off", label: "Off", hint: "Background stays still" },
  { id: "drift", label: "Drift", hint: "Slow pan around the frame" },
  { id: "hue", label: "Hue", hint: "Colours shift through the spectrum" },
  { id: "breathe", label: "Breathe", hint: "Gentle zoom in and out" },
] as const;

export type LiveBackground = (typeof LIVE_BACKGROUNDS)[number]["id"];

export interface BgMotion {
  /** px, canvas coordinates */
  x: number;
  y: number;
  scale: number;
  /** degrees */
  hue: number;
}

export const BG_REST: BgMotion = { x: 0, y: 0, scale: 1, hue: 0 };

const TAU = Math.PI * 2;

/**
 * The live background at clip progress t (0..1). Movement always comes with
 * enough overscale that the background's edges never show.
 */
export function liveBackgroundAt(live: LiveBackground, t: number, W: number, H: number): BgMotion {
  switch (live) {
    case "drift": {
      // a figure-eight that starts and ends at rest, with a constant overscale
      // big enough for its widest point (so the scale itself never pulses)
      const ax = W * 0.025;
      const ay = H * 0.02;
      return { x: Math.sin(t * TAU) * ax, y: Math.sin(2 * t * TAU) * ay, scale: coverScale({ ...BG_REST, x: ax, y: ay }, W, H).scale, hue: 0 };
    }
    case "hue":
      return { ...BG_REST, hue: Math.sin(t * TAU) * 28 };
    case "breathe":
      return { ...BG_REST, scale: 1.04 - 0.04 * Math.cos(t * TAU) };
    default:
      return BG_REST;
  }
}

/** Two background motions on top of each other (e.g. parallax + live): offsets add, scales multiply. */
export function combineBg(a: BgMotion, b: BgMotion): BgMotion {
  return { x: a.x + b.x, y: a.y + b.y, scale: a.scale * b.scale, hue: a.hue + b.hue };
}

/**
 * Overscale needed so an offset of (x, y) never uncovers the canvas edge:
 * a layer scaled by s about its centre overhangs each side by (s-1)/2 of its size.
 */
export function coverScale(m: BgMotion, W: number, H: number): BgMotion {
  const need = 1 + 2 * Math.max(Math.abs(m.x) / W, Math.abs(m.y) / H);
  return need > m.scale ? { ...m, scale: need } : m;
}

export function applyBgMotion(node: HTMLElement | null, m: BgMotion): void {
  if (!node) return;
  node.style.setProperty("--fk-bg-x", `${m.x.toFixed(2)}px`);
  node.style.setProperty("--fk-bg-y", `${m.y.toFixed(2)}px`);
  node.style.setProperty("--fk-bg-scale", m.scale.toFixed(4));
  node.style.setProperty("--fk-bg-hue", `${m.hue.toFixed(2)}deg`);
}

export function clearBgMotion(node: HTMLElement | null): void {
  if (!node) return;
  for (const v of ["--fk-bg-x", "--fk-bg-y", "--fk-bg-scale", "--fk-bg-hue"]) node.style.removeProperty(v);
}

const KEY = "mockframe:live-background";
/** fired on window when the live-background choice changes */
export const LIVE_BACKGROUND_EVENT = "mockframe:live-background";

/** Choose the live background everywhere (Motion and Zoom tabs follow it). */
export function setLiveBackground(v: LiveBackground): void {
  saveLiveBackground(v);
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent(LIVE_BACKGROUND_EVENT));
}

export function loadLiveBackground(): LiveBackground {
  try {
    const v = localStorage.getItem(KEY);
    return LIVE_BACKGROUNDS.some((b) => b.id === v) ? (v as LiveBackground) : "off";
  } catch {
    return "off";
  }
}

export function saveLiveBackground(v: LiveBackground): void {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* storage unavailable */
  }
}

/**
 * The background's full pose at clip progress t: the chosen live background,
 * plus any background move the clip itself makes (parallax), with overscale
 * so edges stay covered. `extra` is in fractions of the canvas size.
 */
export function backgroundPose(live: LiveBackground, t: number, W: number, H: number, extra?: { x: number; y: number }): BgMotion {
  let m = liveBackgroundAt(live, t, W, H);
  if (extra) m = combineBg(m, { x: extra.x * W, y: extra.y * H, scale: 1, hue: 0 });
  return coverScale(m, W, H);
}

export const isRest = (m: BgMotion) => m.x === 0 && m.y === 0 && m.scale === 1 && m.hue === 0;
