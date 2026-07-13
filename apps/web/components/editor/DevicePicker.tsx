"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { getDevice, listDevices, previewDataUri, type Device, type DeviceCategory } from "@framekit/devices";
import { ChevronDown, Globe, ImagePlus, Laptop, Monitor, Smartphone, Sparkles, Tablet, Trash2, Watch } from "lucide-react";
import { deleteCustomDevice, isCustomDevice } from "@/lib/customDevices";
import { CustomMockupModal } from "./CustomMockupModal";
import { toast } from "./Toolbar";
import { Popover } from "./ui";

const CATEGORIES: { id: DeviceCategory | "all"; label: string; icon?: React.ComponentType<{ size?: number }> }[] = [
  // real photoreal mockups first — the featured devices
  { id: "scene", label: "Mockups", icon: Sparkles },
  { id: "all", label: "All" },
  { id: "phone", label: "Phone", icon: Smartphone },
  { id: "tablet", label: "Tablet", icon: Tablet },
  { id: "laptop", label: "Laptop", icon: Laptop },
  { id: "desktop", label: "Desktop", icon: Monitor },
  { id: "browser", label: "Browser", icon: Globe },
  { id: "watch", label: "Watch", icon: Watch },
];

export function DevicePicker({
  deviceId,
  variantId,
  onPick,
  applyMode = "selected",
  onApplyModeChange,
  multiDevice = false,
}: {
  deviceId: string | null;
  variantId?: string;
  onPick: (deviceId: string, variantId?: string) => void;
  /** when there are multiple device layers: change just this one, or all */
  applyMode?: "selected" | "all";
  onApplyModeChange?: (m: "selected" | "all") => void;
  /** show the mode picker only when the scene has more than one device */
  multiDevice?: boolean;
}) {
  const [open, setOpen] = useState(false);
  // open on the real photo mockups by default (fall back to All if none loaded)
  const [cat, setCat] = useState<DeviceCategory | "all">("scene");
  const [anchor, setAnchor] = useState<{ x: number; y: number } | null>(null);
  const [customOpen, setCustomOpen] = useState(false);
  const [regBump, setRegBump] = useState(0); // re-read the registry after create/delete
  const rootRef = useRef<HTMLDivElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const current = deviceId ? getDevice(deviceId) : undefined;

  // (the old effect-based version of this re-ran on every category change and
  // snapped the user BACK out of the Mockups tab — making custom mockups and
  // the calibration tile unreachable; category defaulting now happens once
  // per open, inside toggle())

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node) && !popRef.current?.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [open]);

  // Keep the picker beside the trigger when there is room, otherwise lift it
  // above the trigger. This matters on shorter laptop screens where the old
  // fixed `bottom + 8px` anchor pushed most of the device catalog below view.
  useEffect(() => {
    if (!open) return;
    const reposition = () => {
      const trigger = rootRef.current?.getBoundingClientRect();
      const popup = popRef.current?.getBoundingClientRect();
      if (!trigger || !popup) return;
      const gutter = 12;
      const roomBelow = trigger.bottom + popup.height + gutter <= window.innerHeight;
      const roomAbove = trigger.top - popup.height - gutter >= gutter;
      const top = roomBelow || !roomAbove ? trigger.bottom + 8 : trigger.top - popup.height - 8;
      const left = Math.min(Math.max(gutter, trigger.left), Math.max(gutter, window.innerWidth - popup.width - gutter));
      setAnchor((previous) =>
        previous && Math.abs(previous.x - left) < 1 && Math.abs(previous.y - top) < 1 ? previous : { x: left, y: top }
      );
    };
    const frame = window.requestAnimationFrame(reposition);
    window.addEventListener("resize", reposition);
    window.addEventListener("scroll", reposition, true);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", reposition);
      window.removeEventListener("scroll", reposition, true);
    };
  }, [open, cat, regBump]);

  // /calibrate (and /editor?calibrate=1) lands here: open the calibration
  // modal directly without hunting for the picker tile
  useEffect(() => {
    const onOpenCustom = () => setCustomOpen(true);
    window.addEventListener("framekit:open-custom-mockup", onOpenCustom);
    return () => window.removeEventListener("framekit:open-custom-mockup", onOpenCustom);
  }, []);

  const toggle = () => {
    if (!open && rootRef.current) {
      const r = rootRef.current.getBoundingClientRect();
      setAnchor({ x: r.left, y: r.bottom + 8 });
      // open in the active device's family — but only ONCE per open, so the
      // user can still browse to any other tab afterwards
      if (current && current.category !== "scene" && cat === "scene") setCat(current.category);
    }
    setOpen((v) => !v);
  };

  // recompute on every OPEN too: custom devices are registered by an EditorShell
  // mount effect that runs AFTER this component's first render — a [cat]-only
  // memo would serve the stale pre-registration list forever after a reload
  const devices = useMemo(
    () => listDevices().filter((d) => cat === "all" || d.category === cat),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [cat, regBump, open]
  );
  const cats = useMemo(() => {
    const present = new Set(listDevices().map((d) => d.category));
    return CATEGORIES.filter((c) => c.id === "all" || present.has(c.id as DeviceCategory));
  }, []);

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={toggle}
        className="fk-tile flex w-full items-center gap-3 rounded-2xl border border-[#e4e4ec] bg-white px-3 py-2.5 text-left"
      >
        <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f2f2f7]">
          {current ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={previewDataUri(current, variantId)} alt="" className="max-h-7 max-w-7" />
          ) : (
            <Smartphone size={16} />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-[#17171c]">
            {current?.name ?? "Frameless"}
          </span>
          <span className="block text-[11px] tabular-nums text-[#9a9aa4]">
            {current ? `Media ${current.screen.width} × ${current.screen.height} px` : "styled screenshot"}
          </span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 30 }}>
          <ChevronDown size={15} className="text-[#9a9aa4]" />
        </motion.span>
      </button>

      {typeof document !== "undefined" &&
        createPortal(
          <AnimatePresence>
            {open && anchor && (
              <div ref={popRef} style={{ position: "fixed", left: anchor.x, top: anchor.y, zIndex: 80 }}>
                <Popover className="w-[560px] max-w-[74vw] p-4" style={{ position: "relative" }}>
            {multiDevice && onApplyModeChange && (
              <div className="mb-3 flex items-center gap-2 rounded-xl bg-[#f4f4f8] p-1">
                {(["selected", "all"] as const).map((m) => (
                  <button
                    key={m}
                    onClick={() => onApplyModeChange(m)}
                    className={`flex-1 rounded-lg px-3 py-1.5 text-[12px] font-semibold ${
                      applyMode === m ? "bg-white text-[#17171c] shadow-sm" : "text-[#6b6b76] hover:text-[#17171c]"
                    }`}
                  >
                    {m === "selected" ? "This device" : "All devices"}
                  </button>
                ))}
              </div>
            )}
            <div className="mb-4 flex flex-wrap gap-1.5">
              {cats.map((c) => {
                const active = cat === c.id;
                const Icon = c.icon;
                return (
                  <button
                    key={c.id}
                    onClick={() => setCat(c.id)}
                    className={`fk-press flex items-center gap-1.5 rounded-full px-3.5 py-2 text-[13px] font-semibold ${
                      active ? "bg-[#17171c] text-white" : "bg-white text-[#17171c] border border-[#e4e4ec] hover:border-[#c9c9d4]"
                    }`}
                  >
                    {Icon && <Icon size={14} />}
                    {c.label}
                  </button>
                );
              })}
            </div>

            <div className="panel-scroll grid max-h-[52vh] grid-cols-2 gap-3 overflow-y-auto pr-1">
              {/* always visible — the picker auto-opens on the current device's
                  family, which used to hide this tile behind the Mockups tab */}
              <button
                onClick={() => setCustomOpen(true)}
                  className="fk-tile grid min-h-44 place-items-center gap-1 rounded-2xl border-2 border-dashed border-[#d6d6e0] bg-[#fafafc] p-3.5 text-center hover:border-[#a9a9ba]"
                >
                  <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-emerald-500 to-cyan-500 text-white">
                    <ImagePlus size={17} />
                  </span>
                  <span className="text-[13.5px] font-bold text-[#17171c]">Your device photo</span>
                  <span className="text-[11px] leading-snug text-[#8a8a94]">Photograph your device, mark the screen — yours forever</span>
                </button>
              {devices.map((d) => (
                <DeviceCard
                  key={d.id}
                  device={d}
                  selected={d.id === deviceId}
                  onPick={(vid) => {
                    onPick(d.id, vid);
                    setOpen(false);
                  }}
                  onDelete={
                    isCustomDevice(d.id)
                      ? () => {
                          deleteCustomDevice(d.id);
                          setRegBump((b) => b + 1);
                          toast("Custom mockup deleted");
                        }
                      : undefined
                  }
                />
              ))}
              {devices.length === 0 && (
                <p className="col-span-2 py-10 text-center text-xs text-[#9a9aa4]">
                  No devices in this category yet — the registry grows weekly.
                </p>
              )}
            </div>
                </Popover>
              </div>
            )}
          </AnimatePresence>,
          document.body
        )}
      <AnimatePresence>
        {customOpen && (
          <CustomMockupModal
            onClose={() => setCustomOpen(false)}
            onToast={toast}
            onCreated={(id) => {
              setRegBump((b) => b + 1);
              onPick(id); // apply the new custom device to the current layer
              setOpen(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function DeviceCard({
  device,
  selected,
  onPick,
  onDelete,
}: {
  device: Device;
  selected: boolean;
  onPick: (variantId?: string) => void;
  /** present only for user-created custom mockups */
  onDelete?: () => void;
}) {
  const shown = device.variants.slice(0, 3);
  const extra = device.variants.length - shown.length;
  return (
    <div
      onClick={() => onPick()}
      className={`fk-tile rounded-2xl border bg-white p-3.5 ${
        selected ? "border-[#17171c] shadow-[0_0_0_1px_#17171c]" : "border-[#e8e8ef]"
      }`}
    >
      <div className="mb-1 flex items-start justify-between">
        <div>
          <p className="text-[14px] font-bold text-[#17171c]">{device.name}</p>
          {/* recommended media dimensions — upload at exactly this size for a pixel-perfect screen */}
          <p className="text-[11px] tabular-nums text-[#9a9aa4]">
            Media {device.screen.width} × {device.screen.height} px
          </p>
        </div>
        <span className="flex items-center gap-1">
          {onDelete && (
            <button
              title="Delete this custom mockup"
              onClick={(e) => {
                e.stopPropagation();
                onDelete();
              }}
              className="fk-press grid h-6 w-6 place-items-center rounded-md text-[#9a9aa4] hover:bg-red-50 hover:text-red-600"
            >
              <Trash2 size={12} />
            </button>
          )}
          <span className="rounded-full bg-[#17171c] px-2 py-0.5 text-[10px] font-semibold text-white">
            {onDelete ? "yours" : device.category}
          </span>
        </span>
      </div>
      <div className="h-36 overflow-hidden p-2">
        <DevicePreview device={device} />
      </div>
      <div className="mt-1 flex items-center gap-1.5">
        {shown.map((v) => (
          <button
            key={v.id}
            title={v.label}
            onClick={(e) => {
              e.stopPropagation();
              onPick(v.id);
            }}
            className="fk-press h-8 w-8 overflow-hidden rounded-lg border border-[#e4e4ec] bg-[#f6f6fa] p-0.5"
          >
            <DevicePreview device={device} variantId={v.id} compact />
          </button>
        ))}
        {extra > 0 && (
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-[#e4e4ec] bg-white text-[11px] font-semibold text-[#6b6b76]">
            +{extra}
          </span>
        )}
      </div>
    </div>
  );
}

const PICKER_WALLPAPERS = [
  "linear-gradient(145deg, #0f172a 0%, #155e75 48%, #67e8f9 100%)",
  "radial-gradient(circle at 25% 20%, #f0abfc 0%, transparent 42%), linear-gradient(145deg, #312e81, #111827 72%)",
  "linear-gradient(135deg, #111827 0%, #7c2d12 42%, #fbbf24 100%)",
  "radial-gradient(circle at 75% 78%, #34d399 0%, transparent 42%), linear-gradient(145deg, #052e16, #164e63 68%)",
  "linear-gradient(135deg, #020617 0%, #1d4ed8 48%, #22d3ee 100%)",
  "radial-gradient(circle at 70% 22%, #fb7185 0%, transparent 36%), linear-gradient(145deg, #450a0a, #7c3aed 100%)",
  "linear-gradient(135deg, #fdf2f8 0%, #c4b5fd 46%, #38bdf8 100%)",
  "repeating-linear-gradient(135deg, rgba(255,255,255,.14) 0 3px, transparent 3px 12px), linear-gradient(145deg, #172554, #0f766e)",
];

function wallpaperFor(device: Device, variantId?: string) {
  const seed = `${device.id}:${variantId ?? device.variants[0]?.id ?? "default"}`;
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  return PICKER_WALLPAPERS[Math.abs(hash) % PICKER_WALLPAPERS.length];
}

function DevicePreview({ device, variantId, compact = false }: { device: Device; variantId?: string; compact?: boolean }) {
  const { width, height, screenRect } = device.frame;
  const radius = Math.min(24, (device.screen.cornerRadius / height) * 100);
  return (
    <div
      className={`relative mx-auto ${compact ? "h-full w-full" : "h-full max-w-full"}`}
      style={{ aspectRatio: `${width} / ${height}` }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={previewDataUri(device, variantId)}
        alt={compact ? "" : device.name}
        className="absolute inset-0 h-full w-full object-contain drop-shadow-[0_6px_12px_rgba(20,20,40,0.18)]"
      />
      <span
        aria-hidden="true"
        className="pointer-events-none absolute overflow-hidden"
        style={{
          left: `${(screenRect.x / width) * 100}%`,
          top: `${(screenRect.y / height) * 100}%`,
          width: `${(screenRect.width / width) * 100}%`,
          height: `${(screenRect.height / height) * 100}%`,
          borderRadius: `${radius}%`,
          background: wallpaperFor(device, variantId),
          boxShadow: "inset 0 0 0 1px rgba(255,255,255,.14), inset 0 -10px 18px rgba(0,0,0,.18)",
          zIndex: 1,
        }}
      />
    </div>
  );
}
