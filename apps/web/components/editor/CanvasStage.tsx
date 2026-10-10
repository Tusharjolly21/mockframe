"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SceneRenderer } from "@framekit/renderer";
import { Box, RotateCw } from "lucide-react";
import { resolveAsset, ingestFile } from "@/lib/assets";
import { placeAsset } from "@/lib/sceneOps";
import { measureLayerBoxes } from "@/lib/arrange";
import { ArrangeBar } from "./ArrangeBar";
import { AdjustBar, AdjustOverlay } from "./AdjustOverlay";
import { canAdjust, enterAdjust, exitAdjust } from "@/lib/adjust";
import { sceneTemporal, useSceneStore, useViewStore } from "@/lib/store";
import { useShotBatchStore } from "@/lib/shotBatch";

type Drag =
  | {
      kind: "move";
      id: string; // the layer under the pointer (snap reference)
      /** pointer position on screen at press: a move only starts after a few px, so clicks never nudge */
      startClientX: number;
      startClientY: number;
      armed: boolean;
      startCX: number;
      startCY: number;
      starts: Record<string, { x: number; y: number }>; // all selected layers move together
      currentX: number;
      currentY: number;
      /** smart-guide data: the moving selection's box and the lines it can snap to */
      snapBox?: { l: number; t: number; r: number; b: number };
      snapXs?: number[];
      snapYs?: number[];
    }
  | {
      kind: "scale";
      id: string;
      centerX: number;
      centerY: number;
      /** the fixed point the corner handle scales away from (screen px); the centre when none */
      anchorX: number;
      anchorY: number;
      startDist: number;
      scale: number;
      currentScale: number;
      /** canvas-px shift that keeps the anchor corner still */
      currentDX: number;
      currentDY: number;
    }
  | { kind: "rotate"; id: string; centerX: number; centerY: number; startAngle: number; rotate: number; currentRotate: number }
  | { kind: "tilt"; id: string; startX: number; startY: number; tiltX: number; tiltY: number; currentTiltX: number; currentTiltY: number };

