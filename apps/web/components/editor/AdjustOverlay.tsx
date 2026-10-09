"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { getDevice } from "@framekit/devices";
import type { MockupLayer } from "@framekit/scene";
import { isLandscape, mediaCrop, mediaPlacement, plateToBoxDelta, plateWarp, quadMatrix3d, quadSize, uncroppedBox } from "@framekit/renderer";
import { Check, Minus, Plus, RotateCcw } from "lucide-react";
import { resolveAsset } from "@/lib/assets";
import {
  beginGesture,
  canAdjust,
  clampMediaScale,
  clientToLocal,
  cropForAspect,
  dragCrop,
  endGesture,
  exitAdjust,
  liveUpdate,
  withCrop,
  zoomCrop,
  type Crop,
  type CropHandle,
} from "@/lib/adjust";
import { useSceneStore, useViewStore } from "@/lib/store";

type Rect = { x: number; y: number; w: number; h: number };

const ACCENT = "#7c3aed";
const HOLE_OUTER = "M-100000 -100000 H100000 V100000 H-100000 Z";
const rectPath = (r: Rect) => `M${r.x} ${r.y} H${r.x + r.w} V${r.y + r.h} H${r.x} Z`;

/**
 * Everything the overlay needs about one layer, in the layer's own content
 * coordinates (before the layer's scale/rotate). `space` is where the screen
 * and image rects live: the device frame (SVG), a photo plate's screen box
 * (warped by `warp`), or a frameless shot's crop window.
 */
type Geo =
  | { kind: "device"; screen: Rect; img: Rect; full: Rect; hole: string; warp?: string; unit: number; snapW: number; snapH: number }
  | { kind: "shot"; W: number; H: number; crop: Crop; unit: number };

function geometry(layer: MockupLayer, zoom: number): { geo: Geo; url: string } | null {
  const media = layer.media;
  const asset = media ? resolveAsset(media.assetId) : undefined;
  if (!media || !asset) return null;
  const unit = 1 / (zoom * layer.transform.scale || 1);
  const c = mediaCrop(media);
  if (!layer.deviceId) {
    return { geo: { kind: "shot", W: asset.width, H: asset.height, crop: c, unit }, url: asset.url };
  }
  const device = getDevice(layer.deviceId);
  if (!device) return null;
  // landscape devices render the screenshot counter-rotated; on-canvas
  // pan/zoom isn't rotation-aware yet, so Fill/Fit from the panel apply instead
  if (isLandscape(layer, device)) return null;
  if (device.plate) {
    const pw = plateWarp(device);
    const p = mediaPlacement({ x: 0, y: 0, width: pw.sw, height: pw.sh }, asset, media);
    const k = pw.sw / Math.max(1, quadSize(pw.warpQuad).w);
    const hole = { x: pw.hole.x, y: pw.hole.y, w: pw.hole.width, h: pw.hole.height };
    return {
      geo: {
        kind: "device",
        screen: hole,
        img: p,
        full: uncroppedBox(p, c),
        hole: rectPath(hole),
        warp: quadMatrix3d(pw.sw, pw.sh, pw.warpQuad),
        unit: unit * k,
        snapW: pw.sw,
        snapH: pw.sh,
      },
      url: asset.url,
    };
  }
  const r = device.frame.screenRect;
  const p = mediaPlacement(r, asset, media);
  return {
    geo: {
      kind: "device",
      screen: { x: r.x, y: r.y, w: r.width, h: r.height },
      img: p,
      full: uncroppedBox(p, c),
      hole: device.frame.maskPath,
      unit,
      snapW: r.width,
      snapH: r.height,
    },
    url: asset.url,
  };
}

/** a dimmed copy of the screenshot, showing what falls outside the screen / crop */
function Ghost({ url, box, clip, full }: { url: string; box: Rect; clip: Rect; full: Rect }) {
  return (
    <div style={{ position: "absolute", left: box.x, top: box.y, width: box.w, height: box.h, overflow: "hidden" }}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt=""
        draggable={false}
        style={{
          position: "absolute",
          left: full.x - clip.x,
          top: full.y - clip.y,
          width: full.w,
          height: full.h,
          maxWidth: "none",
          opacity: 0.42,
          filter: "saturate(0.7)",
        }}
      />
    </div>
  );
}

/**
 * On-canvas screenshot adjusting, drawn in CANVAS space right over the layer:
 * drag to pan the screenshot inside its screen, pull a corner or scroll to zoom,
 * and (frameless shots) drag edges to crop. Lives outside the renderer, so the
 * export never sees it.
 */
