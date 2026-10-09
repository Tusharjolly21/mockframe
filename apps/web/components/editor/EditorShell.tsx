"use client";

import { useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { AnimatePresence, motion } from "motion/react";
import { track, trackOnce } from "@/lib/analytics";
import { confirmCheckoutReturn } from "@/lib/billing/client";
import { ingestFile } from "@/lib/assets";
import { loadCustomDevices, syncCustomDevicesFromServer } from "@/lib/customDevices";
import { syncBrandKitFromServer } from "@/lib/brand";
import { buildDeviceScene, buildScreenScene, deviceForScreenshot, isScreenApp } from "@/lib/deviceScene";
import { takeParkedScreenshot } from "@/lib/handoff";
import { planFigmaScenes } from "@/lib/figmaOpen";
import type { FigmaImportManifest } from "@/lib/figmaImport";
import { startAutosave } from "@/lib/autosave";
import { saveCurrentDraft, useDraftsUi } from "@/lib/drafts";
import { ensureGoogleFont, loadCustomFonts } from "@/lib/fonts";
import { ShotStrip } from "./ShotStrip";
import { useShotBatchStore } from "@/lib/shotBatch";
import { duplicateLayer, groupLayers, placeAsset, removeLayer, reorderLayer, ungroupLayers } from "@/lib/sceneOps";
import { copyLayers, hasCopiedLayers, pasteLayers, runArrange, type ArrangeAction } from "@/lib/arrange";
import { sceneTemporal, useSceneStore, useViewStore } from "@/lib/store";
import { AnimatePanel } from "./AnimatePanel";
import { BottomBar } from "./BottomBar";
import { CanvasStage } from "./CanvasStage";
import { LeftPanel } from "./LeftPanel";
import { LooksTray, MakePrettyButton, openLooks } from "./MakePretty";
import { ShowcaseButton, ShowcaseProgress } from "./Showcase";
import { RightPanel } from "./RightPanel";
import { ExportNextSteps } from "./ExportNextSteps";
import { PhoneEditor } from "./phone/PhoneEditor";
import { usePhoneMode } from "./phone/usePhoneMode";
import { ResumeDraftCard } from "./ResumeDraftCard";
import { StarterModal } from "./StarterModal";
import { ShortcutsSheet } from "./ShortcutsSheet";
import { LogoChip, Toolbar } from "./Toolbar";

// Heavy (@remotion/player) + client-only — load it only when the promo flow opens.
const PromoPanel = dynamic(() => import("./promo/PromoPanel"), { ssr: false });

export function EditorShell({
  initialDeviceId,
  initialScreenApp,
  openCalibrate = false,
  openUpgradeOnLoad = false,
  upgradePlan,
  checkoutReturn,
  openCaptureOnLoad = false,
  openPromoOnLoad = false,
  openReplayOnLoad = false,
  remixId,
  openDroppedOnLoad = false,
  figmaImportId,
  fromTemplate = false,
  embedded = false,
}: {
  initialDeviceId?: string;
  initialScreenApp?: string;
  openCalibrate?: boolean;
  openUpgradeOnLoad?: boolean;
  upgradePlan?: string;
  /** set when Dodo's hosted checkout redirected back here */
  checkoutReturn?: { subscriptionId?: string; status?: string };
  openCaptureOnLoad?: boolean;
  openPromoOnLoad?: boolean;
  openReplayOnLoad?: boolean;
  remixId?: string;
  /** a screenshot was dropped on a marketing page and parked for us (lib/handoff) */
  openDroppedOnLoad?: boolean;
  /** /editor?figma=<id>: frames sent from the Figma plugin */
  figmaImportId?: string;
  /** a template page already loaded a scene, so skip the first-run picker */
  fromTemplate?: boolean;
  embedded?: boolean;
}) {
  const setScene = useSceneStore((s) => s.setScene);
  const { phone, openFullEditor } = usePhoneMode(embedded);
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const [toast, setToast] = useState<string | null>(null);
  const [promoOpen, setPromoOpen] = useState(false);
  const extensionCaptures = useRef(new Set<string>());
  const deepLinked = Boolean(
    initialDeviceId || initialScreenApp || openCalibrate || openUpgradeOnLoad || openCaptureOnLoad || openPromoOnLoad || openReplayOnLoad || remixId || openDroppedOnLoad || figmaImportId || fromTemplate
  );
  const droppedTaken = useRef(false);
  const figmaTaken = useRef(false);

  // Fonts: this browser's uploads (+ the account's), and every catalog family
  // the scene's text uses — drafts, templates and remixes arrive with fonts
  // the root stylesheet doesn't load. A joined string keeps the selector stable.
  const textFamilies = useSceneStore((s) =>
    [...new Set(s.scene.layers.flatMap((l) => (l.type === "text" ? [l.font.family] : [])))].sort().join("\n")
  );
  useEffect(() => {
    void loadCustomFonts();
  }, []);
  useEffect(() => {
    for (const family of textFamilies.split("\n")) if (family) void ensureGoogleFont(family);
  }, [textFamilies]);

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
    if (!remixId) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`/api/scene-share/${remixId}`);
        if (!res.ok) throw new Error("Share link not found");
        const j = await res.json();
        if (cancelled) return;
        const { restoreAssets } = await import("@/lib/assets");
        restoreAssets(j.assets ?? []);
        useViewStore.getState().bumpAssets();
        setScene(() => j.scene);
        window.dispatchEvent(new CustomEvent("framekit:toast", { detail: "Remixed — make it yours ✨" }));
      } catch {
        window.dispatchEvent(new CustomEvent("framekit:toast", { detail: "That share link could not be opened" }));
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [remixId]);

  useEffect(() => {
    if (!openReplayOnLoad) return;
    // wait for the screen scene injected by initialScreenApp to settle first
    const t = setTimeout(() => window.dispatchEvent(new CustomEvent("framekit:animate-open")), 700);
    return () => clearTimeout(t);
  }, [openReplayOnLoad]);

  useEffect(() => {
    track("editor_opened", { entry: openDroppedOnLoad ? "homepage_drop" : figmaImportId ? "figma" : initialDeviceId ? "device_page" : openCalibrate ? "calibrate" : "direct" });
    trackOnce("editor_first_open");
  }, [initialDeviceId, openCalibrate, openDroppedOnLoad, figmaImportId]);

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
    // the brand kit follows the account the same way (newest edit wins)
    void syncBrandKitFromServer();
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

  // Deep-link: /editor?drop=1 — a screenshot dropped on the homepage. Open it
  // in the device that suits its shape; it's a real edit, so autosave keeps it.
  useEffect(() => {
    if (!openDroppedOnLoad || droppedTaken.current) return;
    droppedTaken.current = true;
    window.history.replaceState({}, "", "/editor");
    const say = (detail: string) => window.dispatchEvent(new CustomEvent("framekit:toast", { detail }));
    void (async () => {
      const file = await takeParkedScreenshot();
      if (!file) return say("Your screenshot didn't come through. Drop it on the canvas instead.");
      try {
        const asset = await ingestFile(file);
        const base = buildDeviceScene(deviceForScreenshot(asset.width, asset.height));
        if (base) {
          useSceneStore.setState({ scene: base });
          useSceneStore.temporal.getState().clear();
          useDraftsUi.getState().setCurrent(null);
        }
        useViewStore.getState().bumpAssets();
        const result = placeAsset(useSceneStore.getState().scene, asset, {});
        setScene(() => result.scene);
        useViewStore.getState().select(result.layerId);
        useViewStore.getState().triggerEntrance(result.layerId);
        // pick a finished look in the screenshot's colours, with the others a click away
        openLooks(true);
        track("media_added", { source: "homepage_drop" });
        trackOnce("first_media_added", { source: "homepage_drop" });
      } catch (e) {
        say(e instanceof Error ? e.message : "That file couldn't be opened");
      }
    })();
  }, [openDroppedOnLoad, setScene]);

  // Deep-link: /editor?figma=<id> — frames sent from the Figma plugin, each in
  // a device that fits (several become a shot batch), or a store listing set.
  useEffect(() => {
    if (!figmaImportId || figmaTaken.current) return;
    figmaTaken.current = true;
    window.history.replaceState({}, "", "/editor");
    const say = (detail: string) => window.dispatchEvent(new CustomEvent("framekit:toast", { detail }));
    void (async () => {
      try {
        const base = `/api/figma-import/${encodeURIComponent(figmaImportId)}`;
        const res = await fetch(base);
        const manifest = (await res.json().catch(() => null)) as (FigmaImportManifest & { error?: string }) | null;
        if (!res.ok || !manifest) return say(manifest?.error ?? "Your Figma frames couldn't be loaded. Send them again.");
        const frames: { asset: Awaited<ReturnType<typeof ingestFile>>; name: string }[] = [];
        for (let i = 0; i < manifest.frames.length; i++) {
          const r = await fetch(`${base}/${i}`);
          if (!r.ok) continue;
          const blob = await r.blob();
          const name = manifest.frames[i].name;
          frames.push({ asset: await ingestFile(new File([blob], `${name}.${blob.type === "image/jpeg" ? "jpg" : "png"}`, { type: blob.type })), name });
        }
        if (!frames.length) return say("Your Figma frames couldn't be loaded. Send them again.");
        const { shots, filled } = planFigmaScenes(manifest, frames);
        if (!shots.length) return;
        useViewStore.getState().bumpAssets();
        const [first] = shots;
        // the batch strip under the canvas switches between the shots
        useShotBatchStore.setState({ shots: shots.map((s) => ({ id: s.id, name: s.name, scene: s.scene })), activeId: first.id });
        useSceneStore.setState({ scene: first.base });
        useSceneStore.temporal.getState().clear();
        useDraftsUi.getState().setCurrent(null);
        // putting the frame in is a real edit, so autosave keeps it
        setScene(() => first.scene);
        window.dispatchEvent(new CustomEvent("framekit:fit"));
        if (shots.length === 1) openLooks(false);
        track("figma_import_opened", { frames: frames.length, mode: manifest.mode });
        trackOnce("first_media_added", { source: "figma" });
        if (manifest.mode === "set" && !filled) say("Store sets need phone-shaped frames, so the sample screens stayed. Send them as In devices instead.");
        else if (manifest.mode === "set") say(frames.length === 1 ? "Your frame is in all eight shots" : `Your ${frames.length} frames are in all eight shots`);
        else say(shots.length === 1 ? "Your frame from Figma is in" : `${shots.length} frames from Figma, one shot each`);
      } catch (e) {
        say(e instanceof Error ? e.message : "Your Figma frames couldn't be loaded");
      }
    })();
  }, [figmaImportId, setScene]);

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

  // Back from Dodo Payments' hosted checkout: confirm the subscription (verify
  // by id, then poll status while the webhook lands) and unlock Pro.
  const checkoutSubId = checkoutReturn?.subscriptionId;
  const checkoutStatus = checkoutReturn?.status;
  const isCheckoutReturn = !!checkoutReturn;
  useEffect(() => {
    if (!isCheckoutReturn) return;
    window.history.replaceState({}, "", "/editor");
    const say = (detail: string) => window.dispatchEvent(new CustomEvent("framekit:toast", { detail }));
    if (checkoutStatus === "failed" || checkoutStatus === "cancelled") {
      track("purchase_cancelled", { status: checkoutStatus });
      const t = setTimeout(() => say("Payment was not completed — you have not been charged"), 0);
      return () => clearTimeout(t);
    }
    let cancelled = false;
    // deferred so the toast listener (registered further down) is mounted
    const t = setTimeout(() => {
      say("Confirming your payment…");
      confirmCheckoutReturn(checkoutSubId ?? null).then((active) => {
        if (cancelled) return;
        track(active ? "purchase_confirmed" : "purchase_pending");
        if (active) {
          useViewStore.getState().setRemoveWatermark(true);
          say("You're Pro - welcome aboard");
        } else {
          say("Payment received — Pro unlocks as soon as it's confirmed. Refresh in a minute if it hasn't.");
        }
      });
    }, 0);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [isCheckoutReturn, checkoutSubId, checkoutStatus]);

  // Autosave every edit to Drafts. Declared after the deep-link effects above so
  // a deep-linked scene is the untouched baseline. The embed runs inside other
  // sites, where silently filling this origin's storage would be a surprise.
  useEffect(() => (embedded ? undefined : startAutosave()), [embedded]);

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
      if (!file) {
        // no image on the clipboard: paste layers copied with ⌘C, if any
        const t = e.target as HTMLElement | null;
        if (t?.matches?.("input, textarea, select, [contenteditable]") || !hasCopiedLayers()) return;
        e.preventDefault();
        const r = pasteLayers(useSceneStore.getState().scene);
        setScene(() => r.scene);
        useViewStore.setState({ selectedIds: r.ids });
        return;
      }
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
      if (mod && e.key.toLowerCase() === "a") {
        e.preventDefault();
        useViewStore.setState({ selectedIds: useSceneStore.getState().scene.layers.map((l) => l.id) });
        return;
      }
      if (mod && (e.key.toLowerCase() === "c" || e.key.toLowerCase() === "x") && selectedIds.length) {
        // a text selection on the page keeps the browser's own copy
        if (window.getSelection()?.toString()) return;
        e.preventDefault();
        const n = copyLayers(useSceneStore.getState().scene, selectedIds);
        // replace whatever image sits on the system clipboard so ⌘V pastes these layers
        navigator.clipboard?.writeText("").catch(() => {});
        if (e.key.toLowerCase() === "x") {
          const removable = selectedIds.filter((id) => useSceneStore.getState().scene.layers.find((l) => l.id === id)?.type !== "mockup");
          setScene((s) => ({ ...s, layers: s.layers.filter((l) => !removable.includes(l.id)) }));
          useViewStore.setState({ selectedIds: selectedIds.filter((id) => !removable.includes(id)) });
        }
        window.dispatchEvent(new CustomEvent("framekit:toast", { detail: `${e.key.toLowerCase() === "x" ? "Cut" : "Copied"} ${n} element${n === 1 ? "" : "s"} · ⌘V to paste` }));
        return;
      }
      // ⌘] / ⌘[ step forward/back; with ⌥ jump to front/back
      if (mod && (e.key === "]" || e.key === "[" || e.code === "BracketRight" || e.code === "BracketLeft") && selectedIds.length) {
        e.preventDefault();
        const fwd = e.code === "BracketRight" || e.key === "]";
        if (e.altKey) runArrange(fwd ? "front" : "back");
        else setScene((s) => selectedIds.reduce((acc, id) => reorderLayer(acc, id, fwd ? 1 : -1), s));
        return;
      }
      // ⌥A/D/W/S align left/right/top/bottom, ⌥H/V center (Figma's keys)
      if (e.altKey && !mod && selectedIds.length) {
        const a = ({ KeyA: "left", KeyD: "right", KeyW: "top", KeyS: "bottom", KeyH: "center", KeyV: "middle" } as Record<string, ArrangeAction>)[e.code];
        if (a) {
          e.preventDefault();
          runArrange(e.shiftKey && (a === "center" || a === "middle") ? (a === "center" ? "dist-h" : "dist-v") : a);
          return;
        }
      }
      if (!mod && e.key === "?") {
        e.preventDefault();
        window.dispatchEvent(new CustomEvent("framekit:shortcuts"));
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

  if (phone === null) return <div className="h-dvh bg-[#0b0b0e] md:bg-transparent" />;
  if (phone) return <PhoneEditor onFullEditor={openFullEditor} />;

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
        <div className="pointer-events-auto absolute bottom-1 left-1/2 flex -translate-x-1/2 flex-col items-center gap-2">
          <ShotStrip />
          <LooksTray />
          <div className="flex items-end gap-2">
            <BottomBar />
            <MakePrettyButton />
            <ShowcaseButton />
            <AnimatePanel />
          </div>
        </div>
      </div>

      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            // top centre, under the toolbar: the bottom belongs to the filmstrip,
            // the bottom bar and the post-export nudge, which would cover it
            className="fk-card pointer-events-none absolute left-1/2 top-[76px] z-[70] max-w-[min(560px,92vw)] -translate-x-1/2 rounded-full px-5 py-2.5 text-center text-[13px] font-medium text-[#17171c]"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {promoOpen && <PromoPanel onClose={() => setPromoOpen(false)} />}
      <ExportNextSteps />
      <ShortcutsSheet />
      <StarterModal embedded={embedded} deepLinked={deepLinked} />
      <ShowcaseProgress />
      <ResumeDraftCard embedded={embedded} deepLinked={deepLinked} />
    </div>
  );
}
