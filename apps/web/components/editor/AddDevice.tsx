"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { getDevice, previewDataUri } from "@framekit/devices";
import { createMockupLayer, type SceneDocument } from "@framekit/scene";
import { LayoutGrid, Plus } from "lucide-react";
import { track } from "@/lib/analytics";
import { resolveAsset } from "@/lib/assets";
import { measureLayerBoxes } from "@/lib/arrange";
import { arrangeLineup, isPlateLayer, QUICK_DEVICES, resizeCanvas, type Box } from "@/lib/lineup";
import { isLiftedCard } from "@/lib/liftCard";
import { useSceneStore, useViewStore } from "@/lib/store";

const sizeOf = (id: string) => resolveAsset(id);

/** Add `deviceId` to the scene and, unless asked not to, arrange every device as a lineup. */
export function addDevice(scene: SceneDocument, deviceId: string, arrange = true): { scene: SceneDocument; layerId: string } {
  const device = getDevice(deviceId);
  if (!device) return { scene, layerId: "" };
  const layer = createMockupLayer({ deviceId, frameHeight: device.frame.height, canvasHeight: scene.canvas.height });
  layer.transform.scale = Math.round(layer.transform.scale * 0.6 * 1000) / 1000;
  const next = { ...scene, layers: [...scene.layers, layer] };
  return { scene: arrange ? arrangeLineup(next, sizeOf) : next, layerId: layer.id };
}

export const arrangeableCount = (scene: SceneDocument) => scene.layers.filter((l) => l.type === "mockup" && !isPlateLayer(l) && !isLiftedCard(l)).length;

/** Change the canvas size and keep the composition fitted inside it, measured from what is on screen when possible. */
export function resizeCanvasFitted(scene: SceneDocument, width: number, height: number): SceneDocument {
  let boxes: Map<string, Box> | undefined;
  if (typeof document !== "undefined") {
    const measured = measureLayerBoxes(scene.layers.map((l) => l.id), scene.canvas.width);
    if (measured.length === scene.layers.length) boxes = new Map(measured.map((b) => [b.id, b]));
  }
  return resizeCanvas(scene, width, height, sizeOf, boxes);
}

/** "Add device" tile + menu: one tap adds an iPhone, iPad, MacBook, iMac, watch or browser to the same canvas. */
export function AddDeviceButton({ compact = false }: { compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [arrange, setArrange] = useState(true);
  const [anchor, setAnchor] = useState<{ x: number; y: number; w: number } | null>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const setScene = useSceneStore((s) => s.setScene);
  const select = useViewStore((s) => s.select);
  const setTab = useViewStore((s) => s.setContentTab);
  const triggerEntrance = useViewStore((s) => s.triggerEntrance);

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!btnRef.current?.contains(e.target as Node) && !popRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const add = (deviceId: string) => {
    let id = "";
    setScene((s) => {
      const r = addDevice(s, deviceId, arrange);
      id = r.layerId;
      return r.scene;
    });
    if (id) {
      select(id);
      setTab("screen");
      triggerEntrance(id);
    }
    setOpen(false);
    track("device_added", { device_id: deviceId, arranged: arrange });
  };

  const toggle = () => {
    if (!open && btnRef.current) {
      const r = btnRef.current.getBoundingClientRect();
      const w = 264;
      const x = Math.max(8, Math.min(window.innerWidth - w - 8, r.left));
      const below = r.bottom + 8;
      setAnchor({ x, y: below + 300 > window.innerHeight ? Math.max(8, r.top - 308) : below, w });
    }
    setOpen((v) => !v);
  };

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-haspopup="menu"
        title="Add another device to this canvas"
        className={
          compact
            ? "fk-press flex items-center gap-1 rounded-full bg-[#17171c] px-3 py-1.5 text-[12px] font-semibold text-white"
            : "fk-press flex min-w-0 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-[#c9c9d4] bg-white p-1.5 text-[10px] font-semibold text-[#31313a] hover:border-[#17171c]"
        }
      >
        {compact ? (
          <>
            <Plus size={13} /> Device
          </>
        ) : (
          <>
            <span className="grid h-12 w-full place-items-center rounded-md bg-[#f4f4f8]">
              <Plus size={16} />
            </span>
            Add device
          </>
        )}
      </button>
      {open &&
        anchor &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popRef}
            role="menu"
            aria-label="Add a device"
            style={{ position: "fixed", left: anchor.x, top: anchor.y, width: anchor.w, zIndex: 90 }}
            className="rounded-2xl border border-[#e4e4ec] bg-white p-3 shadow-[0_24px_60px_-12px_rgba(20,20,40,0.35)]"
          >
            <p className="text-[12.5px] font-semibold text-[#17171c]">Add a device</p>
            <p className="mt-0.5 text-[11px] leading-snug text-[#85858f]">It joins this canvas. Pick its exact model under Device after.</p>
            <div className="mt-2.5 grid grid-cols-4 gap-1.5">
              {QUICK_DEVICES.map((q) => {
                const d = getDevice(q.id);
                if (!d) return null;
                return (
                  <button
                    key={q.id}
                    role="menuitem"
                    type="button"
                    onClick={() => add(q.id)}
                    className="fk-press flex min-w-0 flex-col items-center gap-1 rounded-xl border border-[#ececf2] bg-[#fafafc] px-1 pb-1.5 pt-2 text-[10.5px] font-semibold text-[#31313a] hover:border-[#17171c] hover:bg-white"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewDataUri(d)} alt="" className="h-9 w-auto max-w-[44px] object-contain" draggable={false} />
                    {q.label}
                  </button>
                );
              })}
            </div>
            <label className="mt-3 flex cursor-pointer items-center gap-2 text-[11.5px] text-[#4a4a55]">
              <input type="checkbox" checked={arrange} onChange={(e) => setArrange(e.target.checked)} className="h-3.5 w-3.5 accent-[#17171c]" />
              Arrange all devices as a lineup
            </label>
          </div>,
          document.body
        )}
    </>
  );
}

/** Re-arrange every device on the canvas as a fitted lineup. */
export function ArrangeLineupButton({ className = "" }: { className?: string }) {
  const setScene = useSceneStore((s) => s.setScene);
  return (
    <button
      type="button"
      onClick={() => {
        setScene((s) => arrangeLineup(s, sizeOf));
        track("devices_arranged", {});
      }}
      title="Line up every device at a matching scale, fitted to the canvas"
      className={`fk-press inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10.5px] font-semibold text-[#5b4cff] hover:bg-[#f1efff] ${className}`}
    >
      <LayoutGrid size={11} /> Arrange
    </button>
  );
}
