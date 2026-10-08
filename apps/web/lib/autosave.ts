"use client";

import { createId, type SceneDocument } from "@framekit/scene";
import { collectAssets } from "./assets";
import {
  captureThumbnail,
  defaultDraftName,
  openDraft,
  persistDraft,
  sceneAssetIds,
  useDraftsUi,
  type DraftRecord,
} from "./drafts";
import { sceneTemporal, useSceneStore, useViewStore } from "./store";

/**
 * Editor autosave. Every edit is written to the current draft in IndexedDB
 * shortly after the user pauses, and mirrored to the cloud at most every
 * CLOUD_EVERY ms, so closing the tab never loses more than the last moment of
 * work. The first real edit on a fresh canvas creates a draft; after that the
 * same draft is updated in place (the same record ⌘S writes to).
 *
 * "Real edit" matters: a fresh editor, a deep-linked device, a reset canvas or
 * a freshly opened draft are baselines and are never saved on their own.
 */

const LOCAL_DELAY = 1200;
const CLOUD_EVERY = 30_000;

export function startAutosave(): () => void {
  // the scene the canvas was last pointed at (fresh, loaded, reset)
  let baseline: SceneDocument = useSceneStore.getState().scene;
  // the scene object last written to storage since that baseline
  let saved: SceneDocument | null = null;
  let lastRecord: DraftRecord | null = null;
  let thumbFor: string | null = null;
  let thumbnail: string | undefined;
  let lastCloudAt = 0;
  let localTimer: ReturnType<typeof setTimeout> | null = null;
  let cloudTimer: ReturnType<typeof setTimeout> | null = null;
  let selfUpdate = false;
  let chain: Promise<void> = Promise.resolve();

  const ui = () => useDraftsUi.getState();

  function shouldSave(scene: SceneDocument): boolean {
    if (scene === saved) return false;
    if (scene === baseline && saved === null) return false;
    // nothing done on a canvas that isn't a draft yet: don't create one
    if (!ui().currentId && sceneTemporal.getState().pastStates.length === 0) return false;
    return true;
  }

  async function writeLocal({ withThumbnail }: { withThumbnail: boolean }) {
    const scene = useSceneStore.getState().scene;
    if (!shouldSave(scene)) return;
    const { currentId, currentName, epoch } = ui();
    const id = currentId ?? createId();
    const name = currentName ?? defaultDraftName();
    ui().setSaveState("saving");
    try {
      if (withThumbnail && thumbFor !== id) {
        thumbnail = await captureThumbnail(scene);
        thumbFor = id;
      }
      const record: DraftRecord = {
        id,
        name,
        kind: "scene",
        updatedAt: Date.now(),
        scene,
        assets: collectAssets(sceneAssetIds(scene)),
        thumbnail: thumbFor === id ? thumbnail : undefined,
      };
      await persistDraft(record, { cloud: false });
      // the user opened another draft or reset while this was writing: the
      // write still landed on the old draft, but don't repoint the canvas
      if (ui().epoch !== epoch) return;
      saved = scene;
      lastRecord = record;
      if (!currentId) {
        selfUpdate = true;
        ui().setCurrent(id, name);
        selfUpdate = false;
      }
      ui().setSaveState("saved", record.updatedAt);
      scheduleCloud();
    } catch {
      if (ui().epoch === epoch) ui().setSaveState("error");
    }
  }

  async function syncCloud() {
    cloudTimer = null;
    const record = lastRecord;
    if (!record) return;
    lastCloudAt = Date.now();
    // refresh the preview now and then; it's skipped on the fast local path
    const live = useSceneStore.getState().scene;
    const fresh = live === record.scene ? await captureThumbnail(live) : undefined;
    if (fresh && ui().currentId === record.id) {
      thumbnail = fresh;
      thumbFor = record.id;
    }
    if (lastRecord === record) lastRecord = null;
    // cloud only: the local copy may already be newer, and must stay so
    await persistDraft({ ...record, thumbnail: fresh ?? record.thumbnail }, { local: false }).catch(() => undefined);
  }

  function scheduleCloud() {
    if (cloudTimer) return;
    const wait = Math.max(0, lastCloudAt + CLOUD_EVERY - Date.now());
    cloudTimer = setTimeout(() => void syncCloud(), wait);
  }

  function queueLocal(opts: { withThumbnail: boolean }) {
    chain = chain.then(() => writeLocal(opts), () => writeLocal(opts));
    return chain;
  }

  function schedule() {
    if (localTimer) clearTimeout(localTimer);
    localTimer = setTimeout(() => {
      localTimer = null;
      void queueLocal({ withThumbnail: true });
    }, LOCAL_DELAY);
  }

  const offScene = useSceneStore.subscribe((state, prev) => {
    // decide at write time: zundo records the history entry only after this
    // listener runs, so the first edit would look like "nothing done" here
    if (state.scene !== prev.scene) schedule();
  });

  const offUi = useDraftsUi.subscribe((state, prev) => {
    if (state.epoch === prev.epoch || selfUpdate) return;
    // repointed from outside (opened a draft, start over, ⌘S, rename): the
    // scene as it is now is the new baseline
    baseline = useSceneStore.getState().scene;
    saved = state.currentId ? baseline : null;
    thumbFor = null;
    thumbnail = undefined;
    if (localTimer) clearTimeout(localTimer);
    localTimer = null;
  });

  // leaving the page: write what's pending right away, skipping the thumbnail
  // so it finishes before the tab goes away
  const flush = () => {
    if (!localTimer) return;
    clearTimeout(localTimer);
    localTimer = null;
    void queueLocal({ withThumbnail: false });
  };
  const onVisibility = () => {
    if (document.visibilityState === "hidden") flush();
  };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", flush);

  return () => {
    offScene();
    offUi();
    document.removeEventListener("visibilitychange", onVisibility);
    window.removeEventListener("pagehide", flush);
    flush();
    if (cloudTimer) clearTimeout(cloudTimer);
  };
}

/** Load a saved draft or template onto the canvas. Returns false if it can't be opened. */
export function openDraftInEditor(rec: DraftRecord): boolean {
  try {
    const next = openDraft(rec);
    useSceneStore.getState().setScene(() => next);
    // the previous canvas is not part of this draft's history: without this, ⌘Z would bring it
    // back and autosave would write it into the draft that was just opened
    sceneTemporal.getState().clear();
    const isTemplate = rec.kind === "template";
    useDraftsUi.getState().setCurrent(isTemplate ? null : rec.id, isTemplate ? null : rec.name);
    const view = useViewStore.getState();
    view.bumpAssets();
    view.select(null);
    view.setActiveLayout(null);
    window.dispatchEvent(new CustomEvent("framekit:fit")); // canvas size may differ
    return true;
  } catch {
    return false;
  }
}
