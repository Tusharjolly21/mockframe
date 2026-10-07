"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ChevronDown, Search, Trash2, Upload } from "lucide-react";
import {
  FONT_ACCEPT,
  FONT_CATALOG,
  FONT_CATEGORIES,
  addCustomFonts,
  catalogFont,
  customFamilies,
  deleteCustomFamily,
  ensureGoogleFont,
  ensurePickerPreviews,
  loadCustomFonts,
  onCustomFontsChange,
  previewFamily,
  type FontCategory,
} from "@/lib/fonts";

type Filter = "All" | "Yours" | FontCategory;

const CATEGORY_LABEL: Record<FontCategory, string> = {
  Sans: "Sans serif",
  Serif: "Serif",
  Display: "Display",
  Mono: "Monospace",
  Handwriting: "Handwriting",
};

const toast = (msg: string) =>
  window.dispatchEvent(new CustomEvent("framekit:toast", { detail: msg }));

/** Uploaded families, re-rendering when fonts are added, removed or synced. */
export function useCustomFamilies() {
  const [list, setList] = useState(customFamilies);
  useEffect(() => {
    void loadCustomFonts();
    setList(customFamilies());
    return onCustomFontsChange(() => setList(customFamilies()));
  }, []);
  return list;
}

const isFontFile = (f: File) => /\.(ttf|otf|woff2?)$/i.test(f.name);

/**
 * Font menu for text layers: search, category filters, every family previewed
 * in its own face, and the user's uploaded fonts (upload / drop / delete).
 * Expands inline so it never gets clipped by the scrolling side panel.
 */
