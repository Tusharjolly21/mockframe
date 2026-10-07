"use client";

import { useEffect, useMemo, useState } from "react";
import { Search, X } from "lucide-react";
import { AnnotationGraphic } from "@framekit/renderer";
import { ingestGenerated } from "@/lib/assets";
import { ICON_COLLECTIONS, ICON_PALETTES, ICON_VIEWBOX, iconBody, iconDataUrl, searchIcons, type IconPalette } from "@/lib/iconStickers";
import { BADGE_H, BADGE_W, badgeDataUrl, STORE_BADGES } from "@/lib/storeBadges";
import { addEmoji, addIconSticker, addLabel, type LabelKind } from "@/lib/sceneOps";
import { useSceneStore, useViewStore } from "@/lib/store";
import { Popover } from "./ui";

/**
 * Sticker library: designed labels (editable text + colour), the Solar icon
 * catalogue in duotone palettes or solid colours, emoji, and store badges.
 * Stays open so several stickers can be dropped in a row.
 */

type Tab = "labels" | "icons" | "emoji" | "badges";

const TABS: { id: Tab; label: string }[] = [
  { id: "labels", label: "Labels" },
  { id: "icons", label: "Icons" },
  { id: "emoji", label: "Emoji" },
  { id: "badges", label: "Store badges" },
];

type LabelPreset = { kind: LabelKind; text: string; tint: string; box: [number, number]; name: string };

const LABELS: LabelPreset[] = [
  { kind: "pill", text: "New", tint: "#7c3aed", box: [176, 60], name: "New pill" },
  { kind: "pill", text: "Pro", tint: "#111114", box: [168, 60], name: "Pro pill" },
  { kind: "burst", text: "50% off", tint: "#ff3b30", box: [240, 240], name: "Sale burst" },
  { kind: "burst", text: "New!", tint: "#f5b400", box: [240, 240], name: "New burst" },
  { kind: "laurel", text: "#1 App", tint: "#d49b00", box: [320, 220], name: "Award laurel" },
  { kind: "laurel", text: "Top rated", tint: "#7c3aed", box: [320, 220], name: "Top rated laurel" },
  { kind: "rating", text: "4.9", tint: "#f5b400", box: [340, 110], name: "Star rating" },
  { kind: "cursor", text: "Alex", tint: "#0a84ff", box: [190, 110], name: "Live cursor" },
  { kind: "cursor", text: "You", tint: "#ff2d92", box: [170, 110], name: "Your cursor" },
  { kind: "ribbon", text: "Launch day", tint: "#7c3aed", box: [340, 80], name: "Ribbon" },
  { kind: "button", text: "Get started", tint: "#111114", box: [300, 90], name: "CTA button" },
  { kind: "button", text: "Download free", tint: "#0a84ff", box: [330, 90], name: "Download button" },
];

const LABEL_TINTS = ["#7c3aed", "#ff3b30", "#f5b400", "#34c759", "#0a84ff", "#ff2d92", "#111114", "#ffffff"];

const EMOJI_GROUPS: { id: string; label: string; items: string[] }[] = [
  { id: "popular", label: "Popular", items: ["🔥", "🚀", "✨", "⭐", "❤️", "😂", "👀", "🎉", "💯", "✅", "👍", "🙌", "💡", "⚡", "🏆", "📈", "🧠", "💜", "🫶", "😮", "🤯", "🥇", "🔔", "🎯"] },
  { id: "people", label: "People", items: ["👋", "🖐️", "👏", "🙌", "👍", "👎", "👌", "🤝", "✍️", "🙏", "💪", "🫶", "🧠", "👀", "🧑‍💻", "👨‍🎨", "😎", "🥳", "🤩", "😍"] },
  { id: "nature", label: "Nature", items: ["🌿", "🍃", "🌱", "🌸", "🌻", "🌈", "☀️", "🌙", "⭐", "🔥", "❄️", "🌊", "☁️", "🍂", "🪴", "🌵"] },
  { id: "food", label: "Food", items: ["🍎", "🍊", "🍋", "🍉", "🍇", "🍓", "🥑", "🍕", "🍔", "🍜", "🍩", "☕", "🍰", "🍪", "🥤", "🍣"] },
  { id: "travel", label: "Travel", items: ["🌍", "🗺️", "🧭", "✈️", "🚗", "🚲", "🚀", "🏕️", "⛰️", "🏝️", "🏠", "📍", "🗽", "🎒", "🚢", "🚂"] },
  { id: "objects", label: "Objects", items: ["🎧", "📱", "💻", "⌚", "📷", "✏️", "📌", "🔑", "💡", "🔒", "📦", "🛒", "💳", "📊", "🗓️", "✉️"] },
  { id: "fun", label: "Activities", items: ["🎉", "🎈", "🎁", "🎨", "🎵", "🎬", "🏆", "🥇", "🎯", "🎮", "🎸", "🎤", "🎊", "🎃", "🎄", "🎆"] },
];

