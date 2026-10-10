import type { FC } from "react";
import { rgba } from "./theme";

/** Shared colour + staging helpers for the multi-device spots. */

/** Lighten (+) or darken (−) a #rrggbb colour by mixing with white/black. */
export function shade(hex: string, amt: number): string {
  const m = /^#?([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m) return hex;
  const n = parseInt(m[1], 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = amt >= 0 ? c + (255 - c) * amt : c * (1 + amt);
    return Math.round(Math.max(0, Math.min(255, v)));
  });
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** A soft reflective floor: a gradient plane with a horizon highlight. */
export const StudioFloor: FC<{ accent: string; horizon?: number; tint?: string }> = ({ accent, horizon = 0.66, tint = "#0b0b12" }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top: `${horizon * 100}%`,
      bottom: 0,
      background: `linear-gradient(180deg, ${rgba(accent, 0.1)} 0%, ${rgba(tint, 0.55)} 30%, ${rgba(tint, 0.9)} 100%)`,
      borderTop: `1px solid ${rgba("#ffffff", 0.08)}`,
      boxShadow: `0 -${40}px 120px ${rgba(accent, 0.12)}`,
      pointerEvents: "none",
    }}
  />
);
