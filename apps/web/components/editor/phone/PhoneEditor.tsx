"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Check, Download, History, ImagePlus, Loader2, MessageSquare, Monitor, Shuffle, X } from "lucide-react";
import { backgroundToCss, SceneRenderer } from "@framekit/renderer";
import { getDevice, previewDataUri } from "@framekit/devices";
import type { MockupLayer, SceneDocument } from "@framekit/scene";
import { BrandMark } from "@/components/marketing/BrandMark";
import { LiveScene } from "@/components/templates/LiveScene";
import { track, trackOnce } from "@/lib/analytics";
import { ingestFile, resolveAsset } from "@/lib/assets";
import { openDraftInEditor } from "@/lib/autosave";
import { BG_CATEGORIES, magicSwatches, type BgSwatch } from "@/lib/backgrounds";
import { useEntitlementSync } from "@/lib/billing/client";
import { latestSceneDraft, timeAgo, type DraftRecord } from "@/lib/drafts";
import { exportFileName, renderSceneBlob } from "@/lib/export";
import { ensureSceneFonts } from "@/lib/fonts";
import { extractPalette } from "@/lib/palette";
import { buildPhoneScene, devicesForShot, PHONE_MAX_EXTRAS, PHONE_SIZES, phoneExportScale, stylePhoneScene, withCards, withExtras, type PhoneExtra, type PhoneShot, type PhoneStyle } from "@/lib/phoneEditor";
import { PRESET_CROPS, type Crop, type LiftStyle } from "@/lib/liftCard";
import { QUICK_DEVICES } from "@/lib/lineup";
import { findCards } from "../LiftCards";
import { prettyLooks } from "@/lib/prettify";
import { useSceneStore, useViewStore } from "@/lib/store";

type Tab = "look" | "device" | "lineup" | "cards" | "background" | "size";
const TABS: { id: Tab; label: string }[] = [
  { id: "look", label: "Look" },
  { id: "device", label: "Device" },
  { id: "lineup", label: "Add devices" },
  { id: "cards", label: "Cards" },
  { id: "background", label: "Background" },
  { id: "size", label: "Size" },
];

const CARD_STYLES: { id: LiftStyle; label: string }[] = [
  { id: "pop", label: "Pop" },
  { id: "tilt", label: "Tilted" },
  { id: "glass", label: "Glass" },
  { id: "flat", label: "Outline" },
];

const sizeOf = (id: string) => resolveAsset(id);
const sameCrop = (a: Crop, b: Crop) => Math.abs(a.x - b.x) + Math.abs(a.y - b.y) + Math.abs(a.w - b.w) + Math.abs(a.h - b.h) < 0.002;

const FREE_BGS: BgSwatch[] = BG_CATEGORIES.filter((c) => c.id === "gradient" || c.id === "solid").flatMap((c) => c.swatches);

const CHOICES_KEY = "mockframe:phone-choices";
const RESUME_MAX_AGE = 14 * 24 * 60 * 60 * 1000;

interface Choices {
  shotId: string;
  deviceId: string;
  sizeId: string;
  style: PhoneStyle;
  extras?: PhoneExtra[];
  cards?: Crop[];
  cardStyle?: LiftStyle;
}

/** The last choices for a screenshot, so a resumed draft looks the way it was left. */
function loadChoices(shotId: string): Choices | null {
  try {
    const c = JSON.parse(localStorage.getItem(CHOICES_KEY) ?? "null") as Choices | null;
    return c?.shotId === shotId ? c : null;
  } catch {
    return null;
  }
}

function saveChoices(c: Choices) {
  try {
    localStorage.setItem(CHOICES_KEY, JSON.stringify(c));
  } catch {
    /* storage blocked */
  }
}

