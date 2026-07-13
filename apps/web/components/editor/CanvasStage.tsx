"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SceneRenderer, plateToBoxDelta, rectToQuad, type Quad } from "@framekit/renderer";
import { getDevice } from "@framekit/devices";
import { Box, RotateCw } from "lucide-react";
import { resolveAsset, ingestFile } from "@/lib/assets";
import { placeAsset } from "@/lib/sceneOps";
import { sceneTemporal, useSceneStore, useViewStore } from "@/lib/store";

type Drag =
  | {
      kind: "move";
      id: string; // the layer under the pointer (snap reference)
      startCX: number;
      startCY: number;
      starts: Record<string, { x: number; y: number }>; // all selected layers move together
      currentX: number;
      currentY: number;
    }
  | { kind: "scale"; id: string; centerX: number; centerY: number; startDist: number; scale: number; currentScale: number }
  | { kind: "rotate"; id: string; centerX: number; centerY: number; startAngle: number; rotate: number; currentRotate: number }
  | { kind: "tilt"; id: string; startX: number; startY: number; tiltX: number; tiltY: number; currentTiltX: number; currentTiltY: number }
  // pan the screenshot INSIDE a photo-scene screen (perspective-correct)
  | {
      kind: "media";
      id: string;
      startX: number;
      startY: number;
      sw: number;
      sh: number;
      quad: Quad;
      scale: number;
      rotate: number;
      offsetX: number;
      offsetY: number;
      maxX: number;
      maxY: number;
      curDX: number;
      curDY: number;
    };

