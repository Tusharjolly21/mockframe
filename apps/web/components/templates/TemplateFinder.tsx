"use client";

import { useEffect, useRef, useState } from "react";
import { ImagePlus, Loader2, Search, X } from "lucide-react";
import { track } from "@/lib/analytics";
import { clearMyShots, ensureMyShots, setMyShots, useMyShots } from "@/lib/myShots";
import { MAX_SHOTS } from "@/lib/templateShots";
import { TEMPLATE_USES, type TemplateFilter } from "@/lib/templateSearch";

/** The saved screenshots, loading them on first use. Empty until ready. */
export function useShots() {
  const status = useMyShots((s) => s.status);
  const shots = useMyShots((s) => s.shots);
  useEffect(() => {
    if (status === "idle") void ensureMyShots();
  }, [status]);
  return status === "ready" ? shots : [];
}

const imageFiles = (list: FileList | File[] | null | undefined) => [...(list ?? [])].filter((f) => f.type.startsWith("image/"));

/**
 * The gallery's control bar: search, "what is it for" filters, and your
 * screenshots, which every template then previews with. Screenshots can also
 * be dropped or pasted anywhere on the page.
 */
export function TemplateFinder({ filter, onFilter: setFilter }: { filter: TemplateFilter; onFilter: (f: TemplateFilter) => void }) {
  const anchorRef = useRef<HTMLDivElement>(null);
  // the results shrink as you filter: bring the top of them back into view
  const onFilter = (f: TemplateFilter) => {
    setFilter(f);
    const top = (anchorRef.current?.getBoundingClientRect().top ?? 0) + window.scrollY - 64;
    if (window.scrollY > top) window.scrollTo({ top });
  };
  const status = useMyShots((s) => s.status);
  const shots = useShots();
  const fileRef = useRef<HTMLInputElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const addShots = async (files: File[], via: string) => {
    if (!files.length) return;
    setBusy(true);
    setNote(null);
    try {
      const n = await setMyShots(files);
      if (!n) setNote("Those files couldn't be read as images.");
      else {
        track("template_shots_added", { count: n, via });
        if (files.length > MAX_SHOTS) setNote(`Using the first ${MAX_SHOTS}.`);
      }
    } finally {
      setBusy(false);
    }
  };

  // drop or paste anywhere on the page
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => !!e.dataTransfer?.types.includes("Files");
    const enter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth++;
      setDragging(true);
    };
    const leave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const over = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const drop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      void addShots(imageFiles(e.dataTransfer?.files), "drop");
    };
    const paste = (e: ClipboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
      const files = imageFiles(e.clipboardData?.files);
      if (files.length) void addShots(files, "paste");
    };
    // "/" jumps to search, like most galleries
    const key = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (e.key !== "/" || e.metaKey || e.ctrlKey || (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable))) return;
      e.preventDefault();
      searchRef.current?.focus();
    };
    window.addEventListener("dragenter", enter);
    window.addEventListener("dragleave", leave);
    window.addEventListener("dragover", over);
    window.addEventListener("drop", drop);
    window.addEventListener("paste", paste);
    window.addEventListener("keydown", key);
    return () => {
      window.removeEventListener("dragenter", enter);
      window.removeEventListener("dragleave", leave);
      window.removeEventListener("dragover", over);
      window.removeEventListener("drop", drop);
      window.removeEventListener("paste", paste);
      window.removeEventListener("keydown", key);
    };
  }, []);

  const loading = busy || status === "loading" || status === "idle";

  return (
    <>
      <div ref={anchorRef} aria-hidden />
      <div className="z-30 -mx-2 mt-6 px-2 py-2 lg:sticky lg:top-[60px]">
        <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-[#0e0f14]/90 p-2 shadow-[0_12px_40px_rgba(0,0,0,.35)] backdrop-blur-xl lg:flex-row lg:items-center">
          <label className="flex h-11 min-w-0 items-center gap-2.5 rounded-xl bg-white/[0.05] px-3.5 ring-1 ring-transparent focus-within:ring-cyan-300/50 lg:w-[300px]">
            <Search size={16} className="shrink-0 text-zinc-500" />
            <input
              ref={searchRef}
              type="search"
              value={filter.query}
              onChange={(e) => onFilter({ ...filter, query: e.target.value })}
              onKeyDown={(e) => e.key === "Escape" && onFilter({ ...filter, query: "" })}
              placeholder="Search templates"
              aria-label="Search templates"
              className="min-w-0 flex-1 bg-transparent text-[14px] text-white outline-none placeholder:text-zinc-500 [&::-webkit-search-cancel-button]:hidden"
            />
            {filter.query ? (
              <button type="button" onClick={() => onFilter({ ...filter, query: "" })} aria-label="Clear search" className="grid h-6 w-6 place-items-center rounded-md text-zinc-500 hover:bg-white/10 hover:text-white">
                <X size={14} />
              </button>
            ) : (
              <kbd className="hidden rounded-md border border-white/10 px-1.5 text-[11px] text-zinc-500 sm:block">/</kbd>
            )}
          </label>

          <div role="radiogroup" aria-label="What it's for" className="flex gap-1 overflow-x-auto [scrollbar-width:none]">
            {[{ id: null, label: "Everything" } as const, ...TEMPLATE_USES].map((u) => {
              const on = filter.use === u.id;
              return (
                <button
                  key={u.label}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => onFilter({ ...filter, use: u.id })}
                  className={`h-9 shrink-0 rounded-lg px-3 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white ${
                    on ? "bg-white text-zinc-950" : "text-zinc-400 hover:bg-white/[0.06] hover:text-white"
                  }`}
                >
                  {u.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 lg:ml-auto">
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              hidden
              onChange={(e) => {
                void addShots(imageFiles(e.target.files), "browse");
                e.target.value = "";
              }}
            />
            {shots.length ? (
              <>
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  className="flex h-11 min-w-0 flex-1 items-center gap-2.5 rounded-xl bg-cyan-300/[0.09] pl-2 pr-3.5 text-left ring-1 ring-cyan-300/25 transition-colors hover:bg-cyan-300/[0.14] lg:flex-none"
                  title="Choose different screenshots"
                >
                  <span className="flex shrink-0 -space-x-2.5">
                    {shots.slice(0, 3).map((s) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img key={s.assetId} src={s.url} alt="" className="h-8 w-8 rounded-md object-cover object-top ring-2 ring-[#0e0f14]" />
                    ))}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-[13px] font-semibold text-white">
                      {shots.length === 1 ? "Showing your screenshot" : `Showing your ${shots.length} screenshots`}
                    </span>
                    <span className="block text-[11.5px] text-cyan-200/70">Change</span>
                  </span>
                  {busy && <Loader2 size={15} className="ml-auto shrink-0 animate-spin text-cyan-200" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void clearMyShots();
                    track("template_shots_cleared");
                  }}
                  aria-label="Show the sample screens again"
                  title="Show the sample screens again"
                  className="grid h-11 w-11 shrink-0 place-items-center rounded-xl text-zinc-400 ring-1 ring-white/10 transition-colors hover:bg-white/[0.06] hover:text-white"
                >
                  <X size={16} />
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                disabled={loading && status !== "ready"}
                className="flex h-11 flex-1 items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 px-4 text-[13px] font-semibold text-zinc-200 transition-colors hover:border-cyan-300/60 hover:bg-cyan-300/[0.06] hover:text-white disabled:opacity-60 lg:flex-none"
              >
                {loading ? <Loader2 size={16} className="animate-spin" /> : <ImagePlus size={16} className="text-cyan-300" />}
                Preview with your screenshots
              </button>
            )}
          </div>
        </div>
        {note && <p role="status" className="mt-2 px-1 text-[12.5px] text-amber-200/90">{note}</p>}
      </div>

      {dragging && (
        <div className="pointer-events-none fixed inset-0 z-[60] grid place-items-center bg-[#09090b]/80 backdrop-blur-sm">
          <div className="rounded-3xl border-2 border-dashed border-cyan-300/60 bg-cyan-300/[0.06] px-10 py-9 text-center">
            <ImagePlus size={30} className="mx-auto text-cyan-300" />
            <p className="mt-3 text-[18px] font-semibold text-white">Drop to see every template with your screenshots</p>
            <p className="mt-1 text-[13px] text-zinc-400">Up to {MAX_SHOTS}. Phone, tablet and desktop screenshots each go where they fit.</p>
          </div>
        </div>
      )}
    </>
  );
}