const ICON_SETS: { id: string; label: string }[] = [
  { id: "all", label: "All" },
  { id: "space", label: "Space" },
  { id: "nature", label: "Nature" },
  { id: "animals", label: "Animals" },
];

const SOLID_TINTS = ["#17171c", "#ffffff", "#7c3aed", "#ff3b30", "#10b981", "#f59e0b", "#0ea5e9"];

type IconStyle = { type: "palette"; key: keyof typeof ICON_PALETTES } | { type: "solid"; color: string };

const PAGE = 120;

function luma(hex: string) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 0.5;
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      aria-pressed={active}
      onClick={onClick}
      className={`fk-press shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors ${
        active ? "bg-[#17171c] text-white" : "bg-[#f1f1f5] text-[#5a5a66] hover:bg-[#e8e8ee] hover:text-[#17171c]"
      }`}
    >
      {children}
    </button>
  );
}

function ScaledLabel({ preset, tint, w, h }: { preset: LabelPreset; tint: string; w: number; h: number }) {
  const k = Math.min(w / preset.box[0], h / preset.box[1]);
  return (
    <span className="pointer-events-none relative block" style={{ width: preset.box[0] * k, height: preset.box[1] * k }}>
      <span className="absolute left-0 top-0 grid origin-top-left place-items-center" style={{ width: preset.box[0], height: preset.box[1], transform: `scale(${k})` }}>
        <AnnotationGraphic id={`label-${preset.kind}-${preset.text}`} tint={tint} />
      </span>
    </span>
  );
}

