"use client";

import { create } from "zustand";
import { AnimatePresence, motion } from "motion/react";
import { GalleryVerticalEnd } from "lucide-react";
import { createId, type MockupLayer, type SceneDocument } from "@framekit/scene";
import { track } from "@/lib/analytics";
import { ingestGenerated, resolveAsset } from "@/lib/assets";
import { renderSceneToPng } from "@/lib/bulkExport";
import { extractPalette } from "@/lib/palette";
import { useShotBatchStore, type BatchShot } from "@/lib/shotBatch";
import {
  POSTER_TILES,
  showcaseBeforeAfter,
  showcasePoster,
  showcaseShots,
  type ShowcaseImage,
  type ShowcaseTile,
} from "@/lib/showcase";
import { sceneTemporal, useSceneStore, useViewStore } from "@/lib/store";
import { toast } from "./Toolbar";

/**
 * Showcase: one screenshot becomes a finished set in the shot strip: the
 * "One screenshot. Four finished shots." poster, a before / after post, a
 * headline promo and three photo scenes. Every shot opens in the editor.
 */

type Slot = { name: string; url: string | null };

const useShowcaseUi = create<{ running: boolean; slots: Slot[] }>(() => ({ running: false, slots: [] }));

const SLOT_NAMES = ["Photo", "Headline", "Photo", "Photo", "Poster", "Before / after"];

/** The screenshot to build from: a device's screen first, else a frameless shot. */
function heroImage(scene: SceneDocument): ShowcaseImage | null {
  const mockups = scene.layers.filter((l): l is MockupLayer => l.type === "mockup" && !!l.media && l.media.kind === "image");
  const hero = mockups.find((m) => m.deviceId && !m.render) ?? mockups[0];
  const asset = hero?.media ? resolveAsset(hero.render ? hero.render.sourceAssetId : hero.media.assetId) : undefined;
  if (!hero?.media || !asset) return null;
  return { assetId: asset.id, width: asset.width, height: asset.height, name: asset.name };
}

export function canShowcase(scene: SceneDocument) {
  return !!heroImage(scene);
}

async function toJpeg(png: Uint8Array): Promise<{ url: string; width: number; height: number }> {
  const bitmap = await createImageBitmap(new Blob([png as BlobPart], { type: "image/png" }));
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0);
  bitmap.close();
  return { url: canvas.toDataURL("image/jpeg", 0.9), width: canvas.width, height: canvas.height };
}

const setSlot = (i: number, url: string) =>
  useShowcaseUi.setState((s) => ({ slots: s.slots.map((slot, j) => (j === i ? { ...slot, url } : slot)) }));

