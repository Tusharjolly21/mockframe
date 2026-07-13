"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { listDevices } from "@framekit/devices";
import { quadMatrix3d, rectToQuad, type Quad } from "@framekit/renderer";
import { detectScreenQuad } from "@/lib/screenDetect";

/**
 * Template calibration tool (admin). Mark the 4 screen corners on a device
 * photo/plate; a perspective-warped GRID is overlaid through the SAME
 * `quadMatrix3d` the renderer uses, so what you align here is exactly what
 * ships. Straight grid lines expose any perspective/rounding mismatch that a
 * flat wallpaper would hide. Exports paste-ready scene-device metadata.
 *
 * Route: /calibrate/dev — internal template-authoring tool, not linked in the
 * product UI. End users get /calibrate → the editor's Custom Mockup modal.
 */

const PREVIEW_W = 820;
const PREVIEW_H = 640;
const CORNER_LABELS = ["TL", "TR", "BR", "BL"] as const;

/** A calibration grid: gridlines + labelled corners + a diagonal, so orientation
 *  and perspective are obvious the instant the quad is off. */
function calibrationGrid(w: number, h: number): string {
  const n = 10;
  let g = "";
  for (let i = 0; i <= n; i++) {
    const x = ((w * i) / n).toFixed(1);
    const y = ((h * i) / n).toFixed(1);
    g += `<line x1='${x}' y1='0' x2='${x}' y2='${h}' stroke='#2563eb' stroke-width='2' opacity='0.55'/>`;
    g += `<line x1='0' y1='${y}' x2='${w}' y2='${y}' stroke='#2563eb' stroke-width='2' opacity='0.55'/>`;
  }
  g += `<line x1='0' y1='0' x2='${w}' y2='${h}' stroke='#10b981' stroke-width='3'/>`;
  g += `<rect x='3' y='3' width='${w - 6}' height='${h - 6}' fill='none' stroke='#ef4444' stroke-width='6'/>`;
  const fs = Math.round(w * 0.06);
  const L = (x: number, y: number, t: string, a: string) =>
    `<text x='${x}' y='${y}' font-family='monospace' font-size='${fs}' font-weight='800' fill='#ef4444' text-anchor='${a}'>${t}</text>`;
  const svg =
    `<svg xmlns='http://www.w3.org/2000/svg' width='${w}' height='${h}'>` +
    `<rect width='${w}' height='${h}' fill='white'/>${g}` +
    L(w * 0.04, h * 0.1, "TL", "start") +
    L(w * 0.96, h * 0.1, "TR", "end") +
    L(w * 0.96, h * 0.95, "BR", "end") +
    L(w * 0.04, h * 0.95, "BL", "start") +
    `</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

interface Preset {
  id: string;
  name: string;
  plateSrc: string;
  plateW: number;
  plateH: number;
  quad: Quad;
  screenW: number;
  screenH: number;
  radius: number;
}

export default function CalibratePage() {
  const [plateUrl, setPlateUrl] = useState<string | null>(null);
  const [plateW, setPlateW] = useState(1600);
  const [plateH, setPlateH] = useState(1200);
  const [quad, setQuad] = useState<Quad>([
    [400, 300],
    [1200, 300],
    [1200, 900],
    [400, 900],
  ]);
  const [screenW, setScreenW] = useState(1206);
  const [screenH, setScreenH] = useState(2622);
  const [radius, setRadius] = useState(60);
  const [opacity, setOpacity] = useState(0.6);
  const [showGrid, setShowGrid] = useState(true);
  const [behindPlate, setBehindPlate] = useState(false); // for plates with a real transparent hole
  const [testUrl, setTestUrl] = useState<string | null>(null);
  const [drag, setDrag] = useState<number | null>(null);
  const [detecting, setDetecting] = useState(false);
  const [detectMsg, setDetectMsg] = useState<string | null>(null);
  const [devId, setDevId] = useState("my-device-angle-01");
  const [devName, setDevName] = useState("My Device");
  const areaRef = useRef<HTMLDivElement>(null);

  // existing scene devices → presets you can re-calibrate
  const presets = useMemo<Preset[]>(() => {
    return listDevices()
      .filter((d) => d.category === "scene" && d.plate)
      .map((d) => ({
        id: d.id,
        name: d.name,
        plateSrc: d.plate!.src,
        plateW: d.plate!.width,
        plateH: d.plate!.height,
        quad: (d.plate!.screenQuad as Quad | undefined) ?? rectToQuad(d.plate!.screenRect),
        screenW: d.screen.width,
        screenH: d.screen.height,
        radius: d.plate!.screenRadius ?? d.screen.cornerRadius,
      }));
  }, []);

  const scale = Math.min(PREVIEW_W / plateW, PREVIEW_H / plateH, 1);
  const grid = useMemo(() => calibrationGrid(screenW, screenH), [screenW, screenH]);
  const warpSrc = testUrl ?? (showGrid ? grid : null);

  function loadPreset(p: Preset) {
    setPlateUrl(p.plateSrc);
    setPlateW(p.plateW);
    setPlateH(p.plateH);
    setQuad(p.quad.map((c) => [...c]) as Quad);
    setScreenW(p.screenW);
    setScreenH(p.screenH);
    setRadius(p.radius);
    setDevId(p.id);
    setDevName(p.name);
    setBehindPlate(true);
  }

  function onImageFile(file: File, isTest: boolean) {
    const url = URL.createObjectURL(file);
    if (isTest) {
      setTestUrl(url);
      return;
    }
    const img = new Image();
    img.onload = () => {
      setPlateUrl(url);
      setPlateW(img.naturalWidth);
      setPlateH(img.naturalHeight);
      // seed a centred quad
      const w = img.naturalWidth, h = img.naturalHeight;
      setQuad([
        [w * 0.3, h * 0.25],
        [w * 0.7, h * 0.25],
        [w * 0.7, h * 0.75],
        [w * 0.3, h * 0.75],
      ]);
    };
    img.src = url;
  }

  // drag a corner
  useEffect(() => {
    if (drag === null) return;
    const onMove = (e: PointerEvent) => {
      const rect = areaRef.current?.getBoundingClientRect();
      if (!rect) return;
      const x = Math.max(0, Math.min(plateW, (e.clientX - rect.left) / scale));
      const y = Math.max(0, Math.min(plateH, (e.clientY - rect.top) / scale));
      setQuad((q) => q.map((c, i) => (i === drag ? [Math.round(x), Math.round(y)] : c)) as Quad);
    };
    const onUp = () => setDrag(null);
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [drag, scale, plateW, plateH]);

  function nudge(i: number, dx: number, dy: number) {
    setQuad((q) => q.map((c, k) => (k === i ? [c[0] + dx, c[1] + dy] : c)) as Quad);
  }

  const bbox = useMemo(() => {
    const xs = quad.map((c) => c[0]);
    const ys = quad.map((c) => c[1]);
    const x = Math.round(Math.min(...xs));
    const y = Math.round(Math.min(...ys));
    return { x, y, width: Math.round(Math.max(...xs) - x), height: Math.round(Math.max(...ys) - y) };
  }, [quad]);

  // self-intersection check (a valid screen quad must be convex/non-crossing)
  const selfIntersects = useMemo(() => {
    const cross = (o: number[], a: number[], b: number[]) =>
      (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const signs = [
      cross(quad[0], quad[1], quad[2]),
      cross(quad[1], quad[2], quad[3]),
      cross(quad[2], quad[3], quad[0]),
      cross(quad[3], quad[0], quad[1]),
    ].map(Math.sign);
    return !(signs.every((s) => s >= 0) || signs.every((s) => s <= 0));
  }, [quad]);

  const json = useMemo(
    () =>
      JSON.stringify(
        {
          id: devId,
          name: devName,
          brand: "apple",
          category: "scene",
          screen: { width: screenW, height: screenH, cornerRadius: radius },
          frame: { width: plateW, height: plateH, screenRect: bbox, maskPath: "", overlaySelector: "#overlay" },
          plate: {
            src: plateUrl?.startsWith("blob:") ? `/scenes/${devId}/plate.png` : plateUrl ?? "",
            width: plateW,
            height: plateH,
            screenRect: bbox,
            screenQuad: quad,
            screenRadius: radius,
          },
        },
        null,
        2
      ),
    [devId, devName, screenW, screenH, radius, plateW, plateH, bbox, quad, plateUrl]
  );

  const warpBox = warpSrc && (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        width: screenW,
        height: screenH,
        transform: quadMatrix3d(screenW, screenH, quad),
        transformOrigin: "0 0",
        overflow: "hidden",
        borderRadius: radius,
        opacity: behindPlate ? 1 : opacity,
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={warpSrc} alt="" style={{ width: screenW, height: screenH, objectFit: "cover", display: "block" }} />
    </div>
  );

  return (
    <div className="flex h-dvh bg-[#0f1117] text-white">
      {/* preview */}
      <div className="flex flex-1 items-center justify-center overflow-auto p-6">
        {plateUrl ? (
          <div
            ref={areaRef}
            className="relative"
            style={{ width: plateW * scale, height: plateH * scale, outline: "1px solid #333" }}
          >
            {/* scaled device + warp */}
            <div style={{ position: "absolute", top: 0, left: 0, width: plateW, height: plateH, transform: `scale(${scale})`, transformOrigin: "0 0" }}>
              {!behindPlate && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={plateUrl} alt="" style={{ position: "absolute", top: 0, left: 0, width: plateW, height: plateH }} />
              )}
              {warpBox}
              {behindPlate && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={plateUrl} alt="" style={{ position: "absolute", top: 0, left: 0, width: plateW, height: plateH }} />
              )}
            </div>
            {/* quad outline + handles (unscaled overlay, constant handle size) */}
            <svg width={plateW * scale} height={plateH * scale} className="pointer-events-none absolute inset-0">
              <polygon
                points={quad.map((c) => `${c[0] * scale},${c[1] * scale}`).join(" ")}
                fill="none"
                stroke={selfIntersects ? "#ef4444" : "#22d3ee"}
                strokeWidth={2}
                strokeDasharray="6 4"
              />
            </svg>
            {quad.map((c, i) => (
              <button
                key={i}
                onPointerDown={(e) => {
                  e.preventDefault();
                  setDrag(i);
                }}
                className="absolute grid h-6 w-6 -translate-x-1/2 -translate-y-1/2 cursor-grab place-items-center rounded-full border-2 border-white bg-cyan-400 text-[9px] font-bold text-black shadow active:cursor-grabbing"
                style={{ left: c[0] * scale, top: c[1] * scale, touchAction: "none" }}
                title={`${CORNER_LABELS[i]} (${c[0]}, ${c[1]})`}
              >
                {CORNER_LABELS[i]}
              </button>
            ))}
          </div>
        ) : (
          <label className="cursor-pointer rounded-2xl border-2 border-dashed border-[#333] px-16 py-20 text-center text-[#8a8a94] hover:border-[#555]">
            <p className="text-lg font-semibold text-white">Upload a device photo / plate</p>
            <p className="mt-1 text-sm">or load an existing scene from the right →</p>
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onImageFile(e.target.files[0], false)} />
          </label>
        )}
      </div>

      {/* controls */}
      <div className="w-80 shrink-0 space-y-4 overflow-y-auto border-l border-[#222] bg-[#151823] p-4 text-[13px]">
        <div>
          <h1 className="text-base font-bold">Template calibration</h1>
          <p className="text-[11px] text-[#8a8a94]">Drag the 4 corners so the grid aligns with the real screen.</p>
        </div>

        <div>
          <label className="mb-1 block text-[11px] font-semibold uppercase text-[#8a8a94]">Re-calibrate an existing scene</label>
          <select
            className="w-full rounded-lg bg-[#0f1117] p-2"
            value=""
            onChange={(e) => {
              const p = presets.find((x) => x.id === e.target.value);
              if (p) loadPreset(p);
            }}
          >
            <option value="">— pick a scene —</option>
            {presets.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.id})</option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="rounded-lg bg-[#0f1117] p-2 text-center text-[11px] font-semibold cursor-pointer hover:bg-[#1a1e2b]">
            Device image
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onImageFile(e.target.files[0], false)} />
          </label>
          <label className="rounded-lg bg-[#0f1117] p-2 text-center text-[11px] font-semibold cursor-pointer hover:bg-[#1a1e2b]">
            Test screenshot
            <input type="file" accept="image/*" hidden onChange={(e) => e.target.files?.[0] && onImageFile(e.target.files[0], true)} />
          </label>
        </div>

        <div className="space-y-2">
          <Row label="Screen W"><NumIn v={screenW} set={setScreenW} /></Row>
          <Row label="Screen H"><NumIn v={screenH} set={setScreenH} /></Row>
          <Row label={`Corner radius: ${radius}`}>
            <input type="range" min={0} max={240} value={radius} onChange={(e) => setRadius(+e.target.value)} className="w-full" />
          </Row>
          <Row label={`Grid opacity: ${opacity.toFixed(2)}`}>
            <input type="range" min={0.1} max={1} step={0.05} value={opacity} onChange={(e) => setOpacity(+e.target.value)} className="w-full" />
          </Row>
          <label className="flex items-center gap-2"><input type="checkbox" checked={showGrid} onChange={(e) => setShowGrid(e.target.checked)} /> Show calibration grid</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={behindPlate} onChange={(e) => setBehindPlate(e.target.checked)} /> Composite behind plate (real result)</label>
        </div>

        <button
          disabled={!plateUrl || detecting}
          onClick={async () => {
            if (!plateUrl) return;
            setDetecting(true);
            try {
              const q = await detectScreenQuad(plateUrl, plateW, plateH);
              if (q) setQuad(q);
              else setDetectMsg("No transparent screen-hole found — mark corners manually.");
            } catch {
              setDetectMsg("Auto-detect failed (image not readable). Mark corners manually.");
            } finally {
              setDetecting(false);
            }
          }}
          className="w-full rounded-lg bg-emerald-500 py-2 text-[12px] font-bold text-black hover:bg-emerald-400 disabled:opacity-40"
        >
          {detecting ? "Detecting…" : "✨ Auto-detect corners from plate alpha"}
        </button>
        {detectMsg && <p className="text-[11px] text-amber-300">{detectMsg}</p>}

        <div className="grid grid-cols-2 gap-2">
          {quad.map((c, i) => (
            <div key={i} className="rounded-lg bg-[#0f1117] p-2">
              <div className="mb-1 text-[10px] font-bold text-cyan-400">{CORNER_LABELS[i]}</div>
              <div className="flex gap-1">
                <input className="w-full rounded bg-[#1a1e2b] px-1 py-0.5" type="number" value={c[0]} onChange={(e) => setQuad((q) => q.map((p, k) => (k === i ? [+e.target.value, p[1]] : p)) as Quad)} />
                <input className="w-full rounded bg-[#1a1e2b] px-1 py-0.5" type="number" value={c[1]} onChange={(e) => setQuad((q) => q.map((p, k) => (k === i ? [p[0], +e.target.value] : p)) as Quad)} />
              </div>
              <div className="mt-1 grid grid-cols-4 gap-0.5">
                <button className="rounded bg-[#1a1e2b] hover:bg-[#2a3040]" onClick={() => nudge(i, -1, 0)}>←</button>
                <button className="rounded bg-[#1a1e2b] hover:bg-[#2a3040]" onClick={() => nudge(i, 1, 0)}>→</button>
                <button className="rounded bg-[#1a1e2b] hover:bg-[#2a3040]" onClick={() => nudge(i, 0, -1)}>↑</button>
                <button className="rounded bg-[#1a1e2b] hover:bg-[#2a3040]" onClick={() => nudge(i, 0, 1)}>↓</button>
              </div>
            </div>
          ))}
        </div>

        {selfIntersects && <p className="rounded-lg bg-red-500/15 p-2 text-[11px] text-red-300">⚠ Self-intersecting quad — corners are crossed. Fix the order/positions.</p>}

        <div className="grid grid-cols-2 gap-2">
          <input className="rounded-lg bg-[#0f1117] p-2" value={devId} onChange={(e) => setDevId(e.target.value)} placeholder="device id" />
          <input className="rounded-lg bg-[#0f1117] p-2" value={devName} onChange={(e) => setDevName(e.target.value)} placeholder="name" />
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <span className="text-[11px] font-semibold uppercase text-[#8a8a94]">Template JSON</span>
            <button
              className="rounded bg-cyan-500 px-2 py-1 text-[11px] font-bold text-black hover:bg-cyan-400"
              onClick={() => navigator.clipboard?.writeText(json)}
            >
              Copy
            </button>
          </div>
          <pre className="max-h-56 overflow-auto rounded-lg bg-[#0f1117] p-2 text-[10px] leading-tight text-[#a7f3d0]">{json}</pre>
        </div>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] text-[#8a8a94]">{label}</span>
      {children}
    </label>
  );
}
function NumIn({ v, set }: { v: number; set: (n: number) => void }) {
  return <input type="number" className="w-full rounded-lg bg-[#0f1117] p-2" value={v} onChange={(e) => set(+e.target.value)} />;
}
