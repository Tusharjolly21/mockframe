"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "motion/react";
import { ImagePlus, Loader2, Sparkles, X } from "lucide-react";
import { createId } from "@framekit/scene";
import { quadMatrix3d, type Quad } from "@framekit/renderer";
import { ingestPlatePhoto, saveCustomDevice } from "@/lib/customDevices";
import { detectScreenQuad } from "@/lib/screenDetect";

/**
 * In-editor calibration (the /calibrate tool, productized): turn ANY device
 * photo — the user's own iPhone on their desk, a laptop, a CC0 shot — into a
 * reusable mockup device. Upload → corners auto-detect from alpha when the
 * image has a transparent screen hole, else drag the 4 handles onto the screen
 * → live grid preview through the SAME quadMatrix3d the renderer uses → saved
 * to localStorage and registered, then applied to the current layer.
 */

const PREV_W = 560;
const PREV_H = 430;
const LABELS = ["TL", "TR", "BR", "BL"] as const;

function gridUri(w: number, h: number): string {
  const n = 8;
  let g = "";
  for (let i = 0; i <= n; i++) {
    const x = ((w * i) / n).toFixed(1);
    const y = ((h * i) / n).toFixed(1);
    g += `<line x1='${x}' y1='0' x2='${x}' y2='${h}' stroke='#6366f1' stroke-width='2' opacity='0.5'/>`;
    g += `<line x1='0' y1='${y}' x2='${w}' y2='${y}' stroke='#6366f1' stroke-width='2' opacity='0.5'/>`;
  }
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>` +
    `<rect width='${w}' height='${h}' fill='white' opacity='0.92'/>${g}` +
    `<line x1='0' y1='0' x2='${w}' y2='${h}' stroke='#10b981' stroke-width='3'/></svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function CustomMockupModal({ onClose, onCreated, onToast }: {
  onClose: () => void;
  onCreated: (deviceId: string) => void;
  onToast: (m: string) => void;
}) {
  const [photo, setPhoto] = useState<{ url: string; width: number; height: number } | null>(null);
  const [quad, setQuad] = useState<Quad | null>(null);
  const [radius, setRadius] = useState(24);
  const [name, setName] = useState("My device");
  const [busy, setBusy] = useState(false);
  const [drag, setDrag] = useState<number | null>(null);
  const areaRef = useRef<HTMLDivElement>(null);

  const scale = photo ? Math.min(PREV_W / photo.width, PREV_H / photo.height, 1) : 1;

  async function onFile(f: File) {
    setBusy(true);
    try {
      const p = await ingestPlatePhoto(f);
      setPhoto(p);
      setName(f.name.replace(/\.[a-z0-9]+$/i, "").slice(0, 28) || "My device");
      // auto-detect only works when the image has a transparent screen hole;
      // ordinary photos fall back to a centred seed quad the user drags
      const auto = await detectScreenQuad(p.url, p.width, p.height).catch(() => null);
      if (auto) {
        setQuad(auto);
        onToast("Screen detected automatically ✨");
      } else {
        setQuad([
          [p.width * 0.3, p.height * 0.28],
          [p.width * 0.7, p.height * 0.28],
          [p.width * 0.7, p.height * 0.72],
          [p.width * 0.3, p.height * 0.72],
        ]);
      }
      setRadius(Math.round(p.width * 0.015));
    } catch (e) {
      onToast(e instanceof Error ? e.message : "Couldn't read that image");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (drag === null || !photo) return;
    const onMove = (e: PointerEvent) => {
      const r = areaRef.current?.getBoundingClientRect();
      if (!r) return;
      const x = Math.max(0, Math.min(photo.width, (e.clientX - r.left) / scale));
      const y = Math.max(0, Math.min(photo.height, (e.clientY - r.top) / scale));
      setQuad((q) => (q ? (q.map((c, i) => (i === drag ? [Math.round(x), Math.round(y)] : c)) as Quad) : q));
    };
    const onUp = () => setDrag(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, photo, scale]);

  const boxW = useMemo(() => (quad ? Math.max(...quad.map((c) => c[0])) - Math.min(...quad.map((c) => c[0])) : 0), [quad]);
  const boxH = useMemo(() => (quad ? Math.max(...quad.map((c) => c[1])) - Math.min(...quad.map((c) => c[1])) : 0), [quad]);
  const grid = useMemo(() => (boxW && boxH ? gridUri(Math.round(boxW), Math.round(boxH)) : null), [boxW, boxH]);

  function save() {
    if (!photo || !quad) return;
    const id = `custom-${createId()}`;
    saveCustomDevice({
      id,
      name: name.trim() || "My device",
      plate: photo.url,
      plateW: photo.width,
      plateH: photo.height,
      quad,
      radius,
      createdAt: Date.now(),
    });
    onCreated(id);
    onToast(`"${name.trim() || "My device"}" added to Mockups ✨`);
    onClose();
  }

  const ui = (
    <motion.div
      className="pointer-events-auto fixed inset-0 z-[90] grid place-items-center bg-black/45 p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <motion.div
        className="fk-card flex max-h-[92vh] w-[min(920px,94vw)] flex-col overflow-hidden rounded-3xl p-0"
        initial={{ scale: 0.97, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.98, opacity: 0 }}
        transition={{ type: "spring", stiffness: 460, damping: 34 }}
      >
        <div className="flex items-center gap-3 border-b border-[#ececf2] px-5 py-3.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
            <ImagePlus size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold text-[#17171c]">Your device photo</h2>
            <p className="text-[11.5px] text-[#8a8a94]">Photograph your own device, mark the screen once, reuse it forever — fully yours.</p>
          </div>
          <button onClick={onClose} className="fk-press grid h-8 w-8 place-items-center rounded-xl text-[#8a8a94] hover:bg-black/6">
            <X size={16} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 gap-4 overflow-y-auto p-5">
          {/* preview / upload */}
          <div className="grid flex-1 place-items-center">
            {photo && quad ? (
              <div ref={areaRef} className="relative" style={{ width: photo.width * scale, height: photo.height * scale }}>
                <div style={{ position: "absolute", inset: 0, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={photo.url} alt="" style={{ position: "absolute", top: 0, left: 0, width: photo.width, height: photo.height }} />
                  {grid && (
                    <div
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        width: boxW,
                        height: boxH,
                        transform: quadMatrix3d(boxW, boxH, quad),
                        transformOrigin: "0 0",
                        overflow: "hidden",
                        borderRadius: radius,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={grid} alt="" style={{ width: boxW, height: boxH, display: "block" }} />
                    </div>
                  )}
                </div>
                <svg width={photo.width * scale} height={photo.height * scale} className="pointer-events-none absolute inset-0">
                  <polygon
                    points={quad.map((c) => `${c[0] * scale},${c[1] * scale}`).join(" ")}
                    fill="none"
                    stroke="#10b981"
                    strokeWidth={2}
                    strokeDasharray="6 4"
                  />
                </svg>
                {quad.map((c, i) => (
                  <button
                    key={i}
                    data-corner={LABELS[i]}
                    onPointerDown={(e) => {
                      e.preventDefault();
                      setDrag(i);
                    }}
                    className="absolute grid h-7 w-7 -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center rounded-full border-2 border-white bg-emerald-500 text-[9px] font-bold text-white shadow-md active:cursor-grabbing"
                    style={{ left: c[0] * scale, top: c[1] * scale, touchAction: "none" }}
                    title={`Drag the ${LABELS[i]} screen corner`}
                  >
                    {LABELS[i]}
                  </button>
                ))}
              </div>
            ) : (
              <label className="fk-press grid cursor-pointer place-items-center gap-2 rounded-2xl border-2 border-dashed border-[#d6d6e0] px-16 py-16 text-center hover:border-[#a9a9ba]">
                {busy ? <Loader2 size={22} className="animate-spin text-[#8a8a94]" /> : <ImagePlus size={22} className="text-[#8a8a94]" />}
                <span className="text-[14px] font-bold text-[#17171c]">Upload a device photo</span>
                <span className="max-w-64 text-[11.5px] leading-snug text-[#8a8a94]">
                  Your own phone / laptop / tablet on a desk works great. You own the photo — no licensing worries.
                </span>
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              </label>
            )}
          </div>

          {/* controls */}
          {photo && quad && (
            <div className="w-56 shrink-0 space-y-4">
              <label className="block">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#8a8a94]">Name</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-xl border border-[#e4e4ec] bg-white px-3 py-2 text-[13px] text-[#17171c] outline-none focus:border-[#17171c]"
                />
              </label>
              <label className="block">
                <span className="mb-1 flex justify-between text-[11px] font-semibold uppercase tracking-wide text-[#8a8a94]">
                  Screen corner radius <em className="not-italic tabular-nums">{radius}</em>
                </span>
                <input type="range" min={0} max={Math.round(Math.min(boxW, boxH) / 2)} value={radius} onChange={(e) => setRadius(+e.target.value)} className="w-full" />
              </label>
              <div className="rounded-xl bg-[#f4f4f8] p-3 text-[11.5px] leading-relaxed text-[#6b6b76]">
                Drag the <b>4 corners</b> exactly onto the screen&apos;s corners. The grid shows how a screenshot will warp — straight lines = correct perspective.
              </div>
              <details className="rounded-xl bg-[#f4f4f8] p-3 text-[11px] text-[#6b6b76]">
                <summary className="cursor-pointer font-semibold">Fine-tune (px)</summary>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  {quad.map((c, i) => (
                    <div key={i}>
                      <div className="mb-0.5 font-bold text-emerald-600">{LABELS[i]}</div>
                      <div className="flex gap-1">
                        <input
                          type="number"
                          value={c[0]}
                          onChange={(e) => setQuad((q) => (q ? (q.map((p, k) => (k === i ? [+e.target.value, p[1]] : p)) as Quad) : q))}
                          className="w-full rounded border border-[#e4e4ec] bg-white px-1 py-0.5"
                        />
                        <input
                          type="number"
                          value={c[1]}
                          onChange={(e) => setQuad((q) => (q ? (q.map((p, k) => (k === i ? [p[0], +e.target.value] : p)) as Quad) : q))}
                          className="w-full rounded border border-[#e4e4ec] bg-white px-1 py-0.5"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </details>
              <label className="fk-press block cursor-pointer rounded-xl border border-[#e4e4ec] bg-white px-3 py-2 text-center text-[12px] font-semibold text-[#17171c] hover:border-[#17171c]">
                Change photo
                <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onFile(e.target.files[0])} />
              </label>
            </div>
          )}
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-[#ececf2] px-5 py-3">
          <button onClick={onClose} className="fk-press rounded-xl px-4 py-2 text-[13px] font-semibold text-[#6b6b76] hover:bg-black/5">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={!photo || !quad}
            className="fk-press flex items-center gap-2 rounded-xl bg-[#17171c] px-5 py-2.5 text-[13px] font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Sparkles size={14} />
            Add to canvas
          </button>
        </div>
      </motion.div>
    </motion.div>
  );

  return typeof document !== "undefined" ? createPortal(ui, document.body) : null;
}