export function StickerPopover({ onClose }: { onClose: () => void }) {
  const setScene = useSceneStore((s) => s.setScene);
  const select = useViewStore((s) => s.select);
  const [tab, setTab] = useState<Tab>("labels");
  const [query, setQuery] = useState("");
  const [labelTint, setLabelTint] = useState<string | null>(null);
  const [iconSet, setIconSet] = useState("all");
  const [iconStyle, setIconStyle] = useState<IconStyle>({ type: "palette", key: "aurora" });
  const [emojiGroup, setEmojiGroup] = useState("popular");
  const [visible, setVisible] = useState(PAGE);
  const [added, setAdded] = useState(0);

  useEffect(() => setVisible(PAGE), [tab, iconSet, query]);

  const q = query.trim().toLowerCase();
  const palette: IconPalette | undefined = iconStyle.type === "palette" ? ICON_PALETTES[iconStyle.key] : undefined;
  const solid = iconStyle.type === "solid" ? iconStyle.color : "#17171c";

  const labels = q ? LABELS.filter((l) => `${l.name} ${l.text} ${l.kind}`.toLowerCase().includes(q)) : tab === "labels" ? LABELS : [];
  const iconBases = useMemo(() => {
    if (!q && tab !== "icons") return [];
    const set = !q && iconSet !== "all" ? (ICON_COLLECTIONS[iconSet as keyof typeof ICON_COLLECTIONS] as readonly string[]) : null;
    return searchIcons(q).filter((b) => !set || set.includes(b));
  }, [q, tab, iconSet]);
  const emoji = q ? [] : tab === "emoji" ? EMOJI_GROUPS.find((g) => g.id === emojiGroup)?.items ?? [] : [];
  const badges = q
    ? STORE_BADGES.filter((b) => b.label.toLowerCase().includes(q) || "store badge download".includes(q))
    : tab === "badges"
      ? STORE_BADGES
      : [];
  const more = iconBases.length - Math.min(visible, iconBases.length);
  const empty = labels.length + iconBases.length + emoji.length + badges.length === 0;

  const commit = (r: { scene: ReturnType<typeof useSceneStore.getState>["scene"]; layerId: string }) => {
    setScene(() => r.scene);
    select(r.layerId);
    setAdded((n) => n + 1);
  };
  const scene = () => useSceneStore.getState().scene;

  const addIcon = (base: string) => {
    const url = iconDataUrl(base, solid, palette);
    if (!url) return;
    const asset = ingestGenerated(`icon-${base}`, url, 512, 512);
    useViewStore.getState().bumpAssets();
    commit(addIconSticker(scene(), asset.id));
  };
  const addBadge = (id: string, variant: "dark" | "light") => {
    const url = badgeDataUrl(id, variant);
    if (!url) return;
    const asset = ingestGenerated(`badge-${id}-${variant}`, url, BADGE_W, BADGE_H);
    useViewStore.getState().bumpAssets();
    commit(addIconSticker(scene(), asset.id, BADGE_H));
  };

  const showIconStyle = iconBases.length > 0;

  return (
    <Popover onEscape={onClose} className="!z-[200] bottom-[calc(100%+10px)] left-1/2 w-[392px] max-w-[calc(100vw-24px)] -translate-x-1/2 overflow-hidden p-0">
      <div className="px-3.5 pb-2.5 pt-3">
        <div className="mb-2.5 flex items-center justify-between">
          <div>
            <p className="text-[13px] font-bold tracking-[-0.01em] text-[#17171c]">Stickers</p>
            <p className="text-[10.5px] text-[#9a9aa4]">{added ? `${added} added · keep clicking to add more` : "Click to add · stays open for more"}</p>
          </div>
          <button title="Close stickers" aria-label="Close stickers" onClick={onClose} className="fk-press grid h-7 w-7 place-items-center rounded-lg text-[#8a8a94] hover:bg-black/5 hover:text-[#17171c]">
            <X size={15} />
          </button>
        </div>
        <label className="flex items-center gap-2 rounded-xl border border-[#e4e4ec] bg-[#f7f7fa] px-2.5 py-2 focus-within:border-[#17171c] focus-within:bg-white">
          <Search size={14} className="text-[#8a8a94]" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search labels, icons, badges" className="min-w-0 flex-1 bg-transparent text-xs text-[#17171c] outline-none" />
          {query && (
            <button aria-label="Clear search" onClick={() => setQuery("")} className="text-[#a0a0aa] hover:text-[#17171c]">
              <X size={13} />
            </button>
          )}
        </label>
        {!q && (
          <div className="mt-2.5 grid grid-cols-4 gap-0.5 rounded-xl bg-[#ececf2] p-1" role="tablist">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={tab === t.id}
                data-popover-autofocus={tab === t.id ? "true" : undefined}
                onClick={() => setTab(t.id)}
                className={`fk-press rounded-lg py-1.5 text-[11.5px] font-semibold transition-colors ${
                  tab === t.id ? "bg-white text-[#17171c] shadow-[0_1px_4px_rgba(20,20,40,0.12)]" : "text-[#8a8a94] hover:text-[#4a4a55]"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* per-tab controls */}
        {!q && tab === "labels" && (
          <div className="mt-2.5 flex items-center gap-1.5">
            <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a0a0aa]">Colour</span>
            <button
              aria-pressed={labelTint === null}
              onClick={() => setLabelTint(null)}
              className={`fk-press h-5 rounded-full px-2 text-[10px] font-bold ${labelTint === null ? "bg-[#17171c] text-white" : "bg-[#f1f1f5] text-[#5a5a66]"}`}
            >
              Auto
            </button>
            {LABEL_TINTS.map((c) => (
              <button
                key={c}
                aria-label={`Colour ${c}`}
                aria-pressed={labelTint === c}
                onClick={() => setLabelTint(c)}
                className="fk-press h-5 w-5 rounded-full ring-1 ring-black/10 transition-transform hover:scale-110"
                style={{ background: c, boxShadow: labelTint === c ? `0 0 0 2px #fff, 0 0 0 3.5px ${c === "#ffffff" ? "#c9c9d4" : c}` : undefined }}
              />
            ))}
          </div>
        )}
        {!q && tab === "icons" && (
          <div className="mt-2.5 flex gap-1">
            {ICON_SETS.map((s) => (
              <Chip key={s.id} active={iconSet === s.id} onClick={() => setIconSet(s.id)}>
                {s.label}
              </Chip>
            ))}
          </div>
        )}
        {showIconStyle && (
          <div className="mt-2 flex items-center gap-1.5">
            <span className="mr-0.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#a0a0aa]">Style</span>
            {(Object.keys(ICON_PALETTES) as (keyof typeof ICON_PALETTES)[]).map((key) => {
              const active = iconStyle.type === "palette" && iconStyle.key === key;
              return (
                <button
                  key={key}
                  title={`${key} duotone`}
                  aria-pressed={active}
                  onClick={() => setIconStyle({ type: "palette", key })}
                  className="fk-press h-5 w-7 rounded-full ring-1 ring-black/10"
                  style={{ background: `linear-gradient(135deg, ${ICON_PALETTES[key].join(", ")})`, boxShadow: active ? "0 0 0 2px #fff, 0 0 0 3.5px #17171c" : undefined }}
                />
              );
            })}
            <span className="mx-0.5 h-4 w-px bg-[#e4e4ec]" />
            {SOLID_TINTS.map((c) => {
              const active = iconStyle.type === "solid" && iconStyle.color === c;
              return (
                <button
                  key={c}
                  title={`Solid ${c}`}
                  aria-pressed={active}
                  onClick={() => setIconStyle({ type: "solid", color: c })}
                  className="fk-press h-[18px] w-[18px] rounded-full ring-1 ring-black/10"
                  style={{ background: c, boxShadow: active ? `0 0 0 2px #fff, 0 0 0 3.5px ${c === "#ffffff" ? "#c9c9d4" : c}` : undefined }}
                />
              );
            })}
          </div>
        )}
        {!q && tab === "emoji" && (
          <div className="panel-scroll mt-2.5 flex gap-1 overflow-x-auto pb-0.5">
            {EMOJI_GROUPS.map((g) => (
              <Chip key={g.id} active={emojiGroup === g.id} onClick={() => setEmojiGroup(g.id)}>
                {g.label}
              </Chip>
            ))}
          </div>
        )}
      </div>

      <div
        className="panel-scroll max-h-[380px] overflow-y-auto border-t border-[#ececf2] bg-[#fafafc] px-3 py-3"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (more > 0 && el.scrollTop + el.clientHeight > el.scrollHeight - 320) setVisible((c) => c + PAGE);
        }}
      >
        {labels.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {labels.map((l) => (
              <button
                key={l.name}
                title={`Add ${l.name.toLowerCase()}`}
                onClick={() => commit(addLabel(scene(), l.kind, l.text, labelTint ?? l.tint))}
                className="fk-press group grid h-[78px] place-items-center rounded-xl border border-[#ececf2] bg-white transition-[border-color,box-shadow] hover:border-[#c9c9d4] hover:shadow-[0_6px_18px_rgba(20,20,40,0.1)]"
                style={(labelTint ?? l.tint) === "#ffffff" ? { background: "#2a2440" } : undefined}
              >
                <span className="transition-transform duration-200 group-hover:scale-105">
                  <ScaledLabel preset={l} tint={labelTint ?? l.tint} w={100} h={56} />
                </span>
              </button>
            ))}
          </div>
        )}

        {badges.length > 0 && (
          <div className={`grid grid-cols-2 gap-2 ${labels.length ? "mt-3" : ""}`}>
            {badges.flatMap((b) =>
              (["dark", "light"] as const).map((v) => (
                <button
                  key={`${b.id}-${v}`}
                  title={`Add ${b.label} (${v})`}
                  onClick={() => addBadge(b.id, v)}
                  className={`fk-press grid place-items-center rounded-xl border px-3 py-3 transition-[border-color,box-shadow] hover:shadow-[0_6px_18px_rgba(20,20,40,0.1)] ${
                    v === "light" ? "border-[#ececf2] bg-[#ececf2] hover:border-[#c9c9d4]" : "border-[#ececf2] bg-white hover:border-[#c9c9d4]"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={badgeDataUrl(b.id, v) ?? ""} alt={b.label} className="h-9 w-auto" />
                </button>
              ))
            )}
          </div>
        )}

        {iconBases.length > 0 && (
          <div className={`grid grid-cols-6 gap-1.5 ${labels.length || badges.length ? "mt-3" : ""}`}>
            {iconBases.slice(0, visible).map((base) => (
              <button
                key={base}
                title={base.replaceAll("-", " ")}
                onClick={() => addIcon(base)}
                className={`fk-press grid aspect-square place-items-center rounded-xl border transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:shadow-[0_6px_16px_rgba(20,20,40,0.12)] ${
                  iconStyle.type === "solid" && luma(solid) > 0.72 ? "border-transparent bg-[#2a2440]" : "border-[#ececf2] bg-white hover:border-[#c9c9d4]"
                }`}
              >
                <svg
                  viewBox={ICON_VIEWBOX}
                  width={28}
                  height={28}
                  style={{ color: solid }}
                  aria-hidden
                  dangerouslySetInnerHTML={{ __html: iconBody(base, palette) ?? "" }}
                />
              </button>
            ))}
          </div>
        )}

        {emoji.length > 0 && (
          <div className="grid grid-cols-6 gap-1.5">
            {emoji.map((g, i) => (
              <button
                key={`${g}-${i}`}
                title={`Add ${g}`}
                onClick={() => commit(addEmoji(scene(), g))}
                className="fk-press grid aspect-square place-items-center rounded-xl border border-[#ececf2] bg-white text-[26px] leading-none transition-[border-color,box-shadow,transform] hover:-translate-y-0.5 hover:border-[#c9c9d4] hover:shadow-[0_6px_16px_rgba(20,20,40,0.12)]"
              >
                {g}
              </button>
            ))}
          </div>
        )}

        {empty && <p className="py-10 text-center text-xs text-[#9a9aa4]">Nothing matches “{query}”.</p>}
        {more > 0 && <p className="pb-1 pt-3 text-center text-[10.5px] text-[#9a9aa4]">Scroll for {more.toLocaleString()} more icons…</p>}
      </div>
    </Popover>
  );
}