export function CanvasStage() {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const { zoom, pan, selectedIds, setZoom, setPan, select, bumpAssets, threeD, removeWatermark, entrance } = useViewStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [overlayBoxes, setOverlayBoxes] = useState<{ id: string; x: number; y: number; w: number; h: number }[]>([]);
  const [snap, setSnap] = useState<{ x: boolean; y: boolean }>({ x: false, y: false });
  const [dropHint, setDropHint] = useState(false);
  // ⊕ buttons centered on empty device screens (PostSpark's add-media affordance)
  const [emptyBoxes, setEmptyBoxes] = useState<{ id: string; x: number; y: number }[]>([]);
  const emptyPickRef = useRef<HTMLInputElement>(null);
  const emptyTargetRef = useRef<string | null>(null);

  /* ------------------------------ fit to view ------------------------------ */
  // insets keep the scene clear of the floating panels
  const fit = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const INSET_X = 340;
    const INSET_TOP = 88;
    const INSET_BOTTOM = 84;
    const innerW = el.clientWidth - INSET_X * 2;
    const innerH = el.clientHeight - INSET_TOP - INSET_BOTTOM;
    const z = Math.min(innerW / scene.canvas.width, innerH / scene.canvas.height);
    setZoom(z);
    setPan({
      x: INSET_X + (innerW - scene.canvas.width * z) / 2,
      y: INSET_TOP + (innerH - scene.canvas.height * z) / 2,
    });
  }, [scene.canvas, setPan, setZoom]);

  // The canvas is sticky: always auto-fit and centered. It only re-lays-out
  // when the canvas dimensions (aspect ratio) or the window change.
  useEffect(() => {
    fit();
    window.addEventListener("framekit:fit", fit);
    const el = containerRef.current;
    const ro = el ? new ResizeObserver(fit) : null;
    if (el && ro) ro.observe(el);
    return () => {
      window.removeEventListener("framekit:fit", fit);
      ro?.disconnect();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scene.canvas.width, scene.canvas.height]);

  /* ------------------ selection overlay + ⊕ empty screens ------------------
     One measurement pass for both. DOM rects lie while a layer is mid-entrance
     animation (fk-device-enter translates/scales it) or before its plate image
     has loaded — so besides re-measuring on state changes, we re-measure on
     animation end + image load, and rAF-track during the entrance so the
     overlay FOLLOWS the device instead of freezing at its start position. */
  const measureOverlays = useCallback(() => {
    const host = containerRef.current;
    if (!host) return;
    const hostRect = host.getBoundingClientRect();

    setOverlayBoxes(
      selectedIds.flatMap((id) => {
        const node = host.querySelector(`[data-layer-id="${id}"]`);
        if (!node) return [];
        const r = (node as HTMLElement).getBoundingClientRect();
        return [{ id, x: r.left - hostRect.left, y: r.top - hostRect.top, w: r.width, h: r.height }];
      })
    );

    setEmptyBoxes(
      scene.layers
        .filter((l) => l.type === "mockup" && l.deviceId && !l.media)
        .flatMap((l) => {
          const node = host.querySelector(`[data-layer-id="${l.id}"]`);
          if (!node) return [];
          // anchor to the true SCREEN centre when the renderer exposes it (off-centre
          // screens — e.g. an angled watch — would otherwise put ⊕ on the body/band)
          const anchor = (node as HTMLElement).querySelector("[data-screen-anchor]") ?? node;
          const r = (anchor as HTMLElement).getBoundingClientRect();
          return [{ id: l.id, x: r.left - hostRect.left + r.width / 2, y: r.top - hostRect.top + r.height / 2 }];
        })
    );
  }, [selectedIds, scene.layers]);

  useLayoutEffect(() => {
    measureOverlays();
  }, [measureOverlays, zoom, pan]);

  // late layout shifts the state deps can't see: entrance animation settling,
  // plate/screenshot images finishing their load
  useEffect(() => {
    const host = containerRef.current;
    if (!host) return;
    const onAnimEnd = () => measureOverlays();
    const onLoad = (e: Event) => {
      if ((e.target as HTMLElement)?.tagName === "IMG") measureOverlays();
    };
    host.addEventListener("animationend", onAnimEnd);
    host.addEventListener("load", onLoad, true); // load doesn't bubble — capture
    return () => {
      host.removeEventListener("animationend", onAnimEnd);
      host.removeEventListener("load", onLoad, true);
    };
  }, [measureOverlays]);

  // while a device is animating in, track it frame-by-frame (~1s covers the
  // fk-device-enter timeline with margin)
  useEffect(() => {
    if (!entrance.layerId) return;
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      measureOverlays();
      if (t - start < 1100) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [entrance.nonce, entrance.layerId, measureOverlays]);

  /* ------------------------------ coordinates ------------------------------ */
  const toCanvasPt = useCallback(
    (clientX: number, clientY: number) => {
      const host = containerRef.current!.getBoundingClientRect();
      return {
        x: (clientX - host.left - pan.x) / zoom,
        y: (clientY - host.top - pan.y) / zoom,
      };
    },
    [pan, zoom]
  );

  /* -------------------------------- dragging ------------------------------- */
  const layerNode = (id: string): HTMLElement | null =>
    containerRef.current?.querySelector<HTMLElement>(`[data-layer-id="${id}"]`) ?? null;

  const setDragStyle = (id: string, vars: Record<string, string>) => {
    const node = layerNode(id);
    if (!node) return;
    for (const [name, value] of Object.entries(vars)) node.style.setProperty(name, value);
    const overlay = containerRef.current?.querySelector<HTMLElement>(`[data-layer-overlay="${id}"]`);
    if (overlay && vars["--fk-drag-x"] !== undefined) {
      overlay.style.transform = `translate(${parseFloat(vars["--fk-drag-x"]) * zoom}px, ${parseFloat(vars["--fk-drag-y"] ?? "0") * zoom}px)`;
    } else if (overlay && vars["--fk-drag-scale"] !== undefined) {
      overlay.style.transform = `scale(${vars["--fk-drag-scale"]})`;
    } else if (overlay && vars["--fk-drag-rotate"] !== undefined) {
      overlay.style.transform = `rotate(${vars["--fk-drag-rotate"]})`;
    }
  };

  const clearDragStyle = (id: string) => {
    const node = layerNode(id);
    if (!node) return;
    for (const name of ["--fk-drag-x", "--fk-drag-y", "--fk-drag-scale", "--fk-drag-rotate"]) node.style.removeProperty(name);
    const content = node.querySelector<HTMLElement>("[data-layer-content]");
    content?.style.removeProperty("--fk-drag-tilt-x");
    content?.style.removeProperty("--fk-drag-tilt-y");
    containerRef.current?.querySelector<HTMLElement>(`[data-layer-overlay="${id}"]`)?.style.removeProperty("transform");
  };

  const beginDrag = (drag: Drag) => {
    dragRef.current = drag;
    sceneTemporal.getState().pause();
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (d.kind === "move") {
        const pt = toCanvasPt(e.clientX, e.clientY);
        const anchor = d.starts[d.id];
        let nx = anchor.x + (pt.x - d.startCX);
        let ny = anchor.y + (pt.y - d.startCY);
        const tol = 8 / zoom;
        const sx = Math.abs(nx) < tol;
        const sy = Math.abs(ny) < tol;
        if (sx) nx = 0;
        if (sy) ny = 0;
        const dx = nx - anchor.x;
        const dy = ny - anchor.y;
        d.currentX = dx;
        d.currentY = dy;
        for (const id of Object.keys(d.starts)) setDragStyle(id, { "--fk-drag-x": `${dx}px`, "--fk-drag-y": `${dy}px` });
        setSnap((current) => current.x === sx && current.y === sy ? current : { x: sx, y: sy });
        return;
      }
      if (d.kind === "scale") {
        const dist = Math.hypot(e.clientX - d.centerX, e.clientY - d.centerY);
        const factor = dist / d.startDist;
        const next = Math.min(10, Math.max(0.02, d.scale * factor));
        d.currentScale = Math.round(next * 1000) / 1000;
        setDragStyle(d.id, { "--fk-drag-scale": String(d.currentScale / d.scale) });
        return;
      }
      if (d.kind === "rotate") {
        const angle = (Math.atan2(e.clientY - d.centerY, e.clientX - d.centerX) * 180) / Math.PI;
        let next = d.rotate + (angle - d.startAngle);
        if (e.shiftKey) {
          // arrows snap to horizontal/vertical with Shift (user request);
          // everything else keeps the 15° ticks
          const l = useSceneStore.getState().scene.layers.find((x) => x.id === d.id);
          const isArrow = l?.type === "sticker" && "stickerId" in l && l.stickerId === "annot-arrow";
          const step = isArrow ? 90 : 15;
          next = Math.round(next / step) * step;
        }
        next = Math.round(next * 10) / 10;
        d.currentRotate = next;
        setDragStyle(d.id, { "--fk-drag-rotate": `${next - d.rotate}deg` });
        return;
      }
      if (d.kind === "media") {
        // client delta → plate-space delta (undo canvas zoom, layer scale + rotate)
        const s = zoom * d.scale || 1;
        let px = (e.clientX - d.startX) / s;
        let py = (e.clientY - d.startY) / s;
        if (d.rotate) {
          const r = (-d.rotate * Math.PI) / 180;
          const cos = Math.cos(r);
          const sin = Math.sin(r);
          [px, py] = [px * cos - py * sin, px * sin + py * cos];
        }
        // → screen-box (screen-res) delta via the homography Jacobian, then clamp
        const [bx, by] = plateToBoxDelta(d.sw, d.sh, d.quad, px, py);
        const clamp = (v: number, m: number) => Math.max(-m, Math.min(m, v));
        d.curDX = clamp(d.offsetX + bx, d.maxX) - d.offsetX;
        d.curDY = clamp(d.offsetY + by, d.maxY) - d.offsetY;
        const content = layerNode(d.id)?.querySelector<HTMLElement>("[data-layer-content]");
        content?.style.setProperty("--fk-media-dx", `${d.curDX}px`);
        content?.style.setProperty("--fk-media-dy", `${d.curDY}px`);
        return;
      }
      if (d.kind === "tilt") {
        // trackball: horizontal drag → rotateY (tiltY), vertical drag → rotateX (tiltX)
        const k = 0.35;
        const clamp = (v: number) => Math.round(Math.max(-60, Math.min(60, v)) * 10) / 10;
        const tiltY = clamp(d.tiltY + (e.clientX - d.startX) * k);
        const tiltX = clamp(d.tiltX - (e.clientY - d.startY) * k);
        d.currentTiltX = tiltX;
        d.currentTiltY = tiltY;
        const content = layerNode(d.id)?.querySelector<HTMLElement>("[data-layer-content]");
        content?.style.setProperty("--fk-drag-tilt-x", `${tiltX - d.tiltX}deg`);
        content?.style.setProperty("--fk-drag-tilt-y", `${tiltY - d.tiltY}deg`);
      }
    };
    const onUp = () => {
      const finished = dragRef.current;
      dragRef.current = null;
      setSnap({ x: false, y: false });
      sceneTemporal.getState().resume();
      if (finished) {
        if (finished.kind === "move") {
          setScene((s) => ({
            ...s,
            layers: s.layers.map((l) => finished.starts[l.id]
              ? { ...l, transform: { ...l.transform, x: finished.starts[l.id].x + finished.currentX, y: finished.starts[l.id].y + finished.currentY } }
              : l),
          }));
          for (const id of Object.keys(finished.starts)) clearDragStyle(id);
        } else if (finished.kind === "scale") {
          updateLayer(finished.id, (l) => ({ ...l, transform: { ...l.transform, scale: finished.currentScale } }));
          clearDragStyle(finished.id);
        } else if (finished.kind === "rotate") {
          updateLayer(finished.id, (l) => ({ ...l, transform: { ...l.transform, rotate: finished.currentRotate } }));
          clearDragStyle(finished.id);
        } else if (finished.kind === "media") {
          updateLayer(finished.id, (l) =>
            l.type === "mockup" && l.media
              ? { ...l, media: { ...l.media, offsetX: finished.offsetX + finished.curDX, offsetY: finished.offsetY + finished.curDY } }
              : l
          );
          const content = layerNode(finished.id)?.querySelector<HTMLElement>("[data-layer-content]");
          content?.style.removeProperty("--fk-media-dx");
          content?.style.removeProperty("--fk-media-dy");
        } else {
          updateLayer(finished.id, (l) => ({ ...l, transform: { ...l.transform, tiltX: finished.currentTiltX, tiltY: finished.currentTiltY } }));
          clearDragStyle(finished.id);
        }
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    const layerEl = (e.target as Element).closest?.("[data-layer-id]");
    if (layerEl) {
      const id = layerEl.getAttribute("data-layer-id")!;
      // 3D mode: drag rotates the mockup in 3D instead of moving it
      if (threeD) {
        const layer = scene.layers.find((l) => l.id === id);
        if (layer && layer.type === "mockup") {
          if (!selectedIds.includes(id)) select(id);
          beginDrag({ kind: "tilt", id, startX: e.clientX, startY: e.clientY, tiltX: layer.transform.tiltX, tiltY: layer.transform.tiltY, currentTiltX: layer.transform.tiltX, currentTiltY: layer.transform.tiltY });
          return;
        }
      }
      if (e.shiftKey) {
        select(id, { additive: true });
        return;
      }
      // photo-scene mockup with a screenshot: plain drag pans the screenshot
      // inside the screen; ⌘/Ctrl-drag falls through to moving the whole layer
      if (!e.metaKey && !e.ctrlKey) {
        const layer = scene.layers.find((l) => l.id === id);
        if (layer?.type === "mockup" && layer.media) {
          const dev = layer.deviceId ? getDevice(layer.deviceId) : undefined;
          const asset = resolveAsset(layer.media.assetId);
          if (dev?.plate && asset) {
            if (!selectedIds.includes(id)) select(id);
            const sw = dev.screen.width;
            const sh = dev.screen.height;
            const iw = asset.width || sw;
            const ih = asset.height || sh;
            const base = layer.media.fit === "contain" ? Math.min(sw / iw, sh / ih) : Math.max(sw / iw, sh / ih);
            const pw = layer.media.fit === "fill" ? sw * layer.media.scale : iw * base * layer.media.scale;
            const ph = layer.media.fit === "fill" ? sh * layer.media.scale : ih * base * layer.media.scale;
            beginDrag({
              kind: "media",
              id,
              startX: e.clientX,
              startY: e.clientY,
              sw,
              sh,
              quad: dev.plate.screenQuad ?? rectToQuad(dev.plate.screenRect),
              scale: layer.transform.scale,
              rotate: layer.transform.rotate,
              offsetX: layer.media.offsetX,
              offsetY: layer.media.offsetY,
              maxX: Math.max(0, (pw - sw) / 2),
              maxY: Math.max(0, (ph - sh) / 2),
              curDX: 0,
              curDY: 0,
            });
            return;
          }
        }
      }
      const ids = selectedIds.includes(id) ? selectedIds : [id];
      if (!selectedIds.includes(id)) select(id);
      const starts: Record<string, { x: number; y: number }> = {};
      for (const l of scene.layers) {
        if (ids.includes(l.id)) starts[l.id] = { x: l.transform.x, y: l.transform.y };
      }
      if (!starts[id]) return;
      const pt = toCanvasPt(e.clientX, e.clientY);
      beginDrag({ kind: "move", id, startCX: pt.x, startCY: pt.y, starts, currentX: 0, currentY: 0 });
    } else {
      // empty area: just deselect — the canvas itself never moves
      select(null);
    }
  };

  const beginHandleDrag = (
    e: React.PointerEvent,
    kind: "scale" | "rotate",
    box: { id: string; x: number; y: number; w: number; h: number }
  ) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const layer = scene.layers.find((l) => l.id === box.id);
    if (!layer) return;
    const host = containerRef.current.getBoundingClientRect();
    const centerX = host.left + box.x + box.w / 2;
    const centerY = host.top + box.y + box.h / 2;
    if (kind === "scale") {
      beginDrag({
        kind,
        id: box.id,
        centerX,
        centerY,
        startDist: Math.max(4, Math.hypot(e.clientX - centerX, e.clientY - centerY)),
        scale: layer.transform.scale,
        currentScale: layer.transform.scale,
      });
    } else {
      beginDrag({
        kind,
        id: box.id,
        centerX,
        centerY,
        startAngle: (Math.atan2(e.clientY - centerY, e.clientX - centerX) * 180) / Math.PI,
        rotate: layer.transform.rotate,
        currentRotate: layer.transform.rotate,
      });
    }
  };

  /* ---------------------------------- drop ---------------------------------- */
  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    setDropHint(false);
    const files = [...e.dataTransfer.files].filter((f) => f.type.startsWith("image/"));
    for (const file of files) {
      try {
        const asset = await ingestFile(file);
        bumpAssets();
        const r = placeAsset(useSceneStore.getState().scene, asset, {
          selectedId: useViewStore.getState().selectedIds.at(-1) ?? null,
        });
        setScene(() => r.scene);
        select(r.layerId);
        useViewStore.getState().triggerEntrance(r.layerId);
      } catch (err) {
        console.error(err);
      }
    }
  };

  const transparent = scene.canvas.background.type === "transparent";

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 overflow-hidden"
      style={{
        background: "#e9e9f0",
        backgroundImage: "radial-gradient(rgba(20,20,60,0.07) 1px, transparent 1px)",
        backgroundSize: "22px 22px",
        touchAction: "none",
        cursor: threeD ? "grab" : undefined,
      }}
      onPointerDown={onPointerDown}
      onDragOver={(e) => {
        e.preventDefault();
        setDropHint(true);
      }}
      onDragLeave={() => setDropHint(false)}
      onDrop={onDrop}
    >
      {/* zoom/pan wrapper — a view concern that never touches the document */}
      <div
        id="scene-canvas"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
          transformOrigin: "0 0",
        }}
      >
        <div
          className={transparent ? "checkerboard" : undefined}
          style={{ boxShadow: "0 24px 80px rgba(20,20,60,0.22)", borderRadius: 6, overflow: "hidden" }}
        >
        <SceneRenderer
          scene={scene}
          resolveAsset={resolveAsset}
          watermark={!removeWatermark}
          animateLayerId={entrance.layerId}
          animationNonce={entrance.nonce}
        />
        </div>

        {/* snap guides in canvas space */}
        {snap.x && (
          <div
            style={{
              position: "absolute",
              left: scene.canvas.width / 2,
              top: 0,
              width: 1 / zoom,
              height: scene.canvas.height,
              background: "#f43f5e",
            }}
          />
        )}
        {snap.y && (
          <div
            style={{
              position: "absolute",
              top: scene.canvas.height / 2,
              left: 0,
              height: 1 / zoom,
              width: scene.canvas.width,
              background: "#f43f5e",
            }}
          />
        )}
      </div>

      {/* selection chrome — app overlay, never inside the renderer */}
      {overlayBoxes.map((box) => (
        <div
          key={box.id}
          data-layer-overlay={box.id}
          className="pointer-events-none absolute border-2 border-violet-500"
          style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
        >
          {(["nw", "ne", "sw", "se"] as const).map((corner) => (
            <div
              key={corner}
              onPointerDown={(e) => beginHandleDrag(e, "scale", box)}
              className="pointer-events-auto absolute h-3 w-3 rounded-[3px] border-2 border-violet-500 bg-white"
              style={{
                left: corner.includes("w") ? -7 : undefined,
                right: corner.includes("e") ? -7 : undefined,
                top: corner.includes("n") ? -7 : undefined,
                bottom: corner.includes("s") ? -7 : undefined,
                cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
              }}
            />
          ))}
          <div
            onPointerDown={(e) => beginHandleDrag(e, "rotate", box)}
            className="pointer-events-auto absolute left-1/2 -top-8 grid h-6 w-6 -translate-x-1/2 cursor-grab place-items-center rounded-full border border-white/20 bg-zinc-800 text-zinc-300"
            title="Drag to rotate (⇧ snaps to 15°)"
          >
            <RotateCw size={12} />
          </div>
        </div>
      ))}

      {/* ⊕ add media — centred in every empty device SCREEN (PostSpark-style:
          the white grid placeholder says "empty", the ⊕ says "add here"). */}
      {emptyBoxes.map((b) => (
        <button
          key={b.id}
          title="Add screenshot — click, or drag an image in"
          onClick={(e) => {
            e.stopPropagation();
            emptyTargetRef.current = b.id;
            emptyPickRef.current?.click();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="fk-press absolute z-10 grid h-12 w-12 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[#17171c] shadow-[0_6px_20px_rgba(20,20,40,0.3)] ring-1 ring-black/5 hover:scale-105"
          style={{ left: b.x, top: b.y }}
        >
          <svg width="20" height="20" viewBox="0 0 20 20"><path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
        </button>
      ))}
      <input
        ref={emptyPickRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          const id = emptyTargetRef.current;
          if (!f || !id) return;
          const a = await ingestFile(f);
          bumpAssets();
          updateLayer(id, (l) =>
            l.type === "mockup"
              ? { ...l, media: { assetId: a.id, kind: "image", fit: "cover", offsetX: 0, offsetY: 0, scale: 1 } }
              : l
          );
          e.target.value = "";
          emptyTargetRef.current = null;
        }}
      />

      {dropHint && (
        <div className="pointer-events-none absolute inset-3 z-10 grid place-items-center rounded-3xl border-2 border-dashed border-violet-500/70 bg-violet-500/5">
          <p className="fk-card rounded-full px-5 py-2.5 text-sm font-medium text-[#17171c]">
            Drop screenshots — matching devices are detected automatically
          </p>
        </div>
      )}

      {/* 3D mode hint — dragging a device rotates it in 3D (toggle in the top toolbar) */}
      {threeD && (
        <div className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2">
          <span className="fk-card flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[11.5px] font-semibold text-[#17171c]">
            <Box size={13} className="text-violet-600" />
            3D — drag the device to rotate · toggle off to move
          </span>
        </div>
      )}
    </div>
  );
}