export function CanvasStage() {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const { zoom, pan, selectedIds, setZoom, setPan, select, bumpAssets, threeD, entrance, adjustId, textTime } = useViewStore();

  const containerRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<Drag | null>(null);
  const [overlayBoxes, setOverlayBoxes] = useState<{ id: string; x: number; y: number; w: number; h: number }[]>([]);
  const [guides, setGuides] = useState<{ xs: number[]; ys: number[] }>({ xs: [], ys: [] });
  const [dragging, setDragging] = useState(false);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [hoverBox, setHoverBox] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [marquee, setMarquee] = useState<{ x0: number; y0: number; x1: number; y1: number } | null>(null);
  const [dropHint, setDropHint] = useState(false);
  // ⊕ buttons centered on empty device screens (PostSpark's add-media affordance)
  const [emptyBoxes, setEmptyBoxes] = useState<{ id: string; x: number; y: number }[]>([]);
  const emptyPickRef = useRef<HTMLInputElement>(null);
  const emptyBtnRefs = useRef(new Map<string, HTMLButtonElement>());
  const emptyTargetRef = useRef<string | null>(null);
  /** when the last move-drag ended, so the ⊕ button can tell a drag that began on it from a click */
  const dragEndedAt = useRef(0);

  /* ------------------------------ fit to view ------------------------------ */
  // insets keep the scene clear of the floating panels (and of the filmstrip
  // a multi-shot set shows above the bottom bar)
  const hasStrip = useShotBatchStore((s) => s.shots.length > 1);
  // stable renderer props: SceneRenderer is memoised, fresh closures every render defeat it
  const shotCount = useShotBatchStore((s) => s.shots.length);
  const shotIdx = useShotBatchStore((s) => s.shots.findIndex((x) => x.scene.id === scene.id));
  const panoramaIdx = shotIdx >= 0 ? shotIdx : undefined;
  const panoramaTotal = shotCount > 1 ? shotCount : undefined;
  const onBlurZonesChange = useCallback(
    (layerId: string, zones: unknown) => updateLayer(layerId, (l) => ({ ...l, blurZones: zones }) as typeof l),
    [updateLayer]
  );
  // the latest canvas size lives in a ref so `fit` stays referentially stable
  // (a changing `fit` used to re-subscribe the observer and refit mid-resize)
  const canvasRef = useRef(scene.canvas);
  canvasRef.current = scene.canvas;
  const stripRef = useRef(hasStrip);
  stripRef.current = hasStrip;
  const lastFit = useRef({ z: 0, x: 0, y: 0 });
  const fit = useCallback(() => {
    const el = containerRef.current;
    if (!el) return;
    const { width: cw, height: ch } = canvasRef.current;
    const INSET_X = 340;
    const INSET_TOP = 88;
    const INSET_BOTTOM = stripRef.current ? 196 : 84;
    const innerW = el.clientWidth - INSET_X * 2;
    const innerH = el.clientHeight - INSET_TOP - INSET_BOTTOM;
    // a window narrower than both panels leaves a negative inner width: never mirror or hide the canvas
    const z = Math.max(0.05, Math.min(innerW / cw, innerH / ch));
    const x = INSET_X + (innerW - cw * z) / 2;
    const y = INSET_TOP + (innerH - ch * z) / 2;
    // sub-pixel differences re-render the whole stage for nothing and read as a wobble
    const last = lastFit.current;
    if (Math.abs(last.z - z) < 1e-4 && Math.abs(last.x - x) < 0.25 && Math.abs(last.y - y) < 0.25) return;
    lastFit.current = { z, x, y };
    setZoom(z);
    setPan({ x, y });
  }, [setPan, setZoom]);

  // The canvas is sticky: always auto-fit and centered. It only re-lays-out
  // when the canvas dimensions (aspect ratio) or the window change. Fits are
  // coalesced to one per frame so a burst of resize events can't ping-pong.
  useEffect(() => {
    let raf = 0;
    const schedule = () => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(fit);
    };
    fit();
    window.addEventListener("framekit:fit", schedule);
    const el = containerRef.current;
    const ro = el ? new ResizeObserver(schedule) : null;
    if (el && ro) ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("framekit:fit", schedule);
      ro?.disconnect();
    };
  }, [fit, scene.canvas.width, scene.canvas.height, hasStrip]);

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

    const same = (a: { id: string; x: number; y: number; w?: number; h?: number }[], b: typeof a) =>
      a.length === b.length &&
      a.every((o, i) => o.id === b[i].id && Math.abs(o.x - b[i].x) < 0.5 && Math.abs(o.y - b[i].y) < 0.5 && Math.abs((o.w ?? 0) - (b[i].w ?? 0)) < 0.5 && Math.abs((o.h ?? 0) - (b[i].h ?? 0)) < 0.5);
    const nextBoxes = (
      selectedIds.flatMap((id) => {
        const node = host.querySelector(`[data-layer-id="${id}"]`);
        if (!node) return [];
        // full-bleed photo scenes are canvas-sized but mostly transparent: hug
        // the device itself (the renderer marks it), like every other mockup
        const target = node.querySelector("[data-select-anchor]") ?? node;
        const r = (target as HTMLElement).getBoundingClientRect();
        return [{ id, x: r.left - hostRect.left, y: r.top - hostRect.top, w: r.width, h: r.height }];
      })
    );
    setOverlayBoxes((prev) => (same(prev, nextBoxes) ? prev : nextBoxes));

    const nextEmpty = (
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
    setEmptyBoxes((prev) => (same(prev, nextEmpty) ? prev : nextEmpty));
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

  // ⊕ rides on its device: every frame, pin each button to its screen anchor's
  // live position, so it moves WITH the device during a drag, scale, rotate,
  // 3D tilt or motion preview instead of catching up after the device settles
  const emptyKey = emptyBoxes.map((b) => b.id).join();
  useEffect(() => {
    if (!emptyKey) return;
    let raf = 0;
    const tick = () => {
      const host = containerRef.current;
      if (host) {
        const hr = host.getBoundingClientRect();
        for (const [id, btn] of emptyBtnRefs.current) {
          const node = host.querySelector(`[data-layer-id="${id}"]`);
          const a = (node?.querySelector("[data-screen-anchor]") ?? node) as HTMLElement | null;
          if (!a) continue;
          const r = a.getBoundingClientRect();
          const x = `${r.left - hr.left + r.width / 2}px`;
          const y = `${r.top - hr.top + r.height / 2}px`;
          if (btn.style.left !== x) btn.style.left = x;
          if (btn.style.top !== y) btn.style.top = y;
        }
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [emptyKey]);

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

  /** The box a layer visibly occupies on screen: its device (for transparent photo-scene plates) or the whole layer. */
  const hugRect = (id: string): DOMRect | null => {
    const node = layerNode(id);
    if (!node) return null;
    const target = (node.querySelector("[data-select-anchor]") as HTMLElement | null) ?? node;
    return target.getBoundingClientRect();
  };

  /**
   * The layer a pointer is really over. Elements under the pointer are walked
   * top to bottom; a layer whose visible box (not its transparent plate)
   * doesn't contain the point is skipped, so full-bleed photo scenes no longer
   * swallow every click and the device underneath can be grabbed.
   */
  const hitLayer = (clientX: number, clientY: number): string | null => {
    const seen = new Set<string>();
    for (const el of document.elementsFromPoint(clientX, clientY)) {
      const id = el.closest?.("[data-layer-id]")?.getAttribute("data-layer-id");
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const r = hugRect(id);
      if (!r || (clientX >= r.left - 2 && clientX <= r.right + 2 && clientY >= r.top - 2 && clientY <= r.bottom + 2)) return id;
    }
    return null;
  };

  const setDragStyle = (id: string, vars: Record<string, string>) => {
    const node = layerNode(id);
    if (!node) return;
    for (const [name, value] of Object.entries(vars)) node.style.setProperty(name, value);
    const overlay = containerRef.current?.querySelector<HTMLElement>(`[data-layer-overlay="${id}"]`);
    if (overlay && vars["--fk-drag-x"] !== undefined) {
      const sc = vars["--fk-drag-scale"] !== undefined ? ` scale(${vars["--fk-drag-scale"]})` : "";
      overlay.style.transform = `translate(${parseFloat(vars["--fk-drag-x"]) * zoom}px, ${parseFloat(vars["--fk-drag-y"] ?? "0") * zoom}px)${sc}`;
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
    setDragging(true);
    sceneTemporal.getState().pause();
    const onMove = (e: PointerEvent) => {
      const d = dragRef.current;
      if (!d) return;
      if (d.kind === "move") {
        // a press only becomes a drag after a few px, so a click never nudges anything
        if (!d.armed) {
          if (Math.hypot(e.clientX - d.startClientX, e.clientY - d.startClientY) < 4) return;
          d.armed = true;
        }
        const pt = toCanvasPt(e.clientX, e.clientY);
        const anchor = d.starts[d.id];
        let dx = pt.x - d.startCX;
        let dy = pt.y - d.startCY;
        const tol = 7 / zoom;
        let gx: number[] = [];
        let gy: number[] = [];
        if (d.snapBox && !e.altKey) {
          // smart guides: snap the selection's edges/center to the canvas and
          // to every other layer's edges/center (hold ⌥ to move freely)
          const b = d.snapBox;
          const snapAxis = (edges: number[], lines: number[]) => {
            let best: { off: number; at: number } | null = null;
            for (const e0 of edges)
              for (const line of lines) {
                const off = line - e0;
                if (Math.abs(off) < tol && (!best || Math.abs(off) < Math.abs(best.off))) best = { off, at: line };
              }
            return best;
          };
          const bx = snapAxis([b.l + dx, (b.l + b.r) / 2 + dx, b.r + dx], d.snapXs ?? []);
          const by = snapAxis([b.t + dy, (b.t + b.b) / 2 + dy, b.b + dy], d.snapYs ?? []);
          if (bx) {
            dx += bx.off;
            gx = [bx.at];
          }
          if (by) {
            dy += by.off;
            gy = [by.at];
          }
        } else if (!e.altKey) {
          const tolC = 8 / zoom;
          if (Math.abs(anchor.x + dx) < tolC) dx = -anchor.x;
          if (Math.abs(anchor.y + dy) < tolC) dy = -anchor.y;
        }
        d.currentX = dx;
        d.currentY = dy;
        for (const id of Object.keys(d.starts)) setDragStyle(id, { "--fk-drag-x": `${dx}px`, "--fk-drag-y": `${dy}px` });
        setGuides((cur) => (cur.xs.join() === gx.join() && cur.ys.join() === gy.join() ? cur : { xs: gx, ys: gy }));
        return;
      }
      if (d.kind === "scale") {
        const dist = Math.hypot(e.clientX - d.anchorX, e.clientY - d.anchorY);
        const factor = dist / d.startDist;
        const next = Math.min(10, Math.max(0.02, d.scale * factor));
        d.currentScale = Math.round(next * 1000) / 1000;
        const f = d.currentScale / d.scale;
        // the box grows away from the anchor corner: shift the centre to keep that corner still
        d.currentDX = ((d.centerX - d.anchorX) * (f - 1)) / zoom;
        d.currentDY = ((d.centerY - d.anchorY) * (f - 1)) / zoom;
        setDragStyle(d.id, { "--fk-drag-scale": String(f), "--fk-drag-x": `${d.currentDX}px`, "--fk-drag-y": `${d.currentDY}px` });
        return;
      }
      if (d.kind === "rotate") {
        const angle = (Math.atan2(e.clientY - d.centerY, e.clientX - d.centerX) * 180) / Math.PI;
        let next = d.rotate + (angle - d.startAngle);
        if (e.shiftKey) {
          // arrows snap to horizontal/vertical with Shift (user request);
          // everything else keeps the 15° ticks
          const l = useSceneStore.getState().scene.layers.find((x) => x.id === d.id);
          const isArrow = l?.type === "sticker" && "stickerId" in l && l.stickerId.startsWith("annot-arrow");
          const step = isArrow ? 90 : 15;
          next = Math.round(next / step) * step;
        }
        next = Math.round(next * 10) / 10;
        d.currentRotate = next;
        setDragStyle(d.id, { "--fk-drag-rotate": `${next - d.rotate}deg` });
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
    let cancelled = false;
    const onUp = () => {
      const finished = dragRef.current;
      dragRef.current = null;
      setGuides({ xs: [], ys: [] });
      setDragging(false);
      sceneTemporal.getState().resume();
      if (finished && cancelled) {
        // Esc mid-drag: put everything back where it was
        if (finished.kind === "move") for (const id of Object.keys(finished.starts)) clearDragStyle(id);
        else clearDragStyle(finished.id);
      } else if (finished) {
        // a plain click (pointer down and up with nothing changed) must not write: it would push an undo
        // entry, spin up an autosave draft and dismiss the "resume your draft" card
        if (finished.kind === "move") {
          if (finished.armed) dragEndedAt.current = performance.now();
          if (finished.currentX !== 0 || finished.currentY !== 0) {
            setScene((s) => ({
              ...s,
              layers: s.layers.map((l) => finished.starts[l.id]
                ? { ...l, transform: { ...l.transform, x: finished.starts[l.id].x + finished.currentX, y: finished.starts[l.id].y + finished.currentY } }
                : l),
            }));
          }
          for (const id of Object.keys(finished.starts)) clearDragStyle(id);
        } else if (finished.kind === "scale") {
          if (finished.currentScale !== finished.scale) {
            updateLayer(finished.id, (l) => ({
              ...l,
              transform: { ...l.transform, scale: finished.currentScale, x: Math.round((l.transform.x + finished.currentDX) * 10) / 10, y: Math.round((l.transform.y + finished.currentDY) * 10) / 10 },
            }));
          }
          clearDragStyle(finished.id);
        } else if (finished.kind === "rotate") {
          if (finished.currentRotate !== finished.rotate) {
            updateLayer(finished.id, (l) => ({ ...l, transform: { ...l.transform, rotate: finished.currentRotate } }));
          }
          clearDragStyle(finished.id);
        } else {
          if (finished.currentTiltX !== finished.tiltX || finished.currentTiltY !== finished.tiltY) {
            updateLayer(finished.id, (l) => ({ ...l, transform: { ...l.transform, tiltX: finished.currentTiltX, tiltY: finished.currentTiltY } }));
          }
          clearDragStyle(finished.id);
        }
      }
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
      window.removeEventListener("keydown", onKeyDrag);
    };
    const onKeyDrag = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      cancelled = true;
      onUp();
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
    window.addEventListener("keydown", onKeyDrag);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    // clicking away from the screenshot being adjusted finishes adjusting
    if (adjustId) exitAdjust();
    const hitId = hitLayer(e.clientX, e.clientY);
    if (hitId) {
      const id = hitId;
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
      // grouped layers select & move as one: clicking any member grabs the group
      const groupId = scene.layers.find((l) => l.id === id)?.group;
      const members = groupId ? scene.layers.filter((l) => l.group === groupId).map((l) => l.id) : [id];
      const ids = selectedIds.includes(id) ? selectedIds : members;
      if (!selectedIds.includes(id)) {
        if (members.length > 1) useViewStore.setState({ selectedIds: members });
        else select(id);
      }
      const starts: Record<string, { x: number; y: number }> = {};
      for (const l of scene.layers) {
        if (ids.includes(l.id)) starts[l.id] = { x: l.transform.x, y: l.transform.y };
      }
      if (!starts[id]) return;
      const pt = toCanvasPt(e.clientX, e.clientY);
      const W = scene.canvas.width;
      const H = scene.canvas.height;
      const moving = measureLayerBoxes(Object.keys(starts), W);
      const others = measureLayerBoxes(scene.layers.map((l) => l.id).filter((x) => !starts[x]), W);
      const snapBox = moving.length
        ? {
            l: Math.min(...moving.map((b) => b.l)),
            t: Math.min(...moving.map((b) => b.t)),
            r: Math.max(...moving.map((b) => b.r)),
            b: Math.max(...moving.map((b) => b.b)),
          }
        : undefined;
      beginDrag({
        kind: "move",
        id,
        startClientX: e.clientX,
        startClientY: e.clientY,
        armed: false,
        startCX: pt.x,
        startCY: pt.y,
        starts,
        currentX: 0,
        currentY: 0,
        snapBox,
        snapXs: [0, W / 2, W, ...others.flatMap((b) => [b.l, (b.l + b.r) / 2, b.r])],
        snapYs: [0, H / 2, H, ...others.flatMap((b) => [b.t, (b.t + b.b) / 2, b.b])],
      });
    } else {
      // empty area: a click deselects, a drag draws a selection box (⇧ adds to the selection)
      beginMarquee(e);
    }
  };

  /** Rubber-band selection over empty canvas. */
  const beginMarquee = (e: React.PointerEvent) => {
    const host = containerRef.current;
    if (!host) return;
    const hr = host.getBoundingClientRect();
    const x0 = e.clientX - hr.left;
    const y0 = e.clientY - hr.top;
    const base = e.shiftKey ? useViewStore.getState().selectedIds : [];
    let moved = false;
    const rectOf = (ev: PointerEvent) => ({ x0, y0, x1: ev.clientX - hr.left, y1: ev.clientY - hr.top });
    const hitsIn = (box: { x0: number; y0: number; x1: number; y1: number }) => {
      const l = Math.min(box.x0, box.x1) + hr.left;
      const r = Math.max(box.x0, box.x1) + hr.left;
      const t = Math.min(box.y0, box.y1) + hr.top;
      const b = Math.max(box.y0, box.y1) + hr.top;
      const ids = scene.layers
        .filter((layer) => {
          const rect = hugRect(layer.id);
          return !!rect && rect.right >= l && rect.left <= r && rect.bottom >= t && rect.top <= b;
        })
        .map((layer) => layer.id);
      // a group is picked up whole
      const groups = new Set(scene.layers.filter((layer) => ids.includes(layer.id) && layer.group).map((layer) => layer.group));
      return [...new Set([...ids, ...scene.layers.filter((layer) => layer.group && groups.has(layer.group)).map((layer) => layer.id)])];
    };
    const onMove = (ev: PointerEvent) => {
      const box = rectOf(ev);
      if (!moved && Math.hypot(box.x1 - box.x0, box.y1 - box.y0) < 4) return;
      moved = true;
      setMarquee(box);
      useViewStore.setState({ selectedIds: [...new Set([...base, ...hitsIn(box)])] });
    };
    const done = () => {
      if (!moved) select(null);
      setMarquee(null);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", done);
      window.removeEventListener("pointercancel", done);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", done);
    window.addEventListener("pointercancel", done);
  };

  /** Hover feedback: outline the layer under the pointer so it's clear what a click will grab. */
  const hoverRaf = useRef(0);
  const onPointerMoveHover = (e: React.PointerEvent) => {
    if (dragRef.current || e.buttons) return;
    const { clientX, clientY } = e;
    cancelAnimationFrame(hoverRaf.current);
    hoverRaf.current = requestAnimationFrame(() => {
      const id = hitLayer(clientX, clientY);
      setHoverId((cur) => (cur === id ? cur : id));
      const host = containerRef.current?.getBoundingClientRect();
      const r = id && host ? hugRect(id) : null;
      setHoverBox(r && host ? { x: r.left - host.left, y: r.top - host.top, w: r.width, h: r.height } : null);
    });
  };

  const beginHandleDrag = (
    e: React.PointerEvent,
    kind: "scale" | "rotate",
    box: { id: string; x: number; y: number; w: number; h: number },
    corner?: "nw" | "ne" | "sw" | "se"
  ) => {
    e.stopPropagation();
    if (!containerRef.current) return;
    const layer = scene.layers.find((l) => l.id === box.id);
    if (!layer) return;
    const host = containerRef.current.getBoundingClientRect();
    const centerX = host.left + box.x + box.w / 2;
    const centerY = host.top + box.y + box.h / 2;
    if (kind === "scale") {
      // corner handles scale away from the opposite corner (hold ⌥ for from-centre); a turned or
      // tilted layer's on-screen box isn't its real corner, so those scale about their centre
      const t = layer.transform;
      const straight = t.rotate === 0 && t.tiltX === 0 && t.tiltY === 0;
      const fromCorner = !!corner && straight && !e.altKey;
      const anchorX = fromCorner ? host.left + box.x + (corner!.includes("w") ? box.w : 0) : centerX;
      const anchorY = fromCorner ? host.top + box.y + (corner!.includes("n") ? box.h : 0) : centerY;
      beginDrag({
        kind,
        id: box.id,
        centerX,
        centerY,
        anchorX,
        anchorY,
        startDist: Math.max(4, Math.hypot(e.clientX - anchorX, e.clientY - anchorY)),
        scale: t.scale,
        currentScale: t.scale,
        currentDX: 0,
        currentDY: 0,
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
        cursor: threeD ? "grab" : hoverId && selectedIds.includes(hoverId) ? "move" : hoverId ? "pointer" : undefined,
      }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMoveHover}
      onPointerLeave={() => {
        cancelAnimationFrame(hoverRaf.current);
        setHoverId(null);
        setHoverBox(null);
      }}
      onDoubleClick={(e) => {
        // double-click a screenshot to adjust it on the canvas
        const id = hitLayer(e.clientX, e.clientY);
        const layer = id ? scene.layers.find((l) => l.id === id) : undefined;
        if (id && !threeD && canAdjust(layer)) enterAdjust(id);
      }}
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
          willChange: "transform",
        }}
      >
        <div
          className={transparent ? "checkerboard" : undefined}
          style={{ boxShadow: "0 24px 80px rgba(20,20,60,0.22)", borderRadius: 6, overflow: "hidden", contain: "layout paint" }}
        >
        <SceneRenderer
          scene={scene}
          resolveAsset={resolveAsset}
          animateLayerId={entrance.layerId}
          animationNonce={entrance.nonce}
          textTime={textTime}
          onBlurZonesChange={onBlurZonesChange}
          panoramaIdx={panoramaIdx}
          panoramaTotal={panoramaTotal}
        />
        </div>

        <AdjustOverlay host={containerRef} />

        {/* smart guides in canvas space */}
        {guides.xs.map((x) => (
          <div
            key={`gx${x}`}
            style={{ position: "absolute", left: x, top: 0, width: 1 / zoom, height: scene.canvas.height, background: "#f43f5e", pointerEvents: "none" }}
          />
        ))}
        {guides.ys.map((y) => (
          <div
            key={`gy${y}`}
            style={{ position: "absolute", top: y, left: 0, height: 1 / zoom, width: scene.canvas.width, background: "#f43f5e", pointerEvents: "none" }}
          />
        ))}
      </div>

      {/* hover outline: what a click would grab */}
      {hoverBox && hoverId && !dragging && !selectedIds.includes(hoverId) && (
        <div
          className="pointer-events-none absolute rounded-[3px] border-[1.5px] border-violet-500/60 bg-violet-500/[0.06]"
          style={{ left: hoverBox.x, top: hoverBox.y, width: hoverBox.w, height: hoverBox.h }}
        />
      )}

      {/* rubber-band selection box */}
      {marquee && (
        <div
          className="pointer-events-none absolute z-20 border border-violet-500 bg-violet-500/10"
          style={{ left: Math.min(marquee.x0, marquee.x1), top: Math.min(marquee.y0, marquee.y1), width: Math.abs(marquee.x1 - marquee.x0), height: Math.abs(marquee.y1 - marquee.y0) }}
        />
      )}

      {/* selection chrome — app overlay, never inside the renderer */}
      {overlayBoxes.filter((box) => box.id !== adjustId).map((box) => (
        <div
          key={box.id}
          data-layer-overlay={box.id}
          className="pointer-events-none absolute border-2 border-violet-500"
          style={{ left: box.x, top: box.y, width: box.w, height: box.h }}
        >
          {(["nw", "ne", "sw", "se"] as const).map((corner) => (
            <div
              key={corner}
              onPointerDown={(e) => beginHandleDrag(e, "scale", box, corner)}
              className="pointer-events-auto absolute grid h-6 w-6 place-items-center"
              style={{
                left: corner.includes("w") ? -13 : undefined,
                right: corner.includes("e") ? -13 : undefined,
                top: corner.includes("n") ? -13 : undefined,
                bottom: corner.includes("s") ? -13 : undefined,
                cursor: corner === "nw" || corner === "se" ? "nwse-resize" : "nesw-resize",
              }}
            >
              <span className="h-3 w-3 rounded-[3px] border-2 border-violet-500 bg-white shadow-sm" />
            </div>
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

      <AdjustBar host={containerRef} />

      {!dragging && !adjustId && overlayBoxes.length > 0 && (
        <ArrangeBar
          boxes={overlayBoxes}
          hostW={containerRef.current?.clientWidth ?? 1200}
          hostH={containerRef.current?.clientHeight ?? 800}
        />
      )}

      {/* ⊕ add media — centred in every empty device SCREEN (PostSpark-style:
          the white grid placeholder says "empty", the ⊕ says "add here"). */}
      {emptyBoxes.map((b) => (
        <button
          key={b.id}
          ref={(el) => {
            if (el) emptyBtnRefs.current.set(b.id, el);
            else emptyBtnRefs.current.delete(b.id);
          }}
          title="Add screenshot — click, or drag an image in"
          onClick={(e) => {
            e.stopPropagation();
            // a drag that started on the ⊕ moves the device; only a real click adds a screenshot
            if (performance.now() - dragEndedAt.current < 400) return;
            emptyTargetRef.current = b.id;
            emptyPickRef.current?.click();
          }}
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