/** The screenshot already in the editor's scene (a homepage drop, a template), if any. */
function shotInScene(scene: SceneDocument): { shot: PhoneShot; deviceId: string | null } | null {
  const layer = scene.layers.find((l): l is MockupLayer => l.type === "mockup" && !!l.media && l.media.kind === "image");
  const asset = layer?.media ? resolveAsset(layer.media.assetId) : undefined;
  if (!layer || !asset || !asset.width || !asset.height) return null;
  return { shot: { id: asset.id, width: asset.width, height: asset.height }, deviceId: layer.deviceId };
}

function Tile({ active, label, onClick, children, wide = false }: { active: boolean; label: string; onClick: () => void; children: React.ReactNode; wide?: boolean }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={`flex shrink-0 flex-col items-center gap-1.5 ${wide ? "w-[92px]" : "w-[72px]"}`}>
      <span className={`relative grid h-[88px] w-full place-items-center overflow-hidden rounded-2xl bg-white/[0.06] ${active ? "ring-2 ring-white" : "ring-1 ring-white/10"}`}>{children}</span>
      <span className={`w-full truncate text-center text-[11.5px] ${active ? "font-semibold text-white" : "text-zinc-400"}`}>{label}</span>
    </button>
  );
}

/**
 * The editor on phones: one screenshot, one device, one look, then save.
 * Every choice rebuilds the scene (lib/phoneEditor.ts) and mirrors it into the
 * editor store, so autosave and "Full editor" pick up exactly what's on screen.
 */