export function AdjustOverlay({ host }: { host: React.RefObject<HTMLDivElement | null> }) {
  const adjustId = useViewStore((s) => s.adjustId);
  const zoom = useViewStore((s) => s.zoom);
  const selectedIds = useViewStore((s) => s.selectedIds);
  const threeD = useViewStore((s) => s.threeD);
  const canvas = useSceneStore((s) => s.scene.canvas);
  const layer = useSceneStore((s) => s.scene.layers.find((l) => l.id === adjustId));
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  const imgRef = useRef<HTMLDivElement>(null);
  const wheelTimer = useRef<number | undefined>(undefined);

  // leave adjust mode when the layer goes away, loses its screenshot, or the
  // selection moves elsewhere
  useEffect(() => {
    if (!adjustId) return;
    if (!canAdjust(layer) || !selectedIds.includes(adjustId) || threeD) exitAdjust();
  }, [adjustId, layer, selectedIds, threeD]);

  // the layer box's untransformed size (offsetWidth ignores CSS transforms)
  useLayoutEffect(() => {
    if (!adjustId) return setSize(null);
    const node = host.current?.querySelector<HTMLElement>(`[data-layer-id="${adjustId}"]`);
    if (!node) return;
    const next = { w: node.offsetWidth, h: node.offsetHeight };
    setSize((cur) => (cur && cur.w === next.w && cur.h === next.h ? cur : next));
  }, [adjustId, host, layer]);

  // Esc / Enter finish adjusting (before the editor's own shortcuts see them)
  useEffect(() => {
    if (!adjustId) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      if (e.key === "Escape" || e.key === "Enter") {
        e.preventDefault();
        e.stopImmediatePropagation();
        exitAdjust();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [adjustId]);

  const g = layer?.type === "mockup" ? geometry(layer, zoom) : null;
  const locked = useViewStore((s) => s.cropAspect);

  // scroll zooms the screenshot (devices: about the cursor; shots: the crop window)
  useEffect(() => {
    const el = host.current;
    if (!el || !adjustId) return;
    const onWheel = (e: WheelEvent) => {
      const l = useSceneStore.getState().scene.layers.find((x) => x.id === adjustId);
      if (!canAdjust(l)) return;
      e.preventDefault();
      const k = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0018));
      beginGesture(adjustId);
      if (!l.deviceId) {
        const asset = resolveAsset(l.media!.assetId)!;
        const z = zoomCrop(mediaCrop(l.media), k);
        liveUpdate(adjustId, (cur) => {
          const next = withCrop(cur, z.crop, asset.width, asset.height);
          return { ...next, transform: { ...next.transform, scale: Math.round(cur.transform.scale * z.k * 1000) / 1000 } };
        });
      } else {
        const s0 = l.media!.scale;
        const s1 = clampMediaScale(s0 * k);
        const kk = s1 / s0;
        const r = imgRef.current?.getBoundingClientRect();
        let vx = 0;
        let vy = 0;
        if (r) {
          [vx, vy] = toBox(l, zoom, e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
        }
        liveUpdate(adjustId, (cur) =>
          cur.media
            ? {
                ...cur,
                media: {
                  ...cur.media,
                  scale: s1,
                  offsetX: Math.round(cur.media.offsetX - vx * (kk - 1)),
                  offsetY: Math.round(cur.media.offsetY - vy * (kk - 1)),
                },
              }
            : cur
        );
      }
      window.clearTimeout(wheelTimer.current);
      wheelTimer.current = window.setTimeout(endGesture, 350);
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      el.removeEventListener("wheel", onWheel);
      window.clearTimeout(wheelTimer.current);
    };
  }, [adjustId, host, zoom]);

  if (!adjustId || !layer || layer.type !== "mockup" || !g || !size) return null;
  const t = layer.transform;
  const { geo, url } = g;

  /* ---------------------------- pointer gestures ---------------------------- */
  const track = (e: React.PointerEvent, onMove: (dx: number, dy: number, ev: PointerEvent) => void) => {
    if (e.button !== 0) return;
    e.stopPropagation();
    e.preventDefault();
    const sx = e.clientX;
    const sy = e.clientY;
    let moved = false;
    const move = (ev: PointerEvent) => {
      if (!moved && Math.hypot(ev.clientX - sx, ev.clientY - sy) < 2) return;
      if (!moved) beginGesture(layer.id);
      moved = true;
      onMove(ev.clientX - sx, ev.clientY - sy, ev);
    };
    const up = () => {
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
      if (moved) endGesture();
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };

  const startPan = (e: React.PointerEvent) => {
    const m0 = layer.media!;
    if (geo.kind === "shot") {
      const c0 = geo.crop;
      track(e, (dx, dy) => {
        const [lx, ly] = clientToLocal(layer, zoom, dx, dy);
        // dragging slides the IMAGE under a fixed crop window
        const x = Math.max(0, Math.min(1 - c0.w, c0.x - lx / geo.W));
        const y = Math.max(0, Math.min(1 - c0.h, c0.y - ly / geo.H));
        liveUpdate(layer.id, (l) => (l.media ? { ...l, media: { ...l.media, crop: { ...c0, x, y } } } : l));
      });
      return;
    }
    const { img, screen, snapW, snapH, unit } = geo;
    track(e, (dx, dy, ev) => {
      const [bx, by] = toBox(layer, zoom, dx, dy);
      const snap = (v: number, size: number, box: number) => {
        if (ev.altKey) return v;
        const tol = 8 * unit;
        for (const c of [0, (size - box) / 2, -(size - box) / 2]) if (Math.abs(v - c) < tol) return c;
        return v;
      };
      const lim = (size: number, box: number) => (size + box) / 2 - 24 * unit;
      const ox = Math.max(-lim(img.w, screen.w), Math.min(lim(img.w, screen.w), snap(m0.offsetX + bx, img.w, snapW)));
      const oy = Math.max(-lim(img.h, screen.h), Math.min(lim(img.h, screen.h), snap(m0.offsetY + by, img.h, snapH)));
      liveUpdate(layer.id, (l) => (l.media ? { ...l, media: { ...l.media, offsetX: Math.round(ox * 10) / 10, offsetY: Math.round(oy * 10) / 10 } } : l));
    });
  };

  const startZoom = (e: React.PointerEvent) => {
    const r = imgRef.current?.getBoundingClientRect();
    if (!r) return;
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const d0 = Math.max(6, Math.hypot(e.clientX - cx, e.clientY - cy));
    const s0 = layer.media!.scale;
    track(e, (dx, dy) => {
      const d = Math.hypot(e.clientX + dx - cx, e.clientY + dy - cy);
      const scale = clampMediaScale((s0 * d) / d0);
      liveUpdate(layer.id, (l) => (l.media ? { ...l, media: { ...l.media, scale } } : l));
    });
  };

  const startCrop = (e: React.PointerEvent, handle: CropHandle) => {
    if (geo.kind !== "shot") return;
    const c0 = geo.crop;
    const base = layer;
    // corners keep the current shape with ⇧ (or always, if a ratio is locked)
    track(e, (dx, dy, ev) => {
      const [lx, ly] = clientToLocal(base, zoom, dx, dy);
      const keep = locked ?? (ev.shiftKey ? (c0.w * geo.W) / (c0.h * geo.H) : undefined);
      const next = dragCrop(c0, handle, lx / geo.W, ly / geo.H, keep, geo.W / geo.H);
      liveUpdate(layer.id, () => withCrop(base, next, geo.W, geo.H));
    });
  };

  /* --------------------------------- drawing -------------------------------- */
  const u = geo.unit;
  const handleStyle = (x: number, y: number, cursor: string, round = false): CSSProperties => ({
    position: "absolute",
    left: x - 7 * u,
    top: y - 7 * u,
    width: 14 * u,
    height: 14 * u,
    borderRadius: round ? "50%" : 3 * u,
    background: "#fff",
    border: `${2 * u}px solid ${ACCENT}`,
    boxShadow: `0 ${1 * u}px ${4 * u}px rgba(20,20,40,0.35)`,
    cursor,
    pointerEvents: "auto",
    touchAction: "none",
  });

  const root: CSSProperties = {
    position: "absolute",
    left: canvas.width / 2,
    top: canvas.height / 2,
    width: size.w,
    height: size.h,
    transform: `translate(-50%, -50%) translate(${t.x}px, ${t.y}px) rotate(${t.rotate}deg) scale(${t.scale})`,
    transformOrigin: "center",
    pointerEvents: "none",
    zIndex: 5,
  };
  const tilt: CSSProperties = {
    position: "absolute",
    inset: 0,
    transform: `perspective(${t.perspective}px) rotateX(${t.tiltX}deg) rotateY(${t.tiltY}deg)`,
  };

  if (geo.kind === "shot") {
    const { W, H, crop } = geo;
    // layer box = crop window (+ symmetric style padding); image px 1:1
    const win = { x: (size.w - crop.w * W) / 2, y: (size.h - crop.h * H) / 2, w: crop.w * W, h: crop.h * H };
    const full = { x: win.x - crop.x * W, y: win.y - crop.y * H, w: W, h: H };
    const handles: [CropHandle, number, number, string][] = [
      ["nw", win.x, win.y, "nwse-resize"],
      ["n", win.x + win.w / 2, win.y, "ns-resize"],
      ["ne", win.x + win.w, win.y, "nesw-resize"],
      ["e", win.x + win.w, win.y + win.h / 2, "ew-resize"],
      ["se", win.x + win.w, win.y + win.h, "nwse-resize"],
      ["s", win.x + win.w / 2, win.y + win.h, "ns-resize"],
      ["sw", win.x, win.y + win.h, "nesw-resize"],
      ["w", win.x, win.y + win.h / 2, "ew-resize"],
    ];
    return (
      <div data-adjust-overlay style={root}>
        <div style={tilt}>
          <div style={{ position: "absolute", left: 0, top: 0, clipPath: `path(evenodd, "${HOLE_OUTER} ${rectPath(win)}")` }}>
            <Ghost url={url} box={full} clip={full} full={full} />
          </div>
          <div
            data-adjust-extent
            onPointerDown={startPan}
            onDoubleClick={() => exitAdjust()}
            style={{ position: "absolute", left: full.x, top: full.y, width: full.w, height: full.h, outline: `${1.5 * u}px dashed rgba(124,58,237,0.55)`, cursor: "move", pointerEvents: "auto", touchAction: "none" }}
          />
          {/* crop window: rule-of-thirds grid + edge handles */}
          <div
            style={{
              position: "absolute",
              left: win.x,
              top: win.y,
              width: win.w,
              height: win.h,
              border: `${2 * u}px solid ${ACCENT}`,
              boxSizing: "border-box",
              backgroundImage: `linear-gradient(90deg, transparent calc(33.33% - ${0.5 * u}px), rgba(255,255,255,0.7) calc(33.33% - ${0.5 * u}px), rgba(255,255,255,0.7) calc(33.33% + ${0.5 * u}px), transparent calc(33.33% + ${0.5 * u}px), transparent calc(66.66% - ${0.5 * u}px), rgba(255,255,255,0.7) calc(66.66% - ${0.5 * u}px), rgba(255,255,255,0.7) calc(66.66% + ${0.5 * u}px), transparent calc(66.66% + ${0.5 * u}px)), linear-gradient(180deg, transparent calc(33.33% - ${0.5 * u}px), rgba(255,255,255,0.7) calc(33.33% - ${0.5 * u}px), rgba(255,255,255,0.7) calc(33.33% + ${0.5 * u}px), transparent calc(33.33% + ${0.5 * u}px), transparent calc(66.66% - ${0.5 * u}px), rgba(255,255,255,0.7) calc(66.66% - ${0.5 * u}px), rgba(255,255,255,0.7) calc(66.66% + ${0.5 * u}px), transparent calc(66.66% + ${0.5 * u}px))`,
              pointerEvents: "none",
            }}
          />
          {handles.filter(([h]) => !locked || h.length === 2).map(([h, x, y, cursor]) => (
            <div key={h} data-crop-handle={h} onPointerDown={(e) => startCrop(e, h)} style={handleStyle(x, y, cursor, h.length === 1)} />
          ))}
        </div>
      </div>
    );
  }

  const { screen, img, full, hole, warp } = geo;
  const space: CSSProperties = warp
    ? { position: "absolute", left: 0, top: 0, width: 1, height: 1, transform: warp, transformOrigin: "0 0" }
    : { position: "absolute", left: (size.w - (getDevice(layer.deviceId!)?.frame.width ?? size.w)) / 2, top: (size.h - (getDevice(layer.deviceId!)?.frame.height ?? size.h)) / 2 };
  const corners: [number, number, string][] = [
    [img.x, img.y, "nwse-resize"],
    [img.x + img.w, img.y, "nesw-resize"],
    [img.x + img.w, img.y + img.h, "nwse-resize"],
    [img.x, img.y + img.h, "nesw-resize"],
  ];
  return (
    <div data-adjust-overlay style={root}>
      <div style={tilt}>
        <div style={space}>
          {/* what's hidden outside the screen, dimmed */}
          <div style={{ position: "absolute", left: 0, top: 0, clipPath: `path(evenodd, "${HOLE_OUTER} ${hole}")` }}>
            <Ghost url={url} box={img} clip={img} full={full} />
          </div>
          {/* the screen window */}
          <div
            style={{ position: "absolute", left: screen.x, top: screen.y, width: screen.w, height: screen.h, outline: `${1.5 * geo.unit}px solid rgba(124,58,237,0.5)`, pointerEvents: "none" }}
          />
          {/* drag anywhere on the screenshot or the screen to pan */}
          <div
            onPointerDown={startPan}
            onDoubleClick={() => exitAdjust()}
            style={{ position: "absolute", left: screen.x, top: screen.y, width: screen.w, height: screen.h, cursor: "move", pointerEvents: "auto", touchAction: "none" }}
          />
          <div
            ref={imgRef}
            data-adjust-image
            data-adjust-extent
            onPointerDown={startPan}
            onDoubleClick={() => exitAdjust()}
            style={{ position: "absolute", left: img.x, top: img.y, width: img.w, height: img.h, outline: `${2 * geo.unit}px solid ${ACCENT}`, cursor: "move", pointerEvents: "auto", touchAction: "none" }}
          />
          {corners.map(([x, y, cursor], i) => (
            <div key={i} data-zoom-handle={i} onPointerDown={startZoom} style={handleStyle(x, y, cursor)} />
          ))}
        </div>
      </div>
    </div>
  );
}

/** client delta → the device's media space (frame px, or a photo plate's screen box) */
function toBox(layer: MockupLayer, zoom: number, dx: number, dy: number): [number, number] {
  const [lx, ly] = clientToLocal(layer, zoom, dx, dy);
  const dev = layer.deviceId ? getDevice(layer.deviceId) : undefined;
  if (dev?.plate) {
    const pw = plateWarp(dev);
    return plateToBoxDelta(pw.sw, pw.sh, pw.warpQuad, lx, ly);
  }
  return [lx, ly];
}

/* ------------------------------ floating controls ------------------------------ */

const ASPECTS: [string, number | null][] = [
  ["Free", null],
  ["1:1", 1],
  ["4:5", 4 / 5],
  ["9:16", 9 / 16],
  ["16:9", 16 / 9],
];

/** the pill under the layer while adjusting: presets, zoom, reset, done */
export function AdjustBar({ host }: { host: React.RefObject<HTMLDivElement | null> }) {
  const adjustId = useViewStore((s) => s.adjustId);
  const cropAspect = useViewStore((s) => s.cropAspect);
  const zoom = useViewStore((s) => s.zoom);
  const pan = useViewStore((s) => s.pan);
  const layer = useSceneStore((s) => s.scene.layers.find((l) => l.id === adjustId));
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useLayoutEffect(() => {
    const measure = () => {
      const el = host.current;
      // below both the layer and the whole ghost (which can reach past the layer)
      const nodes = adjustId
        ? [el?.querySelector<HTMLElement>(`[data-layer-id="${adjustId}"]`), el?.querySelector<HTMLElement>("[data-adjust-overlay] [data-adjust-extent]")].filter(
            (n): n is HTMLElement => !!n
          )
        : [];
      if (!el || !nodes.length) return setPos(null);
      const hr = el.getBoundingClientRect();
      const rs = nodes.map((n) => n.getBoundingClientRect());
      const r = {
        left: Math.min(...rs.map((x) => x.left)),
        right: Math.max(...rs.map((x) => x.right)),
        top: Math.min(...rs.map((x) => x.top)),
        bottom: Math.max(...rs.map((x) => x.bottom)),
      };
      const width = r.right - r.left;
      const b = r.bottom - hr.top;
      const t = r.top - hr.top;
      const top = b + 120 < hr.height ? b + 16 : t - 70 >= 84 ? t - 70 : hr.height - 132;
      const left = Math.min(Math.max(r.left - hr.left + width / 2, 260), hr.width - 260);
      setPos((cur) => (cur && cur.left === left && cur.top === top ? cur : { left, top }));
    };
    measure();
    // the overlay mounts a frame later (it measures the layer first)
    const raf = requestAnimationFrame(measure);
    return () => cancelAnimationFrame(raf);
  }, [adjustId, layer, zoom, pan, host]);

  if (!adjustId || !layer || layer.type !== "mockup" || !layer.media || !pos) return null;
  const media = layer.media;
  const shot = !layer.deviceId;
  const asset = resolveAsset(media.assetId);

  const chip = (label: string, active: boolean, onClick: () => void, title?: string) => (
    <button
      key={label}
      title={title}
      onClick={onClick}
      className={`fk-press h-7 rounded-lg px-2.5 text-[11.5px] font-semibold transition-colors ${
        active ? "bg-[#17171c] text-white" : "text-[#4a4a55] hover:bg-black/[0.06] hover:text-[#17171c]"
      }`}
    >
      {label}
    </button>
  );
  const icon = (key: string, Icon: typeof Plus, title: string, onClick: () => void) => (
    <button key={key} title={title} onClick={onClick} className="fk-press grid h-7 w-7 place-items-center rounded-lg text-[#4a4a55] hover:bg-black/[0.06] hover:text-[#17171c]">
      <Icon size={14} />
    </button>
  );
  const sep = (k: string) => <span key={k} className="mx-1 h-4 w-px bg-black/10" />;
  const setMedia = (patch: Partial<NonNullable<MockupLayer["media"]>>) =>
    updateLayer(layer.id, (l) => (l.type === "mockup" && l.media ? { ...l, media: { ...l.media, ...patch } } : l));
  const zoomBy = (k: number) => setMedia({ scale: clampMediaScale(media.scale * k) });

  return (
    <div
      data-adjust-bar
      onPointerDown={(e) => e.stopPropagation()}
      className="fk-card absolute z-20 flex -translate-x-1/2 flex-col items-center gap-1 rounded-2xl bg-white/95 px-1.5 pb-1.5 pt-1 shadow-[0_10px_32px_rgba(20,20,40,0.18)] backdrop-blur"
      style={{ left: pos.left, top: pos.top }}
    >
      <div className="flex items-center gap-0.5">
        {shot ? (
          <>
            {ASPECTS.map(([label, a]) =>
              chip(label, cropAspect === a, () => {
                useViewStore.getState().setCropAspect(a);
                if (!asset) return;
                if (a === null) return;
                updateLayer(layer.id, (l) =>
                  l.type === "mockup" ? withCrop(l, cropForAspect(a, asset.width, asset.height, mediaCrop(l.media)), asset.width, asset.height) : l
                );
              }, a ? `Crop to ${label}` : "Crop freely")
            )}
            {sep("s1")}
            {icon("reset", RotateCcw, "Show the whole screenshot", () => {
              useViewStore.getState().setCropAspect(null);
              if (asset) updateLayer(layer.id, (l) => (l.type === "mockup" ? withCrop(l, { x: 0, y: 0, w: 1, h: 1 }, asset.width, asset.height) : l));
            })}
          </>
        ) : (
          <>
            {chip("Fill", media.fit === "cover", () => setMedia({ fit: "cover", offsetX: 0, offsetY: 0, scale: 1 }), "Cover the whole screen")}
            {chip("Fit", media.fit === "contain", () => setMedia({ fit: "contain", offsetX: 0, offsetY: 0, scale: 1 }), "Show the whole screenshot")}
            {sep("s1")}
            {icon("out", Minus, "Zoom out", () => zoomBy(1 / 1.1))}
            <span className="w-11 text-center font-mono text-[11px] font-semibold tabular-nums text-[#17171c]">{Math.round(media.scale * 100)}%</span>
            {icon("in", Plus, "Zoom in", () => zoomBy(1.1))}
            {sep("s2")}
            {icon("reset", RotateCcw, "Reset position and zoom", () => setMedia({ offsetX: 0, offsetY: 0, scale: 1 }))}
          </>
        )}
        <button
          data-adjust-done
          onClick={() => exitAdjust()}
          className="fk-press ml-1 flex h-7 items-center gap-1 rounded-lg bg-violet-600 px-3 text-[11.5px] font-bold text-white hover:bg-violet-700"
        >
          <Check size={13} /> Done
        </button>
      </div>
      <p className="px-2 text-[10.5px] text-[#8a8a96]">
        {shot
          ? "Drag the edges to crop, drag inside to slide the image. Hold ⇧ to keep the shape."
          : "Drag to move the screenshot. Scroll or pull a corner to zoom. Hold ⌥ to skip snapping."}
      </p>
    </div>
  );
}
