import type { Background } from "@framekit/scene";
import type { PackStyleId } from "./schema";

/** Blend two #rrggbb colors; t=0 → a, t=1 → b. */
export function mixHex(a: string, b: string, t: number): string {
  const pa = a.replace("#", "");
  const pb = b.replace("#", "");
  const ch = (i: number) => {
    const va = parseInt(pa.slice(i, i + 2), 16);
    const vb = parseInt(pb.slice(i, i + 2), 16);
    return Math.round(va + (vb - va) * t)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${ch(0)}${ch(2)}${ch(4)}`;
}

export interface PackDeviceLayout {
  /** device center offset as a fraction of canvas width (x) / height (y).
   *  yFrac is measured toward the side OPPOSITE the caption block. */
  xFrac: number;
  yFrac: number;
  /** device frame height as a fraction of canvas height */
  heightFrac: number;
  rotate: number;
}

export interface PackStyle {
  id: PackStyleId;
  label: string;
  /** one background image flows across all screens of a target */
  panorama?: boolean;
  captionColor: string;
  subtitleColor: string;
  /** highlight pill behind the title (glass style) */
  captionHighlight?: string;
  /** multiplies the default title font size */
  titleScale?: number;
  background: (accent: string) => Background;
  device: (index: number, total: number) => PackDeviceLayout;
}

const straight = (heightFrac: number, yFrac = 0.13): PackStyle["device"] => () => ({
  xFrac: 0,
  yFrac,
  heightFrac,
  rotate: 0,
});

export const PACK_STYLES: Record<PackStyleId, PackStyle> = {
  "minimal-light": {
    id: "minimal-light",
    label: "Minimal Light",
    captionColor: "#111114",
    subtitleColor: "#63636e",
    background: () => ({ type: "solid", color: "#f4f4f5" }),
    device: straight(0.64),
  },
  "bold-gradient": {
    id: "bold-gradient",
    label: "Bold Gradient",
    captionColor: "#ffffff",
    subtitleColor: "rgba(255,255,255,0.72)",
    background: (accent) => ({
      type: "linear-gradient",
      angle: 160,
      stops: [
        { at: 0, color: mixHex(accent, "#ffffff", 0.15) },
        { at: 1, color: mixHex(accent, "#000000", 0.45) },
      ],
    }),
    device: straight(0.64),
  },
  "panorama-flow": {
    id: "panorama-flow",
    label: "Panorama Flow",
    panorama: true,
    captionColor: "#ffffff",
    subtitleColor: "rgba(255,255,255,0.72)",
    background: (accent) => ({
      type: "mesh-gradient",
      seed: 11,
      colors: [accent, mixHex(accent, "#ffffff", 0.35), "#1e1b4b", mixHex(accent, "#000000", 0.55)],
    }),
    device: straight(0.62),
  },
  "tilted-rhythm": {
    id: "tilted-rhythm",
    label: "Tilted Rhythm",
    captionColor: "#ffffff",
    subtitleColor: "rgba(255,255,255,0.68)",
    background: (accent) => ({ type: "solid", color: mixHex(accent, "#000000", 0.82) }),
    device: (index) => ({
      xFrac: index % 2 === 0 ? -0.02 : 0.02,
      yFrac: 0.14,
      heightFrac: 0.66,
      rotate: index % 2 === 0 ? -7 : 7,
    }),
  },
  "dark-pro": {
    id: "dark-pro",
    label: "Dark Pro",
    captionColor: "#f5f5f7",
    subtitleColor: "rgba(245,245,247,0.6)",
    background: (accent) => ({
      type: "radial-gradient",
      cx: 0.5,
      cy: 0.22,
      stops: [
        { at: 0, color: mixHex(accent, "#000000", 0.55) },
        { at: 1, color: "#0b0b0f" },
      ],
    }),
    device: straight(0.62),
  },
  glass: {
    id: "glass",
    label: "Glass",
    captionColor: "#16161a",
    subtitleColor: "rgba(22,22,26,0.62)",
    captionHighlight: "rgba(255,255,255,0.55)",
    background: (accent) => ({
      type: "linear-gradient",
      angle: 135,
      stops: [
        { at: 0, color: mixHex(accent, "#ffffff", 0.62) },
        { at: 1, color: mixHex(accent, "#ffffff", 0.18) },
      ],
    }),
    device: straight(0.62),
  },
  "accent-split": {
    id: "accent-split",
    label: "Accent Split",
    captionColor: "#ffffff",
    subtitleColor: "rgba(255,255,255,0.75)",
    background: (accent) => ({ type: "solid", color: accent }),
    device: straight(0.58, 0.16),
  },
  "screenshot-first": {
    id: "screenshot-first",
    label: "Screenshot First",
    captionColor: "#16161a",
    subtitleColor: "rgba(22,22,26,0.6)",
    titleScale: 0.8,
    background: (accent) => ({ type: "solid", color: mixHex(accent, "#ffffff", 0.88) }),
    device: straight(0.95, 0.25),
  },
};