export function PhoneEditor({ onFullEditor }: { onFullEditor: () => void }) {
  useEntitlementSync();
  const storeScene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const isPro = useViewStore((s) => s.removeWatermark);

  const [shot, setShot] = useState<PhoneShot | null>(null);
  const [deviceId, setDeviceId] = useState<string>("iphone-17-pro");
  const [sizeId, setSizeId] = useState("auto");
  const [style, setStyle] = useState<PhoneStyle>({ kind: "look", index: 0, round: 0 });
  // null while the screenshot's colours are being read
  const [palette, setPalette] = useState<string[] | null>(null);
  const [tab, setTab] = useState<Tab>("look");
  const [extras, setExtras] = useState<PhoneExtra[]>([]);
  const [cards, setCards] = useState<Crop[]>([]);
  const [cardStyle, setCardStyle] = useState<LiftStyle>("pop");
  const [found, setFound] = useState<Crop[] | null>(null);
  // the extra device the next picked photo goes into (null: the main screenshot)
  const extraTarget = useRef<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState({ w: 0, h: 0 });

  // take over a screenshot that reached the editor another way (homepage drop, ?mine=1)
  useEffect(() => {
    if (shot) return;
    const found = shotInScene(storeScene);
    if (!found) return;
    setShot(found.shot);
    const saved = loadChoices(found.shot.id);
    if (saved && getDevice(saved.deviceId)) {
      setDeviceId(saved.deviceId);
      setSizeId(saved.sizeId);
      setStyle(saved.style);
      setExtras((saved.extras ?? []).filter((e) => getDevice(e.deviceId) && (!e.shotId || resolveAsset(e.shotId))));
      setCards(saved.cards ?? []);
      setCardStyle(saved.cardStyle ?? "pop");
      return;
    }
    const options = devicesForShot(found.shot.width, found.shot.height);
    setDeviceId(found.deviceId && getDevice(found.deviceId) && getDevice(found.deviceId)?.category !== "scene" ? found.deviceId : options[0]);
  }, [storeScene, shot]);

  useEffect(() => {
    if (shot) saveChoices({ shotId: shot.id, deviceId, sizeId, style, extras, cards, cardStyle });
  }, [shot, deviceId, sizeId, style, extras, cards, cardStyle]);

  // the last autosaved mockup, offered on the empty screen
  const [draft, setDraft] = useState<DraftRecord | null>(null);
  useEffect(() => {
    let alive = true;
    latestSceneDraft().then(
      (rec) => {
        if (alive && rec && Date.now() - rec.updatedAt < RESUME_MAX_AGE && rec.scene.layers.some((l) => l.type === "mockup" && l.media?.kind === "image")) setDraft(rec);
      },
      () => {}
    );
    return () => {
      alive = false;
    };
  }, []);

  const shotUrl = shot ? resolveAsset(shot.id)?.url : undefined;
  useEffect(() => {
    if (!shotUrl) return;
    let alive = true;
    setPalette(null);
    extractPalette(shotUrl)
      .then((p) => alive && setPalette(p))
      .catch(() => alive && setPalette([]));
    return () => {
      alive = false;
    };
  }, [shotUrl]);

  useEffect(() => {
    if (!shotUrl) return;
    let alive = true;
    setFound(null);
    findCards(shotUrl)
      .then((c) => alive && setFound(c))
      .catch(() => alive && setFound([]));
    return () => {
      alive = false;
    };
  }, [shotUrl]);

  const base = useMemo(() => (shot ? buildPhoneScene(shot, deviceId, sizeId) : null), [shot, deviceId, sizeId]);
  const scene = useMemo(() => {
    const styled = base && palette ? stylePhoneScene(base, style, palette) : base;
    if (!styled || !shot) return styled;
    return withCards(withExtras(styled, extras, shot.id, sizeOf), cards, cardStyle, sizeOf);
  }, [base, style, palette, extras, cards, cardStyle, shot]);
  const round = style.kind === "look" ? style.round : 0;
  const looks = useMemo(() => (base && palette ? prettyLooks(base, palette, round) : []), [base, palette, round]);

  // mirror into the editor store: autosave keeps it, and the full editor opens on it
  useEffect(() => {
    if (scene) setScene(() => scene);
  }, [scene, setScene]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const size = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);
    return () => ro.disconnect();
  }, [shot]);

  const flash = (msg: string) => {
    setNote(msg);
    window.setTimeout(() => setNote(null), 2600);
  };

  const take = useCallback(async (file: File | undefined | null) => {
    if (!file || !file.type.startsWith("image/")) return;
    try {
      const asset = await ingestFile(file);
      const target = extraTarget.current;
      extraTarget.current = null;
      if (target) {
        setExtras((list) => list.map((e) => (e.key === target ? { ...e, shotId: asset.id } : e)));
        return;
      }
      const next = { id: asset.id, width: asset.width, height: asset.height };
      setCards([]);
      setShot(next);
      setDeviceId(devicesForShot(next.width, next.height)[0]);
      setStyle({ kind: "look", index: 0, round: 0 });
      trackOnce("first_media_added", { via: "phone" });
    } catch {
      flash("That image couldn't be opened. Try a PNG or JPEG.");
    }
  }, []);

  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      const file = [...(e.clipboardData?.files ?? [])].find((f) => f.type.startsWith("image/"));
      if (file) void take(file);
    };
    window.addEventListener("paste", onPaste);
    return () => window.removeEventListener("paste", onPaste);
  }, [take]);

  const save = async () => {
    const node = canvasRef.current?.querySelector<HTMLElement>("[data-scene-id]");
    if (!node || !scene) return;
    setSaving(true);
    try {
      await ensureSceneFonts(scene);
      const scale = phoneExportScale(scene);
      const opts = { format: "png" as const, scale, watermark: !isPro };
      const blob = await renderSceneBlob(node, scene, opts);
      const file = new File([blob], exportFileName(scene, opts), { type: "image/png" });
      const width = Math.round(scene.canvas.width * scale);
      const height = Math.round(scene.canvas.height * scale);
      track("export_completed", { format: "png", scale, width, height, pro: isPro, via: "phone" });
      trackOnce("first_export", { format: "png", pro: isPro });
      if (navigator.canShare?.({ files: [file] })) {
        try {
          await navigator.share({ files: [file] });
          return;
        } catch (err) {
          if (err instanceof DOMException && err.name === "AbortError") return;
        }
      }
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = file.name;
      a.click();
      window.setTimeout(() => URL.revokeObjectURL(a.href), 5000);
      flash(`Saved ${width} × ${height} PNG`);
    } catch (err) {
      flash(err instanceof Error ? err.message : "The image couldn't be saved. Try again.");
    } finally {
      setSaving(false);
    }
  };

  const picker = (
    <input
      ref={fileRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        void take(e.target.files?.[0]);
        e.target.value = "";
      }}
    />
  );

  if (!shot || !scene) {
    return (
      <main className="flex min-h-dvh flex-col bg-[#0b0b0e] px-5 pb-8 text-white">
        {picker}
        <header className="flex items-center justify-between py-3">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark size={26} />
            <span className="text-[14px] font-semibold">MockFrame</span>
          </Link>
        </header>
        <div className="flex flex-1 flex-col justify-center">
          <h1 className="text-[34px] font-semibold leading-[1.05] tracking-[-0.03em]">Put a screenshot in a real device.</h1>
          <p className="mt-3 max-w-sm text-[15px] leading-6 text-zinc-400">Pick one from your photos. It goes in the device that fits it, on a background made from its colours. Then save it to your phone.</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="mt-8 flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-4 text-[15px] font-semibold text-zinc-950 active:scale-[0.99]"
          >
            <ImagePlus size={18} /> Choose a screenshot
          </button>
          {draft && (
            <button
              type="button"
              onClick={() => {
                if (openDraftInEditor(draft)) track("draft_resumed", { from: "phone" });
                else flash("That mockup couldn't be opened.");
              }}
              className="mt-3 flex w-full items-center gap-3 rounded-2xl bg-white/[0.06] p-2.5 text-left ring-1 ring-white/10"
            >
              {draft.thumbnail ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={draft.thumbnail} alt="" className="h-12 w-12 shrink-0 rounded-xl object-cover" />
              ) : (
                <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-white/[0.06]">
                  <History size={18} className="text-zinc-400" />
                </span>
              )}
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold">Continue your last mockup</span>
                <span className="block text-[12.5px] text-zinc-500">Edited {timeAgo(draft.updatedAt)}</span>
              </span>
            </button>
          )}
          <div className="mt-6 space-y-1 text-[13.5px]">
            <Link href="/chat" className="flex items-center gap-2 py-2 text-zinc-300">
              <MessageSquare size={15} className="text-zinc-500" /> Make a chat screenshot instead
            </Link>
            <button type="button" onClick={onFullEditor} className="flex items-center gap-2 py-2 text-zinc-300">
              <Monitor size={15} className="text-zinc-500" /> Use the full editor
            </button>
          </div>
        </div>
        {note && <p role="status" className="text-center text-[13px] text-amber-200">{note}</p>}
      </main>
    );
  }

  const { width: W, height: H } = scene.canvas;
  const s = box.w && box.h ? Math.min(box.w / W, box.h / H) : 0;
  const devices = devicesForShot(shot.width, shot.height);
  const bgKey = style.kind === "background" ? JSON.stringify(style.bg) : null;
  const swatches = [...magicSwatches(palette ?? []), ...FREE_BGS];

  return (
    <main className="fixed inset-0 flex flex-col bg-[#0b0b0e] text-white">
      {picker}
      <header className="flex shrink-0 items-center gap-2 px-4 py-2.5">
        <Link href="/" aria-label="MockFrame home" className="mr-auto">
          <BrandMark size={26} />
        </Link>
        <button type="button" onClick={() => fileRef.current?.click()} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3.5 py-2 text-[12.5px] font-medium">
          <ImagePlus size={14} /> Change
        </button>
        <button type="button" onClick={onFullEditor} className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.08] px-3.5 py-2 text-[12.5px] font-medium">
          <Monitor size={14} /> Full editor
        </button>
      </header>

      <div ref={stageRef} className="relative min-h-0 flex-1 px-4 py-2">
        {s > 0 && (
          <div
            ref={canvasRef}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-[14px] shadow-[0_24px_60px_rgba(0,0,0,0.55)]"
            style={{ width: Math.round(W * s), height: Math.round(H * s) }}
          >
            <div style={{ width: W, height: H, zoom: s }}>
              <SceneRenderer scene={scene} resolveAsset={resolveAsset} />
            </div>
          </div>
        )}
        {note && (
          <p role="status" className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-white px-4 py-2 text-[12.5px] font-medium text-zinc-950 shadow-lg">
            {note}
          </p>
        )}
      </div>

      <div className="shrink-0 border-t border-white/[0.08] bg-[#111115] pb-[max(12px,env(safe-area-inset-bottom))]">
        <div role="tablist" className="flex gap-1 overflow-x-auto px-3 pt-2.5 [scrollbar-width:none]">
          {TABS.map((t) => (
            <button
              key={t.id}
              type="button"
              role="tab"
              aria-selected={tab === t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-2 text-[12.5px] font-semibold ${tab === t.id ? "bg-white text-zinc-950" : "text-zinc-400"}`}
            >
              {t.label}
            </button>
          ))}
        </div>

        <div className="flex gap-2.5 overflow-x-auto px-4 pb-1 pt-3 [scrollbar-width:none]">
          {tab === "look" && (
            <>
              {looks.map((look, i) => (
                <Tile key={look.id} active={style.kind === "look" && style.index === i} label={look.label} onClick={() => setStyle({ kind: "look", index: i, round })}>
                  <LiveScene scene={look.scene} label={look.label} className="h-full w-full" />
                </Tile>
              ))}
              {!looks.length && <p className="py-8 text-[13px] text-zinc-500">Reading the screenshot&apos;s colours…</p>}
              {looks.length > 0 && (
                <Tile active={false} label="Shuffle" onClick={() => setStyle({ kind: "look", index: style.kind === "look" ? style.index : 0, round: round + 1 })}>
                  <Shuffle size={20} className="text-zinc-300" />
                </Tile>
              )}
              <Tile active={style.kind === "device"} label="Plain" onClick={() => setStyle({ kind: "device" })}>
                <span className="h-12 w-8 rounded-md border border-white/25" />
              </Tile>
            </>
          )}

          {tab === "device" &&
            devices.map((id) => {
              const d = getDevice(id)!;
              return (
                <Tile key={id} wide active={deviceId === id} label={d.name} onClick={() => setDeviceId(id)}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={previewDataUri(d)} alt="" className="max-h-[68px] max-w-[76px] object-contain" />
                </Tile>
              );
            })}

          {tab === "lineup" && (
            <>
              {extras.map((e) => {
                const d = getDevice(e.deviceId)!;
                const own = e.shotId ? resolveAsset(e.shotId)?.url : undefined;
                return (
                  <div key={e.key} className="relative shrink-0">
                    <Tile
                      wide
                      active
                      label={own ? d.name : "Tap for photo"}
                      onClick={() => {
                        extraTarget.current = e.key;
                        fileRef.current?.click();
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewDataUri(d)} alt="" className="max-h-[68px] max-w-[76px] object-contain" />
                    </Tile>
                    <button
                      type="button"
                      aria-label={`Remove ${d.name}`}
                      onClick={() => setExtras((list) => list.filter((x) => x.key !== e.key))}
                      className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-white text-zinc-950 shadow"
                    >
                      <X size={13} />
                    </button>
                  </div>
                );
              })}
              {extras.length < PHONE_MAX_EXTRAS ? (
                QUICK_DEVICES.map((q) => {
                  const d = getDevice(q.id);
                  if (!d) return null;
                  return (
                    <Tile
                      key={q.id}
                      label={`+ ${q.label}`}
                      active={false}
                      onClick={() => {
                        setExtras((list) => [...list, { key: `${q.id}-${Date.now().toString(36)}`, deviceId: q.id, shotId: null }]);
                        track("device_added", { device_id: q.id, via: "phone" });
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={previewDataUri(d)} alt="" className="max-h-[60px] max-w-[60px] object-contain opacity-80" />
                    </Tile>
                  );
                })
              ) : (
                <p className="self-center px-2 text-[12.5px] text-zinc-500">Up to {PHONE_MAX_EXTRAS + 1} devices. Remove one to add another.</p>
              )}
            </>
          )}

          {tab === "cards" && (
            <>
              {(found && found.length ? found : found ? PRESET_CROPS.map((p) => p.crop) : []).map((c, i) => {
                const on = cards.some((x) => sameCrop(x, c));
                return (
                  <Tile
                    key={i}
                    wide
                    active={on}
                    label={on ? "Lifted" : "Lift"}
                    onClick={() => setCards((list) => (on ? list.filter((x) => !sameCrop(x, c)) : [...list, c].slice(-3)))}
                  >
                    <span
                      aria-hidden
                      className="block w-[80px] rounded-md shadow-md"
                      style={{
                        aspectRatio: `${c.w * shot.width}/${c.h * shot.height}`,
                        maxHeight: 76,
                        backgroundImage: `url(${shotUrl})`,
                        backgroundSize: `${100 / c.w}% ${100 / c.h}%`,
                        backgroundPosition: `${c.w >= 1 ? 0 : (c.x / (1 - c.w)) * 100}% ${c.h >= 1 ? 0 : (c.y / (1 - c.h)) * 100}%`,
                      }}
                    />
                    {on && <Check size={15} className="absolute right-1.5 top-1.5 rounded-full bg-white p-0.5 text-zinc-950" />}
                  </Tile>
                );
              })}
              {!found && <p className="py-8 text-[13px] text-zinc-500">Finding cards in your screenshot…</p>}
              {found &&
                CARD_STYLES.map((cs) => (
                  <Tile key={cs.id} active={cardStyle === cs.id} label={cs.label} onClick={() => setCardStyle(cs.id)}>
                    <span
                      className={`block h-8 w-12 rounded-md bg-white/80 ${cs.id === "tilt" ? "-rotate-6" : ""} ${cs.id === "flat" ? "border-2 border-white bg-white/20" : "shadow-[0_8px_18px_rgba(0,0,0,0.5)]"} ${cs.id === "glass" ? "bg-white/30 backdrop-blur" : ""}`}
                    />
                  </Tile>
                ))}
            </>
          )}

          {tab === "background" &&
            swatches.map((sw) => {
              const active = bgKey === JSON.stringify(sw.bg);
              return (
                <button
                  key={sw.id}
                  type="button"
                  aria-label={sw.id.startsWith("magic") ? "Background from your screenshot" : "Background"}
                  aria-pressed={active}
                  onClick={() => setStyle({ kind: "background", bg: sw.bg })}
                  className={`relative my-4 h-14 w-14 shrink-0 rounded-full ${active ? "ring-2 ring-white ring-offset-2 ring-offset-[#111115]" : "ring-1 ring-white/15"}`}
                  style={backgroundToCss(sw.bg)}
                >
                  {active && <Check size={16} className="absolute inset-0 m-auto text-white mix-blend-difference" />}
                </button>
              );
            })}

          {tab === "size" &&
            PHONE_SIZES.map((size) => {
              const w = size.width ?? (base?.canvas.width ?? 1);
              const h = size.height ?? (base?.canvas.height ?? 1);
              const k = 52 / Math.max(w, h);
              return (
                <Tile key={size.id} active={sizeId === size.id} label={size.label} onClick={() => setSizeId(size.id)}>
                  <span className="rounded-[5px] border-2 border-zinc-300" style={{ width: Math.round(w * k), height: Math.round(h * k) }} />
                </Tile>
              );
            })}
        </div>

        <div className="px-4 pt-2">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-white py-3.5 text-[15px] font-semibold text-zinc-950 disabled:opacity-60"
          >
            {saving ? <Loader2 size={17} className="animate-spin" /> : <Download size={17} />} Save image
          </button>
        </div>
      </div>
    </main>
  );
}
