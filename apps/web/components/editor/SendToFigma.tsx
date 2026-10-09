"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, Figma, Loader2 } from "lucide-react";
import type { SceneDocument } from "@framekit/scene";
import { track } from "@/lib/analytics";
import { guardProScreens } from "@/lib/billing/screenGate";
import { renderSceneToPng } from "@/lib/bulkExport";
import { FIGMA_MAX_FRAME_BYTES, FIGMA_MAX_RESULTS, assignSlots, figmaScale } from "@/lib/figmaImport";
import { fitImage } from "@/lib/fitImage";
import { useShotBatchStore } from "@/lib/shotBatch";
import { useSceneStore, useViewStore } from "@/lib/store";
import { toast } from "./Toolbar";

// shot id → result slot, per import, so sending again updates the same frames in Figma
const slotsByImport = new Map<string, Record<string, number>>();

/** One shot as an image Figma can hold: 2x when it fits, under the upload limit. */
async function renderForFigma(scene: SceneDocument, index: number, total: number, watermark: boolean) {
  const scale = figmaScale(scene.canvas.width, scene.canvas.height);
  const png = await renderSceneToPng(scene, scale, watermark, index, total);
  if (png.length <= FIGMA_MAX_FRAME_BYTES) return { body: new Blob([png as BlobPart], { type: "image/png" }), scale };
  const bitmap = await createImageBitmap(new Blob([png as BlobPart], { type: "image/png" }));
  try {
    const fit = await fitImage(bitmap, FIGMA_MAX_FRAME_BYTES);
    return { body: fit.blob, scale: scale * fit.scale };
  } finally {
    bitmap.close();
  }
}

/**
 * "Send to Figma", shown when the editor was opened from the Figma plugin:
 * renders every shot in the batch and hands them to the plugin, which places
 * them on the Figma page (and swaps the images when they're sent again).
 */
export function SendToFigma({ importId }: { importId: string }) {
  const count = useShotBatchStore((s) => Math.max(1, Math.min(FIGMA_MAX_RESULTS, s.shots.length)));
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [sent, setSent] = useState(false);

  const send = async () => {
    if (progress) return;
    const current = useSceneStore.getState().scene;
    const batch = useShotBatchStore.getState();
    batch.syncActive(current);
    const all = useShotBatchStore.getState().shots;
    const shots = (all.length ? all : [{ id: current.id, name: "Mockup", scene: current }]).slice(0, FIGMA_MAX_RESULTS);
    const isPro = useViewStore.getState().removeWatermark;
    // the same gate as exporting: Pro templates and chat screens need Pro
    if (!guardProScreens(shots.map((s) => s.scene), isPro)) return;

    const slots = assignSlots(slotsByImport.get(importId) ?? {}, shots.map((s) => s.id));
    slotsByImport.set(importId, slots);
    setProgress({ done: 0, total: shots.length });
    try {
      for (const [i, shot] of shots.entries()) {
        const { body, scale } = await renderForFigma(shot.scene, i, shots.length, !isPro);
        const query = new URLSearchParams({ name: shot.name, scale: String(scale) });
        const res = await fetch(`/api/figma-import/${encodeURIComponent(importId)}/results/${slots[shot.id]}?${query}`, { method: "PUT", body });
        if (!res.ok) {
          const j = (await res.json().catch(() => null)) as { error?: string } | null;
          throw new Error(j?.error ?? `Sending “${shot.name}” failed (${res.status})`);
        }
        setProgress({ done: i + 1, total: shots.length });
      }
      track("figma_sent_back", { shots: shots.length });
      if (all.length > FIGMA_MAX_RESULTS) toast(`Sent the first ${FIGMA_MAX_RESULTS} shots to Figma`);
      else toast(shots.length === 1 ? "Sent to Figma. It lands on your page while the plugin is open." : `Sent ${shots.length} shots to Figma. They land on your page while the plugin is open.`);
      setSent(true);
      setTimeout(() => setSent(false), 2400);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Sending to Figma failed. Try again.");
    } finally {
      setProgress(null);
    }
  };

  return (
    <motion.button
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      onClick={send}
      disabled={!!progress}
      aria-live="polite"
      title="Render every shot and place it in your Figma file (keep the plugin open)"
      className="fk-card pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2.5 text-[13px] font-semibold text-[#17171c] disabled:cursor-default"
    >
      {progress ? <Loader2 size={15} className="animate-spin text-violet-600" /> : sent ? <Check size={15} className="text-emerald-600" /> : <Figma size={15} className="text-violet-600" />}
      {progress ? `Sending ${Math.min(progress.done + 1, progress.total)} of ${progress.total}…` : sent ? "Sent to Figma" : "Send to Figma"}
      {!progress && !sent && count > 1 && <span className="text-[11px] font-medium text-[#8a8a94]">{count} shots</span>}
    </motion.button>
  );
}
