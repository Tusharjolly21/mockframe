"use client";

/**
 * Fictional-recreation disclosure (user request): an optional label baked into
 * export PIXELS — images, video, and GIF — marking synthetic chat content as a
 * dramatization. Metadata can be stripped; pixels can't. Deliberately FREE for
 * everyone: a safety feature that protects legitimate creators and blunts
 * impersonation misuse should never sit behind a paywall.
 */

export interface DisclosureCfg {
  enabled: boolean;
  /** one of PRESET texts, or anything custom */
  text: string;
  position: "top" | "bottom";
}

export const DISCLOSURE_PRESETS = [
  "Dramatization — not a real conversation",
  "Fictional recreation",
  "Parody — not affiliated with the app shown",
  "Simulated screenshot for illustration",
] as const;

export const DEFAULT_DISCLOSURE: DisclosureCfg = {
  enabled: false,
  text: DISCLOSURE_PRESETS[0],
  position: "bottom",
};

const LS_KEY = "mockframe:disclosure";

export function loadDisclosure(): DisclosureCfg {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...DEFAULT_DISCLOSURE };
    return { ...DEFAULT_DISCLOSURE, ...(JSON.parse(raw) as Partial<DisclosureCfg>) };
  } catch {
    return { ...DEFAULT_DISCLOSURE };
  }
}

export function saveDisclosure(cfg: DisclosureCfg): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(cfg));
  } catch {
    /* quota */
  }
}

/** Draw the disclosure pill onto a frame/canvas — small, legible, unobtrusive. */
export function drawDisclosure(ctx: CanvasRenderingContext2D, w: number, h: number, cfg: DisclosureCfg): void {
  const text = cfg.text.trim();
  if (!cfg.enabled || !text) return;
  const fs = Math.max(11, Math.round(Math.min(w, h) * 0.016));
  ctx.save();
  ctx.font = `600 ${fs}px Inter, system-ui, sans-serif`;
  ctx.textBaseline = "middle";
  ctx.textAlign = "center";
  const padX = fs * 0.9;
  const padY = fs * 0.45;
  const tw = ctx.measureText(text).width;
  const bw = tw + padX * 2;
  const bh = fs + padY * 2;
  const bx = (w - bw) / 2;
  const margin = Math.round(Math.min(w, h) * 0.02);
  const by = cfg.position === "top" ? margin : h - margin - bh;
  ctx.fillStyle = "rgba(15,16,22,0.6)";
  ctx.beginPath();
  ctx.roundRect(bx, by, bw, bh, bh / 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255,255,255,0.94)";
  ctx.fillText(text, w / 2, by + bh / 2 + fs * 0.05);
  ctx.restore();
}
