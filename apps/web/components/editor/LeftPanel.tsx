"use client";

import { useRef, useState } from "react";
import { motion } from "motion/react";
import { getDevice, previewDataUri } from "@framekit/devices";
import type { MockupLayer, Shadow, StickerLayer, TextLayer } from "@framekit/scene";
import { DEFAULT_SHADOW } from "@framekit/scene";
import { Crop, Plus, TriangleAlert, X } from "lucide-react";
import { ingestFile, resolveAsset } from "@/lib/assets";
import { renderScreenshotIntoMockup } from "@/lib/mockuuups";
import { isScreenAsset } from "@/lib/screens";
import { useSceneStore, useViewStore } from "@/lib/store";
import { ColorRow, Section, Seg, SliderRow } from "./ui";
import { DevicePicker } from "./DevicePicker";
import { MediaEditor } from "./MediaEditor";
import { ScreenStudio } from "./ScreenStudio";
import { FrameControls } from "./FramePanel";

const FONTS = ["Inter", "DM Sans", "Space Grotesk", "Playfair Display", "JetBrains Mono"];

/** Warn when a dropped screenshot's aspect badly mismatches the device screen —
 *  e.g. a tall phone shot on a Watch — so the user picks a device it actually fits.
 *  Returns null when the shapes are close enough. */
function fitWarning(
  asset: { width: number; height: number } | undefined,
  device: { name: string; screen: { width: number; height: number } } | undefined
): string | null {
  if (!asset?.width || !asset?.height || !device?.screen?.width || !device?.screen?.height) return null;
  const screenAR = device.screen.width / device.screen.height;
  const shotAR = asset.width / asset.height;
  const r = shotAR / screenAR;
  if (r >= 0.72 && r <= 1.38) return null; // close enough — no warning
  const suggest = shotAR < 0.85 ? "A phone" : shotAR > 1.3 ? "A laptop or desktop" : "A tablet";
  return `This screenshot's shape doesn't match the ${device.name} screen, so it'll crop or letterbox. ${suggest} mockup fits it better.`;
}

const SHADOW_PRESETS: { id: string; label: string; css: string; value: Shadow | null }[] = [
  { id: "none", label: "None", css: "none", value: null },
  {
    id: "spread", label: "Spread",
    css: "0 14px 22px -6px rgba(20,20,40,0.45)",
    value: { ...DEFAULT_SHADOW, mode: "spread", distance: 34, softness: 80, opacity: 0.38 },
  },
  {
    id: "hug", label: "Hug",
    css: "0 5px 9px -2px rgba(20,20,40,0.5)",
    value: { ...DEFAULT_SHADOW, mode: "hug", distance: 18, softness: 46, opacity: 0.5 },
  },
  {
    id: "adaptive", label: "Adaptive",
    css: "10px 14px 24px -6px rgba(20,20,40,0.4)",
    value: { ...DEFAULT_SHADOW, mode: "adaptive", lightAngle: 128, distance: 26, softness: 64, opacity: 0.42 },
  },
];

