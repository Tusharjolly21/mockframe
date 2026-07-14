"use client";

import { toCanvas } from "html-to-image";
import { drawDisclosure, loadDisclosure } from "./disclosure";
import { applyPalette, GIFEncoder, quantize } from "gifenc";
import type { AnimShot } from "@/lib/screens";

/**
 * GIF export of the chat-replay animation — the same shot plan as the WebM
 * exporter (typing beat → reply reveal), encoded as an animated GIF so it drops
 * straight into Slack, GitHub, docs, and anywhere WebM won't play.
 *
 * GIF is a stepped format (256-color, no real alpha), so we skip the video's
 * crossfades and instead hold each shot's frame for its full duration, cycling
 * the typing dots during typing beats. Frames are downscaled (GIFs balloon fast)
 * and quantized per-frame.
 */

export interface GifExportOpts {
  node: HTMLElement;
  plan: AnimShot[];
  canvasW: number;
  renderState: (s: { k: number; typing: boolean; dotPhase: number; settled: boolean }) => void;
  restore: () => void;
  onProgress?: (fraction: number, label: string) => void;
  /** GIFs are heavy — cap the width hard (default 460px) */
  maxWidth?: number;
}

const settle = () => new Promise<void>((r) => requestAnimationFrame(() => setTimeout(r, 45)));
const keyOf = (k: number, typing: boolean, phase: number, settled: boolean) =>
  `${k}|${typing ? "t" + phase : settled ? "rs" : "r"}`;

export async function exportSceneGif(o: GifExportOpts): Promise<void> {
  const { node, plan, renderState, restore, onProgress } = o;
  if (!plan.length) throw new Error("Nothing to animate");

  const scale = Math.min(1, (o.maxWidth ?? 460) / o.canvasW);
  const W = Math.round(o.canvasW * scale);
  const H = Math.round((node.clientHeight / node.clientWidth) * W);

  /* the ordered frame list (typing beats expand into dot-cycle frames) */
  const DOT_MS = 320;
  const frames: { key: string; k: number; typing: boolean; phase: number; settled: boolean; delay: number }[] = [];
  for (const s of plan) {
    if (s.typing) {
      const cycles = Math.max(1, Math.round(s.holdMs / DOT_MS));
      for (let p = 0; p < cycles; p++)
        frames.push({ key: keyOf(s.k, true, p % 3, false), k: s.k, typing: true, phase: p % 3, settled: false, delay: DOT_MS });
    } else {
      frames.push({
        key: keyOf(s.k, false, 0, !!s.settled),
        k: s.k,
        typing: false,
        phase: 0,
        settled: !!s.settled,
        delay: Math.round(s.holdMs + s.fadeMs),
      });
    }
  }

  const disclosureCfg = loadDisclosure();
  /* 1 — pre-render each UNIQUE state once */
  const unique = new Map<string, (typeof frames)[number]>();
  for (const f of frames) if (!unique.has(f.key)) unique.set(f.key, f);
  const bitmaps = new Map<string, Uint8ClampedArray>();
  const uniqueList = [...unique.values()];
  try {
    for (let i = 0; i < uniqueList.length; i++) {
      const st = uniqueList[i];
      renderState({ k: st.k, typing: st.typing, dotPhase: st.phase, settled: st.settled });
      await settle();
      const cvs = await toCanvas(node, { pixelRatio: 1, canvasWidth: W, canvasHeight: H, style: { transform: "none" } });
      const ctx = cvs.getContext("2d")!;
      drawDisclosure(ctx, cvs.width, cvs.height, disclosureCfg);
      bitmaps.set(st.key, ctx.getImageData(0, 0, cvs.width, cvs.height).data);
      onProgress?.(((i + 1) / uniqueList.length) * 0.6, `Rendering ${i + 1}/${uniqueList.length}`);
    }
  } finally {
    restore();
  }

  /* 2 — encode */
  const gif = GIFEncoder();
  for (let i = 0; i < frames.length; i++) {
    const data = bitmaps.get(frames[i].key)!;
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    gif.writeFrame(index, W, H, { palette, delay: frames[i].delay });
    onProgress?.(0.6 + 0.4 * ((i + 1) / frames.length), "Encoding GIF…");
    if (i % 4 === 0) await new Promise((r) => setTimeout(r, 0)); // keep the UI alive
  }
  gif.finish();

  const blob = new Blob([gif.bytes() as BlobPart], { type: "image/gif" });
  if (!blob.size) throw new Error("Encoding produced no data");
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `mockframe-${W}x${H}.gif`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
