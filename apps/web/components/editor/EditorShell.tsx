"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { track, trackOnce } from "@/lib/analytics";
import { ingestFile } from "@/lib/assets";
import { loadCustomDevices, syncCustomDevicesFromServer } from "@/lib/customDevices";
import { buildDeviceScene, buildScreenScene, isScreenApp } from "@/lib/deviceScene";
import { saveCurrentDraft } from "@/lib/drafts";
import { useShotBatchStore } from "@/lib/shotBatch";
import { duplicateLayer, groupLayers, placeAsset, removeLayer, ungroupLayers } from "@/lib/sceneOps";
import { sceneTemporal, useSceneStore, useViewStore } from "@/lib/store";
import { AnimatePanel } from "./AnimatePanel";
import { BottomBar } from "./BottomBar";
import { CanvasStage } from "./CanvasStage";
import { LeftPanel } from "./LeftPanel";
import { RightPanel } from "./RightPanel";
import { ExportNextSteps } from "./ExportNextSteps";
import { StarterModal } from "./StarterModal";
import { LogoChip, Toolbar } from "./Toolbar";

// Heavy (@remotion/player) + client-only — load it only when the promo flow opens.
const PromoPanel = dynamic(() => import("./promo/PromoPanel"), { ssr: false });

export function EditorShell({
  initialDeviceId,
  initialScreenApp,
  openCalibrate = false,
  openUpgradeOnLoad = false,
  upgradePlan,
  openCaptureOnLoad = false,
  openPromoOnLoad = false,
  openReplayOnLoad = false,
  embedded = false,
}: {
  initialDeviceId?: string;
  initialScreenApp?: string;
  openCalibrate?: boolean;
  openUpgradeOnLoad?: boolean;
  upgradePlan?: string;
  openCaptureOnLoad?: boolean;
  openPromoOnLoad?: boolean;
  openReplayOnLoad?: boolean;
  embedded?: boolean;
}) {
  const setScene = useSceneStore((s) => s.setScene);
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const [toast, setToast] = useState<string | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const extensionCaptures = useRef(new Set<string>());

  // Promo video flow opens from the toolbar button (framekit:promo-open) or the
  // /editor?promo=1 deep link used by the landing page.
  useEffect(() => {
    const open = () => setPromoOpen(true);
    window.addEventListener("framekit:promo-open", open);
    return () => window.removeEventListener("framekit:promo-open", open);
  }, []);
  useEffect(() => {
    if (openPromoOnLoad) setPromoOpen(true);
  }, [openPromoOnLoad]);
  useEffect(() => {
    if (!openReplayOnLoad) return;
    // wait for the screen scene injected by initialScreenApp to settle first
    const t = setTimeout(() => window.dispatchEvent(new CustomEvent("framekit:animate-open")), 700);
    return () => clearTimeout(t);
  }, [openReplayOnLoad]);

  useEffect(() => {
    track("editor_opened", { entry: initialDeviceId ? "device_page" : openCalibrate ? "calibrate" : "direct" });
    trackOnce("editor_first_open");
  }, [initialDeviceId, openCalibrate]);

  useEffect(() => {
    if (!embedded || window.parent === window) return;
    window.parent.postMessage({ source: "mockframe", type: "ready" }, "*");
  }, [embedded]);

  // user-created custom mockup devices: register the instant localStorage
  // copies first, then merge the account's cloud set (devices made on other
  // browsers appear; local-only ones get uploaded)
  useEffect(() => {
    loadCustomDevices();
    void syncCustomDevicesFromServer();
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
  }, [initialDeviceId]);

  // Deep-link: /editor?screen=<app> (from the /tools chat-screen generator
  // pages) opens an iPhone pre-loaded with that app's default chat screen.
  useEffect(() => {
    if (!initialScreenApp || !isScreenApp(initialScreenApp)) return;
    const scene = buildScreenScene(initialScreenApp);
    if (!scene) return;
    useSceneStore.setState({ scene });
    useSceneStore.temporal.getState().clear();
    window.history.replaceState({}, "", "/editor");
  }, [initialScreenApp]);

  // /calibrate entry: open the custom-mockup calibration modal once the panels
  // have mounted, then drop the param so refresh doesn't reopen it
  useEffect(() => {
    if (!openCalibrate) return;
    const t = setTimeout(() => {
      window.dispatchEvent(new CustomEvent("framekit:open-custom-mockup"));
      window.history.replaceState({}, "", "/editor");
    }, 400);
    return () => clearTimeout(t);
  }, [openCalibrate]);

  useEffect(() => {
    if (!openUpgradeOnLoad && !openCaptureOnLoad) return;
    const timer = setTimeout(() => {
      if (openUpgradeOnLoad) window.dispatchEvent(new CustomEvent("framekit:upgrade", { detail: { plan: upgradePlan } }));
      if (openCaptureOnLoad) window.dispatchEvent(new CustomEvent("framekit:start-capture"));
      window.history.replaceState({}, "", "/editor");
    }, 450);
    return () => clearTimeout(timer);
  }, [openCaptureOnLoad, openUpgradeOnLoad, upgradePlan]);

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
      track("media_added", { source: "paste" });
      trackOnce("first_media_added", { source: "paste" });
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
      // ⌘G groups the multi-selection; ⇧⌘G dissolves any group in it
      if (mod && e.key.toLowerCase() === "g") {
        e.preventDefault();
        const notify = (msg: string) =>
          window.dispatchEvent(new CustomEvent("framekit:toast", { detail: msg }));
        if (e.shiftKey) {
          setScene((s) => ungroupLayers(s, selectedIds));
          notify("Ungrouped");
        } else if (selectedIds.length >= 2) {
          setScene((s) => groupLayers(s, selectedIds));
          notify(`Grouped ${selectedIds.length} elements — they now select & move together (⇧⌘G to ungroup)`);
        } else {
          notify("Shift-click 2+ elements first, then ⌘G to group them");
        }
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

  // Chrome extension handoff. The content script can only post on our own
  // origin; payloads are bounded and must be image data URLs before ingestion.
  useEffect(() => {
    const receiveCapture = async (event: MessageEvent) => {
      if (event.source !== window || event.origin !== window.location.origin) return;
      const payload = event.data as { source?: string; type?: string; id?: string; dataUrl?: string; name?: string };
      if (payload?.source !== "mockframe-extension" || payload.type !== "capture") return;
      if (!payload.id || extensionCaptures.current.has(payload.id)) return;
      if (typeof payload.dataUrl !== "string" || !payload.dataUrl.startsWith("data:image/") || payload.dataUrl.length > 25_000_000) return;
      extensionCaptures.current.add(payload.id);
      try {
        const blob = await fetch(payload.dataUrl).then((response) => response.blob());
        const file = new File([blob], payload.name?.slice(0, 120) || "browser-capture.png", { type: blob.type || "image/png" });
        const asset = await ingestFile(file);
        useViewStore.getState().bumpAssets();
        const result = placeAsset(useSceneStore.getState().scene, asset, { selectedId: useViewStore.getState().selectedIds.at(-1) ?? null });
        setScene(() => result.scene);
        useViewStore.getState().select(result.layerId);
        useViewStore.getState().triggerEntrance(result.layerId);
        track("media_added", { source: "chrome_extension" });
        trackOnce("first_media_added", { source: "chrome_extension" });
        window.postMessage({ source: "mockframe-page", type: "capture-accepted", id: payload.id }, window.location.origin);
        window.history.replaceState({}, "", "/editor");
        window.dispatchEvent(new CustomEvent("framekit:toast", { detail: "Tab captured - ready to style" }));
      } catch {
        extensionCaptures.current.delete(payload.id);
        window.dispatchEvent(new CustomEvent("framekit:toast", { detail: "The extension capture could not be opened" }));
      }
    };
    window.addEventListener("message", receiveCapture);
    return () => window.removeEventListener("message", receiveCapture);
  }, [setScene]);

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
        {!embedded && <div className="absolute left-0 top-0"><LogoChip /></div>}
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

      {promoOpen && <PromoPanel onClose={() => setPromoOpen(false)} />}
      <ExportNextSteps />
      <StarterModal
        embedded={embedded}
        deepLinked={Boolean(initialDeviceId || initialScreenApp || openCalibrate || openUpgradeOnLoad || openCaptureOnLoad || openPromoOnLoad || openReplayOnLoad)}
      />
    </div>
  );
}
