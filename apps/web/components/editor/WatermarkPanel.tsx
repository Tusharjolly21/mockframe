"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ImagePlus, Stamp, X } from "lucide-react";
import {
  DEFAULT_CUSTOM_WATERMARK,
  ingestLogo,
  loadCustomWatermark,
  saveCustomWatermark,
  type CustomWatermarkCfg,
  type WatermarkPosition,
} from "@/lib/customWatermark";
import { applyWatermark } from "@/lib/watermark";
import { Seg, SliderRow } from "./ui";
import { toast } from "./Toolbar";

const POSITIONS: WatermarkPosition[] = ["tl", "tc", "tr", "ml", "mc", "mr", "bl", "bc", "br"];

/**
 * Custom brand watermark settings (Pro): text and/or logo as a corner badge or
 * tiled pattern, previewed live through the SAME renderer exports use.
 */
export function WatermarkPanel({ onClose }: { onClose: () => void }) {
  const [cfg, setCfg] = useState<CustomWatermarkCfg>(() => loadCustomWatermark());
  const previewRef = useRef<HTMLCanvasElement>(null);

  const patch = (p: Partial<CustomWatermarkCfg>) => {
    setCfg((c) => {
      const next = { ...c, ...p };
      saveCustomWatermark(next);
      return next;
    });
  };

  // live preview — a mock scene backdrop run through the real export renderer
  useEffect(() => {
    const cv = previewRef.current;
    if (!cv) return;
    const ctx = cv.getContext("2d")!;
    const g = ctx.createLinearGradient(0, 0, cv.width, cv.height);
    g.addColorStop(0, "#6d28d9");
    g.addColorStop(1, "#0e7490");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, cv.width, cv.height);
    ctx.fillStyle = "#101014";
    ctx.beginPath();
    ctx.roundRect(cv.width * 0.36, cv.height * 0.14, cv.width * 0.28, cv.height * 0.72, 14);
    ctx.fill();
    ctx.fillStyle = "#f4f4f8";
    ctx.beginPath();
    ctx.roundRect(cv.width * 0.375, cv.height * 0.17, cv.width * 0.25, cv.height * 0.66, 8);
    ctx.fill();
    if (cfg.enabled) {
      void applyWatermark(cv, { tile: false, badge: false, forensicKey: null, custom: cfg });
    }
  }, [cfg]);

  const ui = (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="flex max-h-[92vh] w-[min(680px,94vw)] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-center gap-3 border-b border-[#ececf2] px-5 py-3.5">
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white">
            <Stamp size={15} />
          </span>
          <div className="min-w-0 flex-1">
            <h2 className="text-[15px] font-bold text-[#17171c]">Custom watermark</h2>
            <p className="text-[11.5px] text-[#8a8a94]">Your brand on every export — badge or tiled, text and logo.</p>
          </div>
          <button onClick={onClose} className="fk-press grid h-8 w-8 place-items-center rounded-xl text-[#8a8a94] hover:bg-black/6">
            <X size={16} />
          </button>
        </div>

        <div className="flex min-h-0 flex-1 gap-5 overflow-y-auto p-5">
          {/* preview */}
          <div className="flex flex-1 flex-col gap-3">
            <canvas ref={previewRef} width={540} height={400} className="w-full rounded-xl border border-[#ececf2]" />
            <label className="flex items-center justify-between rounded-xl bg-[#f4f4f8] px-3 py-2.5">
              <span className="text-[12.5px] font-semibold text-[#17171c]">Watermark my exports</span>
              <input
                type="checkbox"
                checked={cfg.enabled}
                onChange={(e) => patch({ enabled: e.target.checked })}
                className="h-4 w-4 accent-[#17171c]"
              />
            </label>
            {!cfg.enabled && (
              <p className="text-center text-[11px] text-[#9a9aa4]">Off — your exports ship completely clean.</p>
            )}
          </div>

          {/* controls */}
          <div className={`w-60 shrink-0 space-y-3.5 ${cfg.enabled ? "" : "pointer-events-none opacity-40"}`}>
            <div>
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#8a8a94]">Style</span>
              <Seg
                id="wm-mode"
                options={[
                  { value: "badge", label: "Badge" },
                  { value: "tiled", label: "Tiled" },
                ]}
                value={cfg.mode}
                onChange={(mode) => patch({ mode })}
              />
            </div>
            <div>
              <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#8a8a94]">Text</span>
              <input
                value={cfg.text}
                onChange={(e) => patch({ text: e.target.value })}
                placeholder="@yourbrand · yoursite.com"
                className="w-full rounded-xl border border-[#e4e4ec] bg-white px-3 py-2 text-[13px] text-[#17171c] outline-none focus:border-[#17171c]"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="fk-press flex flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-[#e4e4ec] bg-white py-2 text-[12px] font-semibold text-[#17171c] hover:border-[#17171c]">
                <ImagePlus size={13} /> {cfg.logo ? "Change logo" : "Add logo"}
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      patch({ logo: await ingestLogo(f) });
                    } catch (err) {
                      toast(err instanceof Error ? err.message : "Couldn't read that logo");
                    }
                    e.target.value = "";
                  }}
                />
              </label>
              {cfg.logo && (
                <button
                  onClick={() => patch({ logo: null })}
                  className="fk-press grid h-9 w-9 place-items-center rounded-xl border border-[#e4e4ec] bg-white text-[#9a9aa4] hover:text-red-500"
                  title="Remove logo"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {cfg.mode === "badge" && (
              <div>
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-[#8a8a94]">Position</span>
                <div className="grid w-24 grid-cols-3 gap-1">
                  {POSITIONS.map((p) => (
                    <button
                      key={p}
                      onClick={() => patch({ position: p })}
                      className={`fk-press aspect-square rounded-md border ${
                        cfg.position === p ? "border-[#17171c] bg-[#17171c]" : "border-[#e4e4ec] bg-[#f6f6fa] hover:border-[#c9c9d4]"
                      }`}
                      title={p}
                    />
                  ))}
                </div>
              </div>
            )}

            <SliderRow
              label="Size"
              value={cfg.size}
              min={0.5}
              max={2}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(size) => patch({ size })}
            />
            <SliderRow
              label="Opacity"
              value={cfg.opacity}
              min={0.05}
              max={1}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(opacity) => patch({ opacity })}
            />
            <div className="flex items-center justify-between">
              <span className="text-[12px] font-medium text-[#17171c]">Text color</span>
              <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-black/10" style={{ background: cfg.color }}>
                <input type="color" value={cfg.color} onChange={(e) => patch({ color: e.target.value })} className="absolute inset-0 cursor-pointer opacity-0" />
              </label>
            </div>
            {cfg.mode === "badge" && (
              <label className="flex items-center justify-between">
                <span className="text-[12px] font-medium text-[#17171c]">Pill background</span>
                <input type="checkbox" checked={cfg.pill} onChange={(e) => patch({ pill: e.target.checked })} className="h-4 w-4 accent-[#17171c]" />
              </label>
            )}
            <button
              onClick={() => {
                const next = { ...DEFAULT_CUSTOM_WATERMARK, enabled: cfg.enabled };
                saveCustomWatermark(next);
                setCfg(next);
              }}
              className="fk-press w-full rounded-xl border border-[#e4e4ec] bg-white py-1.5 text-[11.5px] font-semibold text-[#6b6b76] hover:border-[#17171c] hover:text-[#17171c]"
            >
              Reset to defaults
            </button>
          </div>
        </div>

        <div className="flex items-center justify-between border-t border-[#ececf2] px-5 py-3">
          <span className="text-[10.5px] text-[#9a9aa4]">Applies to every export — single, copy, share link, and bulk.</span>
          <button onClick={onClose} className="fk-press rounded-xl bg-[#17171c] px-4 py-2 text-[12.5px] font-semibold text-white hover:bg-black">
            Done
          </button>
        </div>
      </div>
    </div>
  );

  return typeof document !== "undefined" ? createPortal(ui, document.body) : null;
}
