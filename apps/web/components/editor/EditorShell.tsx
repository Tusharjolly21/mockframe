"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ingestFile } from "@/lib/assets";
import { loadCustomDevices } from "@/lib/customDevices";
import { buildDeviceScene } from "@/lib/deviceScene";
import { saveCurrentDraft } from "@/lib/drafts";
import { useShotBatchStore } from "@/lib/shotBatch";
import { duplicateLayer, placeAsset, removeLayer } from "@/lib/sceneOps";
import { sceneTemporal, useSceneStore, useViewStore } from "@/lib/store";
import { AnimatePanel } from "./AnimatePanel";
import { BottomBar } from "./BottomBar";
import { CanvasStage } from "./CanvasStage";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { LogoChip, Toolbar } from "./Toolbar";

export function EditorShell({ initialDeviceId }: { initialDeviceId?: string }) {
  const setScene = useSceneStore((s) => s.setScene);
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const [toast, setToast] = useState<string | null>(null);

  // user-created custom mockup devices persist in localStorage — register them
  // into the runtime device registry before anything renders a layer
  useEffect(() => {
    loadCustomDevices();
  }, []);

  // Deep-link: /editor?device=<id> (from the /mockups pSEO pages) opens a fresh
  // scene with that device selected. One-shot on mount — clears undo history so
  // the injected scene is the baseline, and drops the param so a later refresh
  // doesn't clobber the user's edits.
  useEffect(() => {
    if (!initialDeviceId) return;
    const scene = buildDeviceScene(initialDeviceId);
    if (!scene) return;
    useSceneStore.setState({ scene });
    useSceneStore.temporal.getState().clear();
    window.history.replaceState({}, "", "/editor");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialDeviceId]);

  // The batch is a list of independent scene documents. Keep the active shot
  // current without making the editor shell re-render for every control tweak.
  useEffect(() => {
    const batch = useShotBatchStore.getState();
    batch.ensure(useSceneStore.getState().scene);
    return useSceneStore.subscribe((state) => useShotBatchStore.getState().syncActive(state.scene));
  }, []);

  /* window-level paste + keyboard shortcuts */
  useEffect(() => {
    const onPaste = async (e: ClipboardEvent) => {
      const item = [...(e.clipboardData?.items ?? [])].find((i) => i.type.startsWith("image/"));
      const file = item?.getAsFile();
      if (!file) return;
      const asset = await ingestFile(file);
      useViewStore.getState().bumpAssets();
      const r = placeAsset(useSceneStore.getState().scene, asset, {
        selectedId: useViewStore.getState().selectedIds.at(-1) ?? null,
      });
      setScene(() => r.scene);
      useViewStore.getState().select(r.layerId);
      useViewStore.getState().triggerEntrance(r.layerId);
    };

    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const mod = e.metaKey || e.ctrlKey;

      // ⌘S saves even while typing in a field — otherwise the browser's
      // "save page" dialog hijacks the muscle memory
      if (mod && e.key.toLowerCase() === "s") {
        e.preventDefault();
        const notify = (msg: string) =>
          window.dispatchEvent(new CustomEvent("framekit:toast", { detail: msg }));
        saveCurrentDraft(useSceneStore.getState().scene).then(
          (r) => notify(`Saved “${r.name}” to Drafts`),
          () => notify("Couldn't save draft — local storage unavailable")
        );
        return;
      }
      if (target.matches("input, textarea, select")) return;
      const { selectedIds, select } = useViewStore.getState();
      const primary = selectedIds.at(-1) ?? null;

      if (mod && e.key.toLowerCase() === "z") {
        e.preventDefault();
        if (e.shiftKey) sceneTemporal.getState().redo();
        else sceneTemporal.getState().undo();
        return;
      }
      if (mod && e.key.toLowerCase() === "d" && primary) {
        e.preventDefault();
        setScene((s) => duplicateLayer(s, primary));
        return;
      }
      // panel shortcuts — deliberately modifier-free so they behave identically
      // on Mac and Windows (user report: panel shortcuts misconfigured on Mac)
      if (!mod && !e.altKey) {
        const panel = { e: "emoji", t: "themes", a: "annotate" }[e.key.toLowerCase()];
        if (panel) {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent("framekit:open-panel", { detail: panel }));
          return;
        }
      }
      if (selectedIds.length === 0) return;
      if (e.key === "Backspace" || e.key === "Delete") {
        e.preventDefault();
        // mockups are never deleted from the canvas — only their screenshot is
        // cleared (removing a device lives in the Layers panel)
        const scene = useSceneStore.getState().scene;
        const kept: string[] = [];
        for (const id of selectedIds) {
          const layer = scene.layers.find((l) => l.id === id);
          if (!layer) continue;
          if (layer.type === "mockup") {
            if (layer.media) updateLayer(id, (l) => ({ ...l, media: null }));
            kept.push(id);
          } else {
            setScene((s) => removeLayer(s, id));
          }
        }
        useViewStore.setState({ selectedIds: kept });
        return;
      }
      if (e.key === "Escape") {
        select(null);
        return;
      }
      const nudge = e.shiftKey ? 10 : 1;
      const dirs: Record<string, [number, number]> = {
        ArrowLeft: [-nudge, 0],
        ArrowRight: [nudge, 0],
        ArrowUp: [0, -nudge],
        ArrowDown: [0, nudge],
      };
      const d = dirs[e.key];
      if (d) {
        e.preventDefault();
        setScene((s) => ({
          ...s,
          layers: s.layers.map((l) =>
            selectedIds.includes(l.id)
              ? { ...l, transform: { ...l.transform, x: l.transform.x + d[0], y: l.transform.y + d[1] } }
              : l
          ),
        }));
      }
    };

    window.addEventListener("paste", onPaste);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("paste", onPaste);
      window.removeEventListener("keydown", onKey);
    };
  }, [setScene, updateLayer]);

  /* toasts raised elsewhere (toolbar, ⌘S) surface through the same pill */
  useEffect(() => {
    const onToast = (e: Event) => {
      const msg = (e as CustomEvent<string>).detail;
      if (msg) {
        setToast(msg);
        setTimeout(() => setToast(null), 3200);
      }
    };
    window.addEventListener("framekit:toast", onToast);
    return () => window.removeEventListener("framekit:toast", onToast);
  }, []);

  return (
    <div className="relative h-dvh overflow-hidden">
      {/* the canvas fills everything; panels float above it */}
      <CanvasStage />

      <div className="pointer-events-none absolute inset-3 z-20">
        {/* top row */}
        <div className="absolute left-0 top-0">
          <LogoChip />
        </div>
        <div className="absolute left-1/2 top-0 -translate-x-1/2">
          <Toolbar />
        </div>

        {/* side panels */}
        <div className="absolute bottom-0 left-0 top-16 flex items-start">
          <LeftPanel />
        </div>
        <div className="absolute bottom-0 right-0 top-16 flex items-start">
          <RightPanel />
        </div>

        {/* bottom toolbar (reset / position / 3D / emoji) + animate */}
        <div className="pointer-events-auto absolute bottom-1 left-1/2 flex -translate-x-1/2 items-end gap-2">
          <BottomBar />
          <AnimatePanel />
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
            className="fk-card absolute bottom-16 left-1/2 z-50 -translate-x-1/2 rounded-full px-5 py-2.5 text-[13px] font-medium text-[#17171c]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