/** Build the set from the screenshot on the canvas and open its poster. */
export async function makeShowcase(via: "pill" | "starter" | "figma" = "pill") {
  if (useShowcaseUi.getState().running) return;
  const current = useSceneStore.getState().scene;
  const raw = heroImage(current);
  if (!raw) {
    toast("Add a screenshot first, then make a showcase");
    return;
  }
  track("showcase_started", { via });
  useShowcaseUi.setState({ running: true, slots: SLOT_NAMES.map((name) => ({ name, url: null })) });
  try {
    const rawUrl = resolveAsset(raw.assetId)?.url;
    const palette = rawUrl ? await extractPalette(rawUrl).catch(() => []) : [];
    const shots = showcaseShots(raw, palette);
    useShowcaseUi.setState({ slots: [...shots.map((s) => s.name), "Poster", "Before / after"].map((name) => ({ name, url: null })) });

    // the poster crops each shot into a rounded tile, so it needs them flat:
    // render each at about twice its tile size (crisp at a 2x export)
    const tiles: ShowcaseTile[] = [];
    for (let i = 0; i < shots.length; i++) {
      const shot = shots[i];
      const box = POSTER_TILES[i];
      const { width: W, height: H } = shot.scene.canvas;
      const scale = Math.min(1, 2 * Math.max(box.w / W, box.h / H));
      const png = await renderSceneToPng(shot.scene, scale, false);
      const jpeg = await toJpeg(png);
      const asset = ingestGenerated(`showcase-${shot.key}.jpg`, jpeg.url, jpeg.width, jpeg.height);
      tiles.push({ shot, image: { assetId: asset.id, width: asset.width, height: asset.height } });
      setSlot(i, jpeg.url);
    }

    const poster = showcasePoster(raw, tiles);
    const beforeAfter = showcaseBeforeAfter(raw, palette);
    for (const [i, scene] of [poster, beforeAfter].entries()) {
      const png = await renderSceneToPng(scene, 0.4, false);
      setSlot(shots.length + i, (await toJpeg(png)).url);
    }

    const made: BatchShot[] = [
      { id: createId(), name: "Showcase poster", scene: poster },
      { id: createId(), name: "Before / after", scene: beforeAfter },
      ...shots.map((s) => ({ id: createId(), name: s.name, scene: s.scene })),
    ];
    const batch = useShotBatchStore.getState();
    batch.ensure(current);
    batch.syncActive(current);
    useShotBatchStore.setState((s) => ({ shots: [...s.shots, ...made], activeId: made[0].id }));
    useSceneStore.setState({ scene: poster });
    sceneTemporal.getState().clear();
    const view = useViewStore.getState();
    view.select(null);
    view.setActiveLayout(null);
    view.bumpAssets();
    window.dispatchEvent(new CustomEvent("framekit:fit"));
    track("showcase_made", { via, shots: made.length });
    toast(`Showcase ready: ${made.length} shots in the strip below. Click any one to edit it.`);
  } catch (error) {
    toast(`Showcase failed: ${(error as Error).message}`);
  } finally {
    // hold the finished grid a beat so the last tiles are seen landing
    setTimeout(() => useShowcaseUi.setState({ running: false }), 450);
  }
}

/** The "Showcase" pill beside Make it pretty. */
export function ShowcaseButton() {
  const running = useShowcaseUi((s) => s.running);
  const ready = useSceneStore((s) => canShowcase(s.scene));
  return (
    <motion.button
      whileHover={{ scale: 1.04 }}
      whileTap={{ scale: 0.96 }}
      onClick={() => (ready ? makeShowcase("pill") : toast("Add a screenshot first, then make a showcase"))}
      disabled={running}
      title="Showcase: turn this screenshot into a poster, a before / after and four finished shots"
      className="fk-card pointer-events-auto flex cursor-pointer items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-semibold text-[#17171c] disabled:opacity-60"
    >
      <GalleryVerticalEnd size={15} className="text-violet-600" />
      Showcase
    </motion.button>
  );
}

/** Full-screen progress while the set is built: six slots fill in as each shot lands. */
export function ShowcaseProgress() {
  const { running, slots } = useShowcaseUi();
  const done = slots.filter((s) => s.url).length;
  return (
    <AnimatePresence>
      {running && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[80] flex items-center justify-center bg-[#0b0b0e]/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-label="Building your showcase"
          aria-busy="true"
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="w-[min(640px,94vw)] rounded-2xl bg-white p-6 shadow-[0_40px_120px_rgba(0,0,0,0.35)]"
          >
            <h2 className="text-[20px] font-semibold tracking-[-0.02em] text-[#17171c]">Building your showcase</h2>
            <p className="mt-1 text-[13px] text-[#6b6b76]">
              {done < slots.length ? `Finishing shot ${done + 1} of ${slots.length}` : "Opening the poster"}
            </p>
            <div className="mt-5 grid grid-cols-3 gap-3">
              {slots.map((slot, i) => (
                <figure key={i} className="min-w-0">
                  <div className="relative aspect-[4/3] overflow-hidden rounded-xl bg-[#f1f1f5]">
                    {slot.url ? (
                      <motion.img
                        initial={{ opacity: 0, scale: 1.04 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.35 }}
                        src={slot.url}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="h-full w-full animate-pulse bg-[#ececf2]" />
                    )}
                  </div>
                  <figcaption className="mt-1.5 truncate text-[12px] font-medium text-[#3b3b45]">{slot.name}</figcaption>
                </figure>
              ))}
            </div>
            <div className="mt-5 h-1 overflow-hidden rounded-full bg-[#ececf2]">
              <motion.div className="h-full rounded-full bg-violet-600" animate={{ width: `${(done / Math.max(1, slots.length)) * 100}%` }} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
