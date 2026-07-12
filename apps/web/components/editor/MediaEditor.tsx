"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { FlipHorizontal2, RotateCw, Scan, X } from "lucide-react";
import type { Quad } from "@framekit/renderer";
import { ingestFile, resolveAsset } from "@/lib/assets";
import { unwarpQuadToCanvas, unwarpSize } from "@/lib/perspective";
import { SliderRow } from "./ui";

/**
 * Screenshot editor (PostSpark's cropper): crop with aspect presets, 90°
 * rotate, flip, brightness / contrast / saturation — plus STRAIGHTEN, the
 * /calibrate 4-corner tool turned inside-out: mark the corners of a screen
 * photographed at an angle and it unwarps flat (scanner-style perspective
 * crop). All client-side canvas ops; Apply re-ingests as a new local asset.
 */

const ASPECTS: { id: string; label: string; ratio: number | null }[] = [
  { id: "free", label: "Free", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:3", label: "4:3", ratio: 4 / 3 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "3:4", label: "3:4", ratio: 3 / 4 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
];

interface Crop {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function MediaEditor({
  assetId,
  onApply,
  onClose,
  note,
}: {
  assetId: string;
  onApply: (newAssetId: string) => void;
  onClose: () => void;
  /** optional banner shown under the header (e.g. "editing the screenshot behind a realistic render") */
  note?: string;
}) {
  const src = resolveAsset(assetId)?.url;
  const [img, setImg] = useState<HTMLImageElement | null>(null);
  const [mode, setMode] = useState<"crop" | "straighten">("crop");
  const [rot, setRot] = useState(0); // 0 | 90 | 180 | 270
  const [flip, setFlip] = useState(false);
  const [aspect, setAspect] = useState<string>("free");
  const [crop, setCrop] = useState<Crop | null>(null); // in ROTATED image px
  const [quad, setQuad] = useState<Quad | null>(null); // straighten corners, ROTATED image px
  const [bright, setBright] = useState(100);
  const [contrast, setContrast] = useState(100);
  const [sat, setSat] = useState(100);
  const [busy, setBusy] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!src) return;
    const el = new Image();
    // Sources that were persisted for the render API (e.g. a realistic-render
    // screenshot) are now cross-origin URLs. crossOrigin lets us draw them to a
    // canvas without tainting it, so the rotate/crop/straighten export works.
    el.crossOrigin = "anonymous";
    el.onload = () => setImg(el);
    // if the CORS load fails, fall back to a plain load so it at least previews
    el.onerror = () => {
      const plain = new Image();
      plain.onload = () => setImg(plain);
      plain.src = src;
    };
    el.src = src;
  }, [src]);

  // rotated dimensions
  const rw = rot % 180 === 0 ? (img?.naturalWidth ?? 1) : (img?.naturalHeight ?? 1);
  const rh = rot % 180 === 0 ? (img?.naturalHeight ?? 1) : (img?.naturalWidth ?? 1);

  // reset crop on rotate / aspect change
  useEffect(() => {
    if (!img) return;
    const a = ASPECTS.find((x) => x.id === aspect)?.ratio ?? null;
    if (a === null) {
      setCrop({ x: 0, y: 0, w: rw, h: rh });
    } else {
      // largest centered rect with that aspect
      let w = rw;
      let h = w / a;
      if (h > rh) {
        h = rh;
        w = h * a;
      }
      setCrop({ x: (rw - w) / 2, y: (rh - h) / 2, w, h });
    }
  }, [img, rw, rh, aspect]);

  // (re)seed the straighten corners on load / rotate / flip — 10% inset
  useEffect(() => {
    if (!img) return;
    setQuad([
      [rw * 0.1, rh * 0.1],
      [rw * 0.9, rh * 0.1],
      [rw * 0.9, rh * 0.9],
      [rw * 0.1, rh * 0.9],
    ]);
  }, [img, rw, rh, flip]);

  // rotated preview data URL (filters previewed via CSS)
  const previewUrl = useMemo(() => {
    if (!img) return null;
    const c = document.createElement("canvas");
    c.width = rw;
    c.height = rh;
    const ctx = c.getContext("2d")!;
    ctx.translate(rw / 2, rh / 2);
    ctx.rotate((rot * Math.PI) / 180);
    if (flip) ctx.scale(-1, 1);
    ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
    // if a cross-origin source tainted the canvas, fall back to the raw image
    try {
      return c.toDataURL();
    } catch {
      return src ?? null;
    }
  }, [img, rot, flip, rw, rh, src]);

  // display scale: fit the rotated image into ~520×380
  const disp = useMemo(() => {
    const s = Math.min(520 / rw, 380 / rh, 1);
    return { s, w: rw * s, h: rh * s };
  }, [rw, rh]);

  /* ------------------------------ crop dragging ----------------------------- */
  const dragRef = useRef<{ mode: "move" | "nw" | "ne" | "sw" | "se"; startX: number; startY: number; start: Crop } | null>(null);

  const beginDrag = useCallback(
    (e: React.PointerEvent, mode: "move" | "nw" | "ne" | "sw" | "se") => {
      if (!crop) return;
      e.preventDefault();
      e.stopPropagation();
      dragRef.current = { mode, startX: e.clientX, startY: e.clientY, start: { ...crop } };
      const ratio = ASPECTS.find((x) => x.id === aspect)?.ratio ?? null;
      const onMove = (ev: PointerEvent) => {
        const d = dragRef.current;
        if (!d) return;
        const dx = (ev.clientX - d.startX) / disp.s;
        const dy = (ev.clientY - d.startY) / disp.s;
        const s = d.start;
        if (d.mode === "move") {
          setCrop({
            ...s,
            x: Math.max(0, Math.min(rw - s.w, s.x + dx)),
            y: Math.max(0, Math.min(rh - s.h, s.y + dy)),
          });
          return;
        }
        // corner resize (anchor = opposite corner)
        const anchorX = d.mode.includes("w") ? s.x + s.w : s.x;
        const anchorY = d.mode.includes("n") ? s.y + s.h : s.y;
        const px = Math.max(0, Math.min(rw, (d.mode.includes("w") ? s.x : s.x + s.w) + dx));
        let py = Math.max(0, Math.min(rh, (d.mode.includes("n") ? s.y : s.y + s.h) + dy));
        let w = Math.abs(px - anchorX);
        let h = Math.abs(py - anchorY);
        if (ratio !== null) {
          // constrain to aspect, keep within bounds
          h = w / ratio;
          if ((py < anchorY && anchorY - h < 0) || (py >= anchorY && anchorY + h > rh)) {
            h = py < anchorY ? anchorY : rh - anchorY;
            w = h * ratio;
          }
          py = py < anchorY ? anchorY - h : anchorY + h;
        }
        if (w < 24) w = 24;
        if (h < 24) h = 24;
        setCrop({
          x: Math.min(anchorX, px < anchorX ? anchorX - w : anchorX),
          y: Math.min(anchorY, py < anchorY ? anchorY - h : anchorY),
          w,
          h,
        });
      };
      const onUp = () => {
        dragRef.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [crop, aspect, disp.s, rw, rh]
  );

  /* --------------------------- straighten dragging -------------------------- */
  const quadDrag = useRef<number | null>(null);
  const beginQuadDrag = useCallback(
    (e: React.PointerEvent, i: number) => {
      e.preventDefault();
      e.stopPropagation();
      quadDrag.current = i;
      const onMove = (ev: PointerEvent) => {
        const k = quadDrag.current;
        const box = boxRef.current?.getBoundingClientRect();
        if (k === null || !box) return;
        const x = Math.max(0, Math.min(rw, (ev.clientX - box.left) / disp.s));
        const y = Math.max(0, Math.min(rh, (ev.clientY - box.top) / disp.s));
        setQuad((q) => (q ? (q.map((c, j) => (j === k ? [x, y] : c)) as Quad) : q));
      };
      const onUp = () => {
        quadDrag.current = null;
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [disp.s, rw, rh]
  );

  /* --------------------------------- apply ---------------------------------- */
  const apply = async () => {
    if (!img || !crop) return;
    setBusy(true);
    try {
      let c: HTMLCanvasElement;
      if (mode === "straighten" && quad) {
        // rotated + flipped + filtered full image, then unwarp the marked quad flat
        const full = document.createElement("canvas");
        full.width = rw;
        full.height = rh;
        const fctx = full.getContext("2d")!;
        fctx.filter = `brightness(${bright}%) contrast(${contrast}%) saturate(${sat}%)`;
        fctx.translate(rw / 2, rh / 2);
        fctx.rotate((rot * Math.PI) / 180);
        if (flip) fctx.scale(-1, 1);
        fctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        const { w, h } = unwarpSize(quad);
        c = unwarpQuadToCanvas(full, rw, rh, quad, w, h);
      } else {
        c = document.createElement("canvas");
        c.width = Math.round(crop.w);
        c.height = Math.round(crop.h);
        const ctx = c.getContext("2d")!;
        ctx.filter = `brightness(${bright}%) contrast(${contrast}%) saturate(${sat}%)`;
        // draw rotated+flipped image so that crop.x/y lands at 0/0
        ctx.save();
        ctx.translate(-crop.x, -crop.y);
        ctx.translate(rw / 2, rh / 2);
        ctx.rotate((rot * Math.PI) / 180);
        if (flip) ctx.scale(-1, 1);
        ctx.drawImage(img, -img.naturalWidth / 2, -img.naturalHeight / 2);
        ctx.restore();
      }
      const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/png"));
      if (!blob) throw new Error();
      const asset = await ingestFile(new File([blob], "edited.png", { type: "image/png" }));
      onApply(asset.id);
    } catch {
      window.dispatchEvent(new CustomEvent("framekit:toast", { detail: "Couldn't apply the edit — the screenshot couldn't be read." }));
    } finally {
      setBusy(false);
    }
  };

  const filterCss = `brightness(${bright}%) contrast(${contrast}%) saturate(${sat}%)`;

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="flex max-h-[92vh] w-[min(880px,96vw)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-[#ececf2] px-4 py-3">
          <h3 className="text-sm font-bold text-[#17171c]">Edit screenshot</h3>
          <button onClick={onClose} className="fk-press grid h-7 w-7 place-items-center rounded-lg text-[#9a9aa4] hover:bg-black/6 hover:text-[#17171c]">
            <X size={15} />
          </button>
        </div>
        {note && (
          <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-[11.5px] font-medium leading-snug text-amber-800">
            {note}
          </div>
        )}

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4 sm:flex-row">
          {/* preview + crop box */}
          <div className="grid flex-1 place-items-center rounded-xl bg-[#eceef2] p-4" style={{ minHeight: 300 }}>
            {previewUrl && crop ? (
              <div ref={boxRef} className="relative" style={{ width: disp.w, height: disp.h }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={previewUrl} alt="" draggable={false} className="absolute inset-0 h-full w-full select-none" style={{ filter: filterCss }} />
                {mode === "crop" ? (
                  <div
                    className="absolute cursor-move border-2 border-white shadow-[0_0_0_9999px_rgba(10,10,16,0.45)]"
                    style={{ left: crop.x * disp.s, top: crop.y * disp.s, width: crop.w * disp.s, height: crop.h * disp.s }}
                    onPointerDown={(e) => beginDrag(e, "move")}
                  >
                    {/* rule-of-thirds guides */}
                    <div className="pointer-events-none absolute inset-y-0 left-1/3 w-px bg-white/40" />
                    <div className="pointer-events-none absolute inset-y-0 left-2/3 w-px bg-white/40" />
                    <div className="pointer-events-none absolute inset-x-0 top-1/3 h-px bg-white/40" />
                    <div className="pointer-events-none absolute inset-x-0 top-2/3 h-px bg-white/40" />
                    {(["nw", "ne", "sw", "se"] as const).map((cnr) => (
                      <div
                        key={cnr}
                        onPointerDown={(e) => beginDrag(e, cnr)}
                        className="absolute h-3.5 w-3.5 rounded-[3px] border-2 border-[#17171c] bg-white"
                        style={{
                          left: cnr.includes("w") ? -8 : undefined,
                          right: cnr.includes("e") ? -8 : undefined,
                          top: cnr.includes("n") ? -8 : undefined,
                          bottom: cnr.includes("s") ? -8 : undefined,
                          cursor: cnr === "nw" || cnr === "se" ? "nwse-resize" : "nesw-resize",
                        }}
                      />
                    ))}
                  </div>
                ) : (
                  quad && (
                    <>
                      {/* marked region + dimmed outside (even-odd fill) */}
                      <svg width={disp.w} height={disp.h} className="pointer-events-none absolute inset-0">
                        <path
                          d={`M0 0H${disp.w}V${disp.h}H0Z M${quad.map((c) => `${c[0] * disp.s} ${c[1] * disp.s}`).join(" L")} Z`}
                          fill="rgba(10,10,16,0.45)"
                          fillRule="evenodd"
                        />
                        <polygon
                          points={quad.map((c) => `${c[0] * disp.s},${c[1] * disp.s}`).join(" ")}
                          fill="none"
                          stroke="#34d399"
                          strokeWidth={2}
                          strokeDasharray="6 4"
                        />
                        {/* mid-edge guides make bowed edges obvious */}
                        <line x1={(quad[0][0] + quad[3][0]) / 2 * disp.s} y1={(quad[0][1] + quad[3][1]) / 2 * disp.s} x2={(quad[1][0] + quad[2][0]) / 2 * disp.s} y2={(quad[1][1] + quad[2][1]) / 2 * disp.s} stroke="rgba(52,211,153,0.5)" strokeWidth={1} />
                        <line x1={(quad[0][0] + quad[1][0]) / 2 * disp.s} y1={(quad[0][1] + quad[1][1]) / 2 * disp.s} x2={(quad[3][0] + quad[2][0]) / 2 * disp.s} y2={(quad[3][1] + quad[2][1]) / 2 * disp.s} stroke="rgba(52,211,153,0.5)" strokeWidth={1} />
                      </svg>
                      {quad.map((c, i) => (
                        <button
                          key={i}
                          data-scorner={["TL", "TR", "BR", "BL"][i]}
                          onPointerDown={(e) => beginQuadDrag(e, i)}
                          className="absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center rounded-full border-2 border-white bg-emerald-500 text-[8px] font-bold text-white shadow-md active:cursor-grabbing"
                          style={{ left: c[0] * disp.s, top: c[1] * disp.s, touchAction: "none" }}
                          title={`Drag onto the screen's ${["top-left", "top-right", "bottom-right", "bottom-left"][i]} corner`}
                        >
                          {["TL", "TR", "BR", "BL"][i]}
                        </button>
                      ))}
                    </>
                  )
                )}
              </div>
            ) : (
              <p className="text-xs text-[#9a9aa4]">Loading…</p>
            )}
          </div>

          {/* controls */}
          <div className="w-full shrink-0 sm:w-56">
            {/* mode: rectangular crop vs 4-corner perspective straighten */}
            <div className="mb-3 grid grid-cols-2 gap-0.5 rounded-xl bg-[#ececf2] p-1">
              {(
                [
                  ["crop", "Crop"],
                  ["straighten", "Straighten"],
                ] as const
              ).map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  className={`fk-press flex items-center justify-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-semibold ${
                    mode === m ? "bg-white text-[#17171c] shadow-sm" : "text-[#8a8a94] hover:text-[#4a4a55]"
                  }`}
                >
                  {m === "straighten" && <Scan size={12} />}
                  {label}
                </button>
              ))}
            </div>
            {mode === "straighten" && (
              <p className="mb-3 rounded-lg bg-emerald-50 px-2.5 py-2 text-[11px] leading-snug text-emerald-700">
                Photographed a screen at an angle? Drag the 4 corners exactly onto the screen&apos;s corners — Apply flattens it into a straight screenshot.
              </p>
            )}
            {mode === "crop" && (
              <>
            <span className="mb-1.5 block text-xs text-[#6b6b76]">Crop</span>
            <div className="mb-3 grid grid-cols-3 gap-1.5">
              {ASPECTS.map((a) => (
                <button
                  key={a.id}
                  onClick={() => setAspect(a.id)}
                  className={`fk-press rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${
                    aspect === a.id ? "border-[#17171c] bg-[#17171c] text-white" : "border-[#e4e4ec] bg-white text-[#6b6b76] hover:border-[#c9c9d4]"
                  }`}
                >
                  {a.label}
                </button>
              ))}
            </div>
              </>
            )}
            <div className="mb-3 flex gap-1.5">
              <button onClick={() => setRot((r) => (r + 90) % 360)} className="fk-press flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#e4e4ec] bg-white py-1.5 text-[11px] font-semibold text-[#17171c] hover:border-[#17171c]">
                <RotateCw size={12} /> Rotate
              </button>
              <button onClick={() => setFlip((f) => !f)} className={`fk-press flex flex-1 items-center justify-center gap-1.5 rounded-lg border py-1.5 text-[11px] font-semibold ${flip ? "border-[#17171c] bg-[#17171c] text-white" : "border-[#e4e4ec] bg-white text-[#17171c] hover:border-[#17171c]"}`}>
                <FlipHorizontal2 size={12} /> Flip
              </button>
            </div>
            <SliderRow label="Brightness" value={bright} min={40} max={160} format={(v) => `${Math.round(v)}%`} onChange={setBright} />
            <SliderRow label="Contrast" value={contrast} min={40} max={160} format={(v) => `${Math.round(v)}%`} onChange={setContrast} />
            <SliderRow label="Saturation" value={sat} min={0} max={200} format={(v) => `${Math.round(v)}%`} onChange={setSat} />
            <button
              onClick={() => {
                setBright(100);
                setContrast(100);
                setSat(100);
                setRot(0);
                setFlip(false);
                setAspect("free");
                setMode("crop");
                setQuad([
                  [rw * 0.1, rh * 0.1],
                  [rw * 0.9, rh * 0.1],
                  [rw * 0.9, rh * 0.9],
                  [rw * 0.1, rh * 0.9],
                ]);
              }}
              className="fk-press mt-1 w-full rounded-lg border border-[#e4e4ec] bg-white py-1.5 text-[11px] font-semibold text-[#17171c] hover:border-[#17171c]"
            >
              Reset all
            </button>
          </div>
        </div>

        <div className="flex justify-end gap-2 border-t border-[#ececf2] px-4 py-3">
          <button onClick={onClose} className="fk-press rounded-xl border border-[#e4e4ec] bg-white px-4 py-2 text-[13px] font-semibold text-[#17171c]">
            Cancel
          </button>
          <button onClick={apply} disabled={busy || !img} className="fk-press rounded-xl bg-[#17171c] px-4 py-2 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-50">
            {busy ? "Applying…" : "Apply"}
          </button>
        </div>
      </div>
    </div>
  );
}
