"use client";

import { create } from "zustand";
import type { SceneDocument } from "@framekit/scene";
import { ingestFile, resolveAsset } from "./assets";
import { makeTemplateScene, type TemplateMeta } from "./screenTemplates";
import { clearTemplateShots, loadTemplateShots, saveTemplateShots, SHOTS_CHANNEL, TAB_ID } from "./handoff";
import { fillScenes, MAX_SHOTS, takesShots, type MyShot } from "./templateShots";

/**
 * The screenshots the template gallery previews every template with, shared
 * by the gallery, the collection pages and the editor pages they open.
 * Stored in IndexedDB (lib/handoff.ts) and registered as ordinary uploaded
 * assets, so a template opened with them exports like any other upload.
 */

export interface MyShotAsset extends MyShot {
  url: string;
  name: string;
}

interface MyShotsState {
  status: "idle" | "loading" | "ready";
  shots: MyShotAsset[];
}

export const useMyShots = create<MyShotsState>(() => ({ status: "idle", shots: [] }));

const sizeOf = (id: string) => resolveAsset(id);

async function ingestAll(files: File[]): Promise<MyShotAsset[]> {
  const out: MyShotAsset[] = [];
  for (const file of files.slice(0, MAX_SHOTS)) {
    try {
      const a = await ingestFile(file);
      out.push({ assetId: a.id, width: a.width, height: a.height, url: a.url, name: a.name });
    } catch {
      // skip files that aren't readable images
    }
  }
  return out;
}

let loading: Promise<MyShotAsset[]> | null = null;

/** Load the saved screenshots once (later calls reuse them). */
export function ensureMyShots(): Promise<MyShotAsset[]> {
  const st = useMyShots.getState();
  if (st.status === "ready") return Promise.resolve(st.shots);
  if (!loading) {
    useMyShots.setState({ status: "loading" });
    loading = loadTemplateShots()
      .then(ingestAll)
      .then((shots) => {
        useMyShots.setState({ status: "ready", shots });
        return shots;
      })
      .finally(() => {
        loading = null;
      });
  }
  return loading;
}

// another tab (the editor's Templates link, or a second gallery) changed them
if (typeof window !== "undefined" && typeof BroadcastChannel !== "undefined") {
  const ch = new BroadcastChannel(SHOTS_CHANNEL);
  ch.onmessage = (e: MessageEvent<{ tab?: string }>) => {
    if (e.data?.tab === TAB_ID) return;
    useMyShots.setState({ status: "idle" });
    void ensureMyShots();
  };
}

/** Use `files` as the preview screenshots. Resolves with how many were usable. */
export async function setMyShots(files: File[]): Promise<number> {
  const images = files.filter((f) => f.type.startsWith("image/")).slice(0, MAX_SHOTS);
  const shots = await ingestAll(images);
  if (!shots.length) return 0;
  useMyShots.setState({ status: "ready", shots });
  // still works for this visit when the browser blocks storage
  await saveTemplateShots(images).catch(() => {});
  return shots.length;
}

export async function clearMyShots(): Promise<void> {
  useMyShots.setState({ status: "ready", shots: [] });
  await clearTemplateShots().catch(() => {});
}

/**
 * Save the screenshots a scene (or a whole shot batch) uses, so the template
 * gallery opened from the editor shows them. Leaves the saved set alone when
 * there are none.
 */
export async function shareSceneShots(scenes: SceneDocument[]): Promise<void> {
  const ids = new Set<string>();
  for (const scene of scenes) {
    for (const layer of scene.layers) {
      const id = layer.type === "mockup" && !layer.render ? layer.media?.assetId : undefined;
      if (id && !id.includes(":") && layer.type === "mockup" && layer.media?.kind === "image") ids.add(id);
    }
  }
  const files: File[] = [];
  for (const id of [...ids].slice(0, MAX_SHOTS)) {
    const asset = resolveAsset(id);
    if (!asset?.url) continue;
    try {
      const blob = await (await fetch(asset.url)).blob();
      if (blob.type.startsWith("image/")) files.push(new File([blob], asset.name || "screenshot.png", { type: blob.type }));
    } catch {
      // an expired or cross-origin URL: skip that one
    }
  }
  if (!files.length) return;
  await saveTemplateShots(files).catch(() => {});
}

/** `scenes` with the saved screenshots in their slots (loads them if needed). */
export async function fillWithMyShots(scenes: SceneDocument[]): Promise<{ scenes: SceneDocument[]; filled: number }> {
  const shots = await ensureMyShots();
  return shots.length ? fillScenes(scenes, shots, sizeOf) : { scenes, filled: 0 };
}

export function previewWithShots(scenes: SceneDocument[], shots: MyShot[]): SceneDocument[] | null {
  if (!takesShots(scenes, shots, sizeOf)) return null;
  return fillScenes(scenes, shots, sizeOf).scenes;
}

/** A photo-scene template with your screenshot on its screen, on a clear
 *  background for gallery cards. Null when none of yours fits its screen. */
export function sceneTemplateWithShots(meta: TemplateMeta, shots: MyShot[]): SceneDocument | null {
  if (!meta.deviceId || !shots.length) return null;
  const scene = makeTemplateScene(meta);
  const filled = previewWithShots([{ ...scene, canvas: { ...scene.canvas, background: { type: "transparent" } } }], shots);
  return filled?.[0] ?? null;
}