export function FontPicker({
  value,
  onChange,
  trailing,
}: {
  value: string;
  onChange: (family: string) => void;
  trailing?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("All");
  const [active, setActive] = useState(0);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const custom = useCustomFamilies();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const isCustom = custom.some((c) => c.family === value);
  const known = isCustom || !!catalogFont(value);

  useEffect(() => {
    if (!open) return;
    void ensurePickerPreviews();
    searchRef.current?.focus();
    const onDown = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  useEffect(() => {
    if (!open) {
      setQuery("");
      setConfirmDelete(null);
    }
  }, [open]);

  // one flat, ordered list of what's visible — drives rendering and arrow keys
  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = (family: string) => !q || family.toLowerCase().includes(q);
    const out: { title: string; families: string[]; custom?: boolean }[] = [];
    if (!known && value && match(value) && filter === "All")
      out.push({ title: "In this design", families: [value] });
    if (filter === "All" || filter === "Yours") {
      const mine = custom.map((c) => c.family).filter(match);
      if (mine.length)
        out.push({ title: "Your fonts", families: mine, custom: true });
    }
    for (const cat of FONT_CATEGORIES) {
      if (filter !== "All" && filter !== cat) continue;
      const fams = FONT_CATALOG.filter((f) => f.category === cat)
        .map((f) => f.family)
        .filter(match);
      if (fams.length) out.push({ title: CATEGORY_LABEL[cat], families: fams });
    }
    return out;
  }, [query, filter, custom, known, value]);

  const flat = useMemo(() => sections.flatMap((s) => s.families), [sections]);

  // keep the highlight on the selected family when the menu opens / filters change
  useEffect(() => {
    if (!open) return;
    const i = flat.indexOf(value);
    setActive(i >= 0 ? i : 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, query, filter]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-font-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  const choose = (family: string) => {
    onChange(family);
    void ensureGoogleFont(family);
    setOpen(false);
  };

  const upload = async (files: File[]) => {
    const fonts = files.filter(isFontFile);
    if (!fonts.length) {
      toast("Drop a .ttf, .otf, .woff or .woff2 file");
      return;
    }
    setBusy(true);
    try {
      const { added, errors } = await addCustomFonts(fonts);
      for (const err of errors) toast(err);
      if (added.length) {
        const families = [...new Set(added.map((f) => f.family))];
        onChange(families[0]);
        setFilter("All");
        setQuery("");
        if (!errors.length)
          toast(
            families.length === 1
              ? `Added ${families[0]}`
              : `Added ${families.length} fonts`,
          );
      }
    } finally {
      setBusy(false);
    }
  };

  // handled keys stop here so the editor's shortcuts (nudge, deselect) don't also fire
  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      setActive((i) => Math.min(flat.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      setActive((i) => Math.max(0, i - 1));
    } else if (
      e.key === "Enter" &&
      flat[active] &&
      e.target === searchRef.current
    ) {
      choose(flat[active]);
    } else {
      return;
    }
    e.preventDefault();
    e.stopPropagation();
  };

  const filters: Filter[] = [
    "All",
    ...(custom.length ? (["Yours"] as Filter[]) : []),
    ...FONT_CATEGORIES,
  ];
  const faceFor = (family: string, mine: boolean) =>
    mine ? `'${family}', system-ui` : previewFamily(family);
  let index = -1;

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={open ? onKeyDown : undefined}
    >
      <div className="flex gap-2">
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          onClick={() => setOpen((o) => !o)}
          className="fk-press flex min-w-0 flex-1 items-center justify-between gap-2 rounded-xl border border-[#e4e4ec] bg-white px-3 py-2 text-left text-[13px] text-[#17171c] hover:border-[#c9c9d6]"
        >
          <span
            className="truncate"
            style={{ fontFamily: `'${value}', system-ui` }}
          >
            {value}
          </span>
          <ChevronDown
            size={14}
            className={`shrink-0 text-[#8b8b99] transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>
        {trailing}
      </div>

      {open && (
        <div
          className={`mt-2 overflow-hidden rounded-2xl border bg-white shadow-[0_12px_32px_-12px_rgba(23,23,28,0.25)] ${dragging ? "border-[#17171c] ring-2 ring-[#17171c]/10" : "border-[#e4e4ec]"}`}
          onDragOver={(e) => {
            if (!e.dataTransfer.types.includes("Files")) return;
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={(e) => {
            if (!e.currentTarget.contains(e.relatedTarget as Node))
              setDragging(false);
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation(); // the canvas also accepts drops — this one is a font
            setDragging(false);
            void upload([...e.dataTransfer.files]);
          }}
        >
          <div className="border-b border-[#efeff4] p-2">
            <label className="flex items-center gap-2 rounded-lg bg-[#f4f4f7] px-2.5 py-1.5">
              <Search size={13} className="text-[#8b8b99]" />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search fonts"
                aria-label="Search fonts"
                className="w-full bg-transparent text-[12.5px] text-[#17171c] placeholder:text-[#9a9aa8] focus:outline-none"
              />
            </label>
            <div className="mt-2 flex flex-wrap gap-1">
              {filters.map((f) => (
                <button
                  key={f}
                  type="button"
                  onClick={() => setFilter(f)}
                  className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${filter === f ? "bg-[#17171c] text-white" : "bg-[#f4f4f7] text-[#55555f] hover:bg-[#ebebf0]"}`}
                >
                  {f === "Handwriting" ? "Script" : f}
                </button>
              ))}
            </div>
          </div>

          <div
            ref={listRef}
            role="listbox"
            aria-label="Fonts"
            className="max-h-72 overflow-y-auto py-1"
          >
            {sections.length === 0 && (
              <div className="px-3 py-6 text-center text-[12px] text-[#8b8b99]">
                <p>
                  No {filter === "All" ? "" : `${filter === "Handwriting" ? "script" : filter.toLowerCase()} `}fonts match “{query}”.
                </p>
                {filter !== "All" ? (
                  <button
                    type="button"
                    onClick={() => setFilter("All")}
                    className="mt-2 rounded-full bg-[#f4f4f7] px-3 py-1 text-[11.5px] font-medium text-[#17171c] hover:bg-[#ebebf0]"
                  >
                    Search all fonts
                  </button>
                ) : (
                  <p>Upload it below if you have the file.</p>
                )}
              </div>
            )}
            {sections.map((section) => (
              <div key={section.title}>
                <p className="px-3 pb-1 pt-2.5 text-[10px] font-semibold uppercase tracking-[0.08em] text-[#9a9aa8]">
                  {section.title}
                </p>
                {section.families.map((family) => {
                  index += 1;
                  const i = index;
                  const selected = family === value;
                  const weights = section.custom
                    ? (custom.find((c) => c.family === family)?.weights
                        .length ?? 1)
                    : (catalogFont(family)?.weights.length ?? 0);
                  return (
                    <div
                      key={`${section.title}-${family}`}
                      data-font-index={i}
                      role="option"
                      aria-selected={selected}
                      onMouseEnter={() => setActive(i)}
                      className={`group mx-1 flex items-center gap-2 rounded-lg px-2 ${i === active ? "bg-[#f4f4f7]" : ""}`}
                    >
                      <button
                        type="button"
                        onClick={() => choose(family)}
                        className="flex min-w-0 flex-1 items-center gap-2 py-1.5 text-left"
                      >
                        <span className="w-3.5 shrink-0">
                          {selected && (
                            <Check size={13} className="text-[#17171c]" />
                          )}
                        </span>
                        <span
                          className="truncate text-[15px] leading-6 text-[#17171c]"
                          style={{
                            fontFamily: faceFor(family, !!section.custom),
                          }}
                        >
                          {family}
                        </span>
                      </button>
                      {weights > 1 && (
                        <span className="shrink-0 text-[10px] tabular-nums text-[#a5a5b2]">
                          {weights} wt
                        </span>
                      )}
                      {section.custom && (
                        <button
                          type="button"
                          aria-label={
                            confirmDelete === family
                              ? `Confirm delete ${family}`
                              : `Delete ${family}`
                          }
                          onClick={async () => {
                            if (confirmDelete !== family) {
                              setConfirmDelete(family);
                              return;
                            }
                            setConfirmDelete(null);
                            await deleteCustomFamily(family);
                            toast(`Removed ${family}`);
                          }}
                          className={`shrink-0 rounded-md px-1.5 py-1 text-[10.5px] font-medium transition-colors ${confirmDelete === family ? "bg-[#e5484d] text-white" : "text-[#a5a5b2] opacity-0 hover:bg-[#ebebf0] hover:text-[#e5484d] focus-visible:opacity-100 group-hover:opacity-100"}`}
                        >
                          {confirmDelete === family ? (
                            "Delete"
                          ) : (
                            <Trash2 size={12} />
                          )}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2 border-t border-[#efeff4] p-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              className="fk-press inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg bg-[#17171c] px-3 py-1.5 text-[12px] font-semibold text-white disabled:opacity-60"
            >
              <Upload size={12} /> {busy ? "Adding…" : "Upload font"}
            </button>
            <span className="text-[10.5px] leading-tight text-[#9a9aa8]">
              TTF, OTF, WOFF, WOFF2 · or drop files here
            </span>
            <input
              ref={fileRef}
              type="file"
              accept={FONT_ACCEPT}
              multiple
              hidden
              onChange={(e) => {
                const files = [...(e.target.files ?? [])];
                e.target.value = "";
                if (files.length) void upload(files);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