export function LeftPanel() {
  const [tab, setTab] = useState<"mockup" | "frame">("mockup");
  const scene = useSceneStore((s) => s.scene);
  const selectedIds = useViewStore((s) => s.selectedIds);
  const select = useViewStore((s) => s.select);
  const selected = scene.layers.find((l) => l.id === selectedIds.at(-1));
  const mockups = scene.layers.filter((layer): layer is MockupLayer => layer.type === "mockup");
  const target =
    selected?.type === "mockup"
      ? selected
      : mockups[0];

  return (
    <div className="fk-card panel-scroll pointer-events-auto flex max-h-full w-[min(300px,46vw)] flex-col overflow-y-auto pb-4">
      <div className="px-3 pt-3">
        <Seg
          id="left-tabs"
          options={[
            { value: "mockup", label: "Mockup" },
            { value: "frame", label: "Frame" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>
      {tab === "mockup" ? (
        selected?.type === "text" ? (
          <TextControls layer={selected} />
        ) : selected?.type === "sticker" && "stickerId" in selected ? (
          <AnnotationControls layer={selected} />
        ) : selected?.type === "sticker" && "iconMask" in selected && selected.iconMask ? (
          <AppIconControls layer={selected} />
        ) : target ? (
          <>
            <PhoneSlots layers={mockups} activeId={target.id} onSelect={select} />
            <MockupControls layer={target} />
          </>
        ) : (
          <p className="px-4 py-8 text-center text-xs text-[#9a9aa4]">Add a device to get started.</p>
        )
      ) : (
        <FrameControls />
      )}
    </div>
  );
}

/** Layouts create independent mockup layers. This selector makes that explicit:
 * a user picks a phone, then edits/uploads only that phone's screenshot. */
function PhoneSlots({
  layers,
  activeId,
  onSelect,
}: {
  layers: MockupLayer[];
  activeId: string;
  onSelect: (id: string | null) => void;
}) {
  if (layers.length === 0) return null;
  return (
    <section className="border-b border-[#ececf2] px-3 pb-3 pt-2">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-[#8a8a94]">Screenshots</h3>
        <span className="text-[10px] font-medium text-[#a0a0aa]">{layers.length} shots</span>
      </div>
      <div className="grid grid-cols-3 gap-1.5">
        {layers.slice(0, 3).map((layer, index) => {
          const device = layer.deviceId ? getDevice(layer.deviceId) : undefined;
          const asset = layer.media ? resolveAsset(layer.media.assetId) : undefined;
          const active = layer.id === activeId;
          return (
            <motion.button
              key={layer.id}
              layout
              initial={{ opacity: 0, y: 18, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 420, damping: 28 }}
              onClick={() => onSelect(layer.id)}
              className={`fk-press min-w-0 rounded-lg border p-1.5 text-left ${
                active ? "border-[#17171c] bg-[#f4f4f8] shadow-[0_0_0_1px_#17171c]" : "border-[#e4e4ec] bg-white hover:border-[#a9a9b3]"
              }`}
              title={`Edit shot ${index + 1}`}
            >
              <span className="grid h-12 place-items-center overflow-hidden rounded-md bg-[#ececf2]">
                {asset ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={asset.url} alt="" className="max-h-11 max-w-full rounded object-contain" draggable={false} />
                ) : device ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={previewDataUri(device, layer.frameVariant)} alt="" className="h-10 max-w-full object-contain" draggable={false} />
                ) : (
                  <span className="h-7 w-10 rounded bg-white shadow-sm" />
                )}
              </span>
              <span className="mt-1 block truncate text-[10px] font-semibold text-[#31313a]">Shot {index + 1}</span>
              <span className="block truncate text-[9px] text-[#92929d]">{layer.media ? "Screenshot set" : "Add screenshot"}</span>
            </motion.button>
          );
        })}
      </div>
    </section>
  );
}

/* ------------------------------ mockup controls ----------------------------- */

function MockupControls({ layer }: { layer: MockupLayer }) {
  const scene = useSceneStore((s) => s.scene);
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const setScene = useSceneStore((s) => s.setScene);
  const select = useViewStore((s) => s.select);
  const bumpAssets = useViewStore((s) => s.bumpAssets);
  const triggerEntrance = useViewStore((s) => s.triggerEntrance);
  const fileRef = useRef<HTMLInputElement>(null);
  const [applyMode, setApplyMode] = useState<"selected" | "all">("selected");
  const [editing, setEditing] = useState(false);
  const deviceLayerCount = scene.layers.filter((l) => l.type === "mockup").length;
  const patch = (p: Partial<MockupLayer>) => updateLayer(layer.id, (l) => ({ ...(l as MockupLayer), ...p }));

  const device = layer.deviceId ? getDevice(layer.deviceId) : undefined;
  const asset = layer.media ? resolveAsset(layer.media.assetId) : undefined;
  // Realistic-render (Pro) layers: `media.assetId` is a FLAT baked composite, so
  // "Edit screenshot" must edit the preserved ORIGINAL screenshot (render.sourceAssetId)
  // — editing the screen content, not the whole rendered scene — then re-render it.
  const renderMeta = layer.render;
  const editSourceId = renderMeta?.sourceAssetId;
  const canEditScreenshot = layer.media
    ? renderMeta
      ? !!(editSourceId && resolveAsset(editSourceId))
      : !isScreenAsset(layer.media.assetId)
    : false;
  const activeShadow =
    SHADOW_PRESETS.find((p) =>
      layer.shadow === null ? p.id === "none" : p.value !== null && p.value.mode === layer.shadow?.mode
    ) ?? SHADOW_PRESETS[0];

  return (
    <>
      <div className="px-3 pt-1">
        <DevicePicker
          deviceId={layer.deviceId}
          variantId={layer.frameVariant}
          multiDevice={deviceLayerCount > 1}
          applyMode={applyMode}
          onApplyModeChange={setApplyMode}
          onPick={(deviceId, variantId) => {
            const next = getDevice(deviceId);
            const scale = next
              ? Math.round(((scene.canvas.height * 0.78) / next.frame.height) * 1000) / 1000
              : layer.transform.scale;
            const applyToLayer = (l: MockupLayer): MockupLayer => ({
              ...l,
              deviceId,
              frameVariant: variantId,
              transform: { ...l.transform, scale },
            });
            if (applyMode === "all" && deviceLayerCount > 1) {
              setScene((s) => ({
                ...s,
                layers: s.layers.map((l) => (l.type === "mockup" ? applyToLayer(l as MockupLayer) : l)),
              }));
            } else {
              updateLayer(layer.id, (l) => applyToLayer(l as MockupLayer));
            }
            select(layer.id);
            triggerEntrance(layer.id);
          }}
        />
      </div>

      <TransformControls layer={layer} />

      <Section title="Media">
        <div
          onClick={() => fileRef.current?.click()}
          className="fk-tile relative grid place-items-center rounded-2xl bg-[#f2f2f7] py-5"
        >
          {asset ? (
            <>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={asset.url}
                alt=""
                className="max-h-32 max-w-[60%] rounded-xl border border-black/10 object-contain shadow-md"
              />
              <button
                title="Remove media"
                onClick={(e) => {
                  e.stopPropagation();
                  patch({ media: null });
                }}
                className="fk-press absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-white text-[#6b6b76] shadow"
              >
                <X size={13} />
              </button>
            </>
          ) : (
            <span
              className="grid h-28 w-16 place-items-center rounded-xl bg-white shadow-[0_2px_10px_rgba(20,20,40,0.1)]"
              style={{ aspectRatio: device ? `${device.screen.width}/${device.screen.height}` : undefined }}
            >
              <Plus size={18} className="text-[#8a8a94]" />
            </span>
          )}
        </div>
        <p className="mt-2 text-center text-[11px] text-[#9a9aa4]">
          {asset ? asset.name.slice(0, 34) : "Drop media or click to choose"}
        </p>
        {layer.media && (
          <div className="mt-2">
            {/* Fill/Fit/Stretch only make sense with a device SCREEN to fit into.
                A frameless screenshot is its own box (rendered at natural size), so
                the control is hidden there — it did nothing and read as "broken". */}
            {device && (
              <>
                {fitWarning(asset, device) && (
                  <div className="mb-2 flex items-start gap-1.5 rounded-lg bg-amber-50 px-2.5 py-2 text-[11px] leading-snug text-amber-700">
                    <TriangleAlert size={13} className="mt-0.5 shrink-0" />
                    <span>{fitWarning(asset, device)}</span>
                  </div>
                )}
                <Seg
                  id="media-fit"
                  options={[
                    { value: "cover", label: "Fill" },
                    { value: "contain", label: "Fit" },
                    { value: "fill", label: "Stretch" },
                  ]}
                  value={layer.media.fit}
                  // reset pan/zoom when the mode changes so each starts clean —
                  // otherwise a stale offset/scale makes Stretch not fill. Matches
                  // the BottomBar fit control (which already resets these).
                  onChange={(fit) => patch({ media: { ...layer.media!, fit, offsetX: 0, offsetY: 0, scale: 1 } })}
                />
              </>
            )}
            {/* photo-scene screens: zoom + reposition the screenshot inside the screen */}
            {device?.plate && (
              <div className="mt-2 rounded-xl bg-[#f6f6fa] p-2.5">
                <SliderRow
                  label="Zoom"
                  value={layer.media.scale}
                  min={1}
                  max={3}
                  step={0.01}
                  format={(v) => `${Math.round(v * 100)}%`}
                  onChange={(scale) => patch({ media: { ...layer.media!, scale } })}
                />
                <div className="mt-1 flex items-center justify-between gap-2">
                  <span className="text-[10.5px] leading-tight text-[#9a9aa4]">Drag the screenshot on the canvas to reposition</span>
                  <button
                    onClick={() => patch({ media: { ...layer.media!, offsetX: 0, offsetY: 0, scale: 1 } })}
                    className="fk-press shrink-0 rounded-lg border border-[#e4e4ec] bg-white px-2 py-1 text-[11px] font-semibold text-[#17171c] hover:border-[#17171c]"
                  >
                    Reset
                  </button>
                </div>
              </div>
            )}
            {/* composed screens stay editable as docs — cropping only applies to uploads */}
            {canEditScreenshot && (
              <button
                onClick={() => setEditing(true)}
                className="fk-press mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-[#e4e4ec] bg-white py-1.5 text-[11.5px] font-semibold text-[#17171c] hover:border-[#17171c]"
              >
                <Crop size={12} /> Edit screenshot · crop, straighten, filters
              </button>
            )}
          </div>
        )}
        {editing && layer.media && (
          <MediaEditor
            // realistic render → edit the ORIGINAL screenshot; else the media itself
            assetId={renderMeta ? editSourceId! : layer.media.assetId}
            note={
              renderMeta
                ? "You're editing the screenshot inside this realistic render. Apply re-renders it onto the device photo (uses 1 credit)."
                : undefined
            }
            onClose={() => setEditing(false)}
            onApply={async (newId) => {
              setEditing(false);
              if (renderMeta) {
                // re-render the edited screenshot onto the SAME device photo so the
                // change reflects on the device (the composite is baked server-side)
                const edited = resolveAsset(newId);
                if (!edited) return;
                const toast = (m: string) => window.dispatchEvent(new CustomEvent("framekit:toast", { detail: m }));
                toast("Re-rendering your edits onto the device… ✨");
                try {
                  const composite = await renderScreenshotIntoMockup(edited, renderMeta.mockupId, renderMeta.hd ?? false);
                  bumpAssets();
                  updateLayer(layer.id, (l) => ({
                    ...(l as MockupLayer),
                    media: { ...(l as MockupLayer).media!, assetId: composite.id, offsetX: 0, offsetY: 0, scale: 1 },
                    render: { ...renderMeta, sourceAssetId: newId },
                  }));
                  toast("Updated on the device ✨");
                } catch (e) {
                  toast(e instanceof Error ? e.message : "Re-render failed");
                }
              } else {
                patch({ media: { ...layer.media!, assetId: newId, offsetX: 0, offsetY: 0, scale: 1 } });
                bumpAssets();
              }
            }}
          />
        )}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          hidden
          onChange={async (e) => {
            const f = e.target.files?.[0];
            if (!f) return;
            const a = await ingestFile(f);
            bumpAssets();
            patch({ media: { assetId: a.id, kind: "image", fit: "cover", offsetX: 0, offsetY: 0, scale: 1 } });
            triggerEntrance(layer.id);
            e.target.value = "";
          }}
        />
      </Section>

      <ScreenStudio layer={layer} />

      {device && device.variants.length > 1 && (
        <Section title="Style" collapsible defaultOpen={false}>
          <div className="grid grid-cols-3 gap-2">
            {device.variants.map((v) => {
              const active = (layer.frameVariant ?? device.variants[0].id) === v.id;
              return (
                <button
                  key={v.id}
                  onClick={() => patch({ frameVariant: v.id })}
                  className={`fk-tile rounded-xl border bg-white p-1.5 ${
                    active ? "border-[#17171c] shadow-[0_0_0_1px_#17171c]" : "border-[#e8e8ef]"
                  }`}
                >
                  <span className="grid h-16 place-items-center rounded-lg bg-[#f2f2f7]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={previewDataUri(device, v.id)} alt={v.label} className="max-h-14 max-w-full" />
                  </span>
                  <span className="mt-1 block truncate text-center text-[10.5px] font-medium text-[#6b6b76]">
                    {v.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Section>
      )}

      {!device && (
        <Section title="Style">
          <Seg
            id="frameless-style"
            options={[
              { value: "default", label: "Plain" },
              { value: "glass-light", label: "Glass" },
              { value: "glass-dark", label: "Dark" },
              { value: "outline", label: "Line" },
            ]}
            value={(layer.screenshotStyle ?? "default") as "default" | "glass-light" | "glass-dark" | "outline"}
            onChange={(screenshotStyle) => patch({ screenshotStyle })}
          />
          <SliderRow
            label="Corner radius"
            value={layer.cornerRadius ?? 24}
            min={0}
            max={200}
            onChange={(cornerRadius) => patch({ cornerRadius })}
          />
        </Section>
      )}

      <Section title="Shadow" collapsible defaultOpen={false}>
        <div className="grid grid-cols-4 gap-2">
          {SHADOW_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => patch({ shadow: p.value ? { ...p.value } : null })}
              className={`fk-tile rounded-xl border bg-white p-1.5 ${
                activeShadow.id === p.id ? "border-[#17171c] shadow-[0_0_0_1px_#17171c]" : "border-[#e8e8ef]"
              }`}
            >
              <span className="grid h-12 place-items-center rounded-lg bg-[#f2f2f7]">
                <span className="h-7 w-7 rounded-md bg-white" style={{ boxShadow: p.css }} />
              </span>
              <span className="mt-1 block truncate text-center text-[10px] font-medium text-[#6b6b76]">
                {p.label}
              </span>
            </button>
          ))}
        </div>
        {layer.shadow && (
          <div className="mt-3">
            {/* Intensity — PostSpark's Low / Medium / High */}
            <span className="mb-1 block text-xs text-[#6b6b76]">Intensity</span>
            <Seg
              id="shadow-intensity"
              options={[
                { value: "low", label: "Low" },
                { value: "medium", label: "Medium" },
                { value: "high", label: "High" },
              ]}
              value={layer.shadow.opacity < 0.34 ? "low" : layer.shadow.opacity < 0.52 ? "medium" : "high"}
              onChange={(v) => {
                const p = v === "low" ? { opacity: 0.25, softness: 74 } : v === "medium" ? { opacity: 0.42, softness: 60 } : { opacity: 0.62, softness: 48 };
                patch({ shadow: { ...layer.shadow!, ...p } });
              }}
            />
          </div>
        )}
      </Section>

      <Section title="Border" collapsible defaultOpen={false}>
        <Seg
          id="border-toggle"
          options={[
            { value: "off", label: "Off" },
            { value: "on", label: "On" },
          ]}
          value={layer.border ? "on" : "off"}
          onChange={(v) =>
            patch({ border: v === "on" ? { width: 10, color: "#ffffff", inset: 28 } : undefined })
          }
        />
        {layer.border && (
          <>
            <SliderRow
              label="Width"
              value={layer.border.width}
              min={1}
              max={48}
              onChange={(width) => patch({ border: { ...layer.border!, width } })}
            />
            <SliderRow
              label="Inset"
              value={layer.border.inset}
              min={0}
              max={100}
              onChange={(inset) => patch({ border: { ...layer.border!, inset } })}
            />
            <ColorRow
              label="Color"
              value={typeof layer.border.color === "string" ? layer.border.color : "#ffffff"}
              onChange={(color) => patch({ border: { ...layer.border!, color } })}
            />
          </>
        )}
      </Section>
    </>
  );
}

/** Deliberately kept near the top of the editing rail: these are the controls
 * people reach for while composing, not layout-preset controls. */
function TransformControls({ layer }: { layer: MockupLayer }) {
  const scene = useSceneStore((s) => s.scene);
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const device = layer.deviceId ? getDevice(layer.deviceId) : undefined;
  const asset = layer.media ? resolveAsset(layer.media.assetId) : undefined;
  const base = device
    ? (scene.canvas.height * 0.78) / device.frame.height
    : asset
      ? (scene.canvas.height * 0.78) / asset.height
      : layer.transform.scale;
  const patchTransform = (patch: Partial<MockupLayer["transform"]>) =>
    updateLayer(layer.id, (current) => ({ ...(current as MockupLayer), transform: { ...(current as MockupLayer).transform, ...patch } }));

  return (
    <Section title="Transform">
      <SliderRow
        label="Size"
        value={Math.round((layer.transform.scale / base) * 100)}
        min={25}
        max={280}
        format={(v) => `${Math.round(v)}%`}
        onChange={(size) => patchTransform({ scale: Math.round(base * size * 10) / 1000 })}
      />
      <SliderRow label="Angle" value={layer.transform.rotate} min={-180} max={180} format={(v) => `${Math.round(v)}°`} onChange={(rotate) => patchTransform({ rotate })} />
      <SliderRow label="Tilt horizontal" value={layer.transform.tiltY} min={-45} max={45} format={(v) => `${Math.round(v)}°`} onChange={(tiltY) => patchTransform({ tiltY })} />
      <SliderRow label="Tilt vertical" value={layer.transform.tiltX} min={-45} max={45} format={(v) => `${Math.round(v)}°`} onChange={(tiltX) => patchTransform({ tiltX })} />
    </Section>
  );
}

/* ------------------------------ app-icon controls --------------------------- */

type AppIconLayer = Extract<StickerLayer, { assetId: string }>;
type AnnotationLayer = Extract<StickerLayer, { stickerId: string }>;

function AppIconControls({ layer }: { layer: AppIconLayer }) {
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const set = (iconMask: "ios" | "android" | "square") =>
    updateLayer(layer.id, (l) => ({ ...(l as AppIconLayer), iconMask }));
  return (
    <Section title="App icon">
      <p className="mb-3 text-[11px] leading-relaxed text-[#9a9aa4]">
        Your uploaded icon, masked for the store. Drag, scale &amp; rotate it right on the canvas.
      </p>
      <span className="mb-1.5 block text-xs text-[#6b6b76]">Shape</span>
      <Seg
        id="icon-mask"
        options={[
          { value: "ios", label: "iOS" },
          { value: "android", label: "Android" },
          { value: "square", label: "Square" },
        ]}
        value={layer.iconMask ?? "ios"}
        onChange={(v) => set(v as "ios" | "android" | "square")}
      />
    </Section>
  );
}

function annotationLabel(id: string) {
  if (id === "annot-arrow") return "Arrow";
  if (id === "annot-highlight") return "Highlight";
  if (id === "annot-redact") return "Redaction";
  if (id === "annot-blur") return "Blur patch";
  if (id.startsWith("annot-step-")) return "Step marker";
  return "Annotation";
}

function AnnotationControls({ layer }: { layer: AnnotationLayer }) {
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const patch = (p: Partial<AnnotationLayer>) => updateLayer(layer.id, (l) => ({ ...(l as AnnotationLayer), ...p }));
  const tint = layer.tint ?? (layer.stickerId === "annot-redact" ? "#111111" : layer.stickerId === "annot-highlight" ? "#ffe066" : "#7c3aed");
  return (
    <Section title="Annotation">
      <p className="mb-3 text-[11px] leading-relaxed text-[#9a9aa4]">
        {annotationLabel(layer.stickerId)} layer. Drag it on the canvas; use the corner handles for size and the top handle for rotation.
      </p>
      <ColorRow label="Color" value={tint} onChange={(v) => patch({ tint: v })} />
      {layer.stickerId.startsWith("annot-step-") && (
        <>
          <span className="mb-1.5 block text-xs text-[#6b6b76]">Number</span>
          <Seg
            id="annotation-step"
            options={[
              { value: "annot-step-1", label: "1" },
              { value: "annot-step-2", label: "2" },
              { value: "annot-step-3", label: "3" },
              { value: "annot-step-4", label: "4" },
              { value: "annot-step-5", label: "5" },
            ]}
            value={layer.stickerId as "annot-step-1" | "annot-step-2" | "annot-step-3" | "annot-step-4" | "annot-step-5"}
            onChange={(stickerId) => patch({ stickerId })}
          />
        </>
      )}
    </Section>
  );
}

/* ------------------------------- text controls ------------------------------ */

function TextControls({ layer }: { layer: TextLayer }) {
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const patch = (p: Partial<TextLayer>) => updateLayer(layer.id, (l) => ({ ...(l as TextLayer), ...p }));
  const patchFont = (p: Partial<TextLayer["font"]>) => patch({ font: { ...layer.font, ...p } });

  return (
    <Section title="Text">
      <textarea
        value={layer.content}
        rows={3}
        onChange={(e) => patch({ content: e.target.value })}
        className="mb-3 w-full resize-y rounded-xl border border-[#e4e4ec] bg-white px-3 py-2 text-sm text-[#17171c] focus:border-[#17171c] focus:outline-none"
      />
      <div className="mb-3 flex gap-2">
        <select
          value={layer.font.family}
          onChange={(e) => patchFont({ family: e.target.value })}
          className="fk-press flex-1 rounded-xl border border-[#e4e4ec] bg-white px-2 py-2 text-xs"
        >
          {FONTS.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
        <select
          value={layer.font.weight}
          onChange={(e) => patchFont({ weight: Number(e.target.value) })}
          className="fk-press w-20 rounded-xl border border-[#e4e4ec] bg-white px-2 py-2 text-xs"
        >
          {[400, 500, 600, 700, 800].map((w) => (
            <option key={w} value={w}>
              {w}
            </option>
          ))}
        </select>
      </div>
      <Seg
        id="text-align"
        options={[
          { value: "left", label: "Left" },
          { value: "center", label: "Center" },
          { value: "right", label: "Right" },
        ]}
        value={layer.align}
        onChange={(align) => patch({ align })}
      />
      <SliderRow label="Size" value={layer.font.size} min={12} max={300} onChange={(size) => patchFont({ size })} />
      <SliderRow
        label="Line height"
        value={layer.font.lineHeight}
        min={0.9}
        max={2}
        step={0.01}
        format={(v) => v.toFixed(2)}
        onChange={(lineHeight) => patchFont({ lineHeight })}
      />
      <SliderRow
        label="Letter spacing"
        value={layer.font.letterSpacing}
        min={-0.08}
        max={0.5}
        step={0.005}
        format={(v) => v.toFixed(3)}
        onChange={(letterSpacing) => patchFont({ letterSpacing })}
      />
      <div className="mt-3 flex gap-1.5">
        <TxToggle label="Italic" on={!!layer.italic} onClick={() => patch({ italic: !layer.italic })} />
        <TxToggle label="UPPER" on={!!layer.uppercase} onClick={() => patch({ uppercase: !layer.uppercase })} />
      </div>

      {!layer.gradient && <ColorRow label="Color" value={layer.color} onChange={(color) => patch({ color })} />}

      {/* premium type styling */}
      <div className="mt-3 space-y-2">
        <TxBlock
          label="Gradient fill"
          on={!!layer.gradient}
          onToggle={() => patch({ gradient: layer.gradient ? undefined : [{ at: 0, color: layer.color }, { at: 1, color: "#7c3aed" }] })}
        >
          {layer.gradient && (
            <div className="flex items-center gap-2">
              <input type="color" value={layer.gradient[0].color} onChange={(e) => patch({ gradient: [{ at: 0, color: e.target.value }, layer.gradient![1]] })} className="h-8 w-full cursor-pointer rounded-lg border border-[#e4e4ec]" />
              <input type="color" value={layer.gradient[1].color} onChange={(e) => patch({ gradient: [layer.gradient![0], { at: 1, color: e.target.value }] })} className="h-8 w-full cursor-pointer rounded-lg border border-[#e4e4ec]" />
            </div>
          )}
        </TxBlock>
        <TxBlock
          label="Outline"
          on={!!layer.stroke}
          onToggle={() => patch({ stroke: layer.stroke ? undefined : { width: 4, color: "#000000" } })}
        >
          {layer.stroke && (
            <>
              <ColorRow label="Color" value={layer.stroke.color} onChange={(color) => patch({ stroke: { ...layer.stroke!, color } })} />
              <SliderRow label="Width" value={layer.stroke.width} min={0.5} max={24} step={0.5} onChange={(width) => patch({ stroke: { ...layer.stroke!, width } })} />
            </>
          )}
        </TxBlock>
        <TxBlock
          label="Shadow"
          on={!!layer.shadow}
          onToggle={() => patch({ shadow: layer.shadow ? undefined : { x: 0, y: 8, blur: 18, color: "rgba(0,0,0,0.35)" } })}
        >
          {layer.shadow && (
            <>
              <ColorRow label="Color" value={layer.shadow.color} onChange={(color) => patch({ shadow: { ...layer.shadow!, color } })} />
              <SliderRow label="Offset Y" value={layer.shadow.y} min={-40} max={40} onChange={(y) => patch({ shadow: { ...layer.shadow!, y } })} />
              <SliderRow label="Blur" value={layer.shadow.blur} min={0} max={60} onChange={(blur) => patch({ shadow: { ...layer.shadow!, blur } })} />
            </>
          )}
        </TxBlock>
        <TxBlock
          label="Highlight"
          on={!!layer.highlight}
          onToggle={() => patch({ highlight: layer.highlight ? undefined : { color: "#ffe066", radius: 10, padX: 16, padY: 4 } })}
        >
          {layer.highlight && (
            <>
              <ColorRow label="Color" value={layer.highlight.color} onChange={(color) => patch({ highlight: { ...layer.highlight!, color } })} />
              <SliderRow label="Radius" value={layer.highlight.radius} min={0} max={80} onChange={(radius) => patch({ highlight: { ...layer.highlight!, radius } })} />
            </>
          )}
        </TxBlock>
      </div>
    </Section>
  );
}

function TxToggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`fk-press flex-1 rounded-lg border px-2 py-1.5 text-[11px] font-semibold ${
        on ? "border-[#17171c] bg-[#17171c] text-white" : "border-[#e4e4ec] bg-white text-[#6b6b76] hover:border-[#c9c9d4]"
      }`}
    >
      {label}
    </button>
  );
}

function TxBlock({ label, on, onToggle, children }: { label: string; on: boolean; onToggle: () => void; children?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[#ececf2] p-2">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#17171c]">{label}</span>
        <button
          onClick={onToggle}
          className={`fk-press relative h-5 w-9 rounded-full transition-colors ${on ? "bg-[#17171c]" : "bg-[#dcdce4]"}`}
        >
          <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition-all ${on ? "left-[18px]" : "left-0.5"}`} />
        </button>
      </div>
      {on && children && <div className="mt-2 space-y-1.5">{children}</div>}
    </div>
  );
}
