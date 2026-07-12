"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Copy, Image as ImageIcon, Pencil, Trash2 } from "lucide-react";
import {
  deleteDraft,
  listDrafts,
  openDraft,
  putDraft,
  saveCurrentDraft,
  saveDraft,
  timeAgo,
  useDraftsUi,
  type DraftRecord,
} from "@/lib/drafts";
import { useSceneStore, useViewStore } from "@/lib/store";

/** Popover body for the toolbar's Drafts button: save the live scene, then
 *  reopen / rename / duplicate / delete saved projects. Duplicate is the
 *  "reusable template" workflow — keep a styled base, stamp out copies. */
export function DraftsPanel({ onClose, onToast }: { onClose: () => void; onToast: (msg: string) => void }) {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const { currentId, setCurrent } = useDraftsUi();

  const [drafts, setDrafts] = useState<DraftRecord[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [renaming, setRenaming] = useState<string | null>(null);

  const refresh = useCallback(() => {
    listDrafts().then(setDrafts, () => setDrafts([]));
  }, []);
  useEffect(refresh, [refresh]);

  const save = async (asNew: boolean) => {
    setBusy(true);
    try {
      if (asNew) setCurrent(null);
      const rec = await saveCurrentDraft(scene);
      onToast(`Saved “${rec.name}”`);
      refresh();
    } catch {
      onToast("Couldn't save — local storage unavailable");
    } finally {
      setBusy(false);
    }
  };

  const load = (rec: DraftRecord) => {
    try {
      const next = openDraft(rec);
      setScene(() => next);
      setCurrent(rec.id, rec.name);
      const view = useViewStore.getState();
      view.bumpAssets();
      view.select(null);
      view.setActiveLayout(null);
      window.dispatchEvent(new CustomEvent("framekit:fit")); // canvas size may differ
      onClose();
    } catch {
      onToast("This draft couldn't be opened — it may be from a newer version.");
    }
  };

  const duplicate = async (rec: DraftRecord) => {
    await saveDraft({ scene: rec.scene, name: `${rec.name} copy`, thumbnail: rec.thumbnail, assets: rec.assets });
    refresh();
  };

  const remove = async (rec: DraftRecord) => {
    await deleteDraft(rec.id);
    if (rec.id === currentId) setCurrent(null);
    refresh();
  };

  const rename = async (rec: DraftRecord, name: string) => {
    setRenaming(null);
    const trimmed = name.trim();
    if (!trimmed || trimmed === rec.name) return;
    await putDraft({ ...rec, name: trimmed });
    if (rec.id === currentId) setCurrent(rec.id, trimmed);
    refresh();
  };

  return (
    <div className="w-72">
      <div className="mb-2 flex items-center gap-1.5 px-1">
        <button
          onClick={() => save(false)}
          disabled={busy}
          className="fk-press flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-[#17171c] px-3 py-2 text-xs font-semibold text-white hover:bg-black disabled:opacity-60"
        >
          <Check size={13} />
          {busy ? "Saving…" : currentId ? "Update draft" : "Save draft"}
          <span className="text-[10px] font-medium text-white/50">⌘S</span>
        </button>
        {currentId && (
          <button
            onClick={() => save(true)}
            disabled={busy}
            title="Save as a new draft"
            className="fk-press rounded-xl border border-[#e4e4ec] bg-white px-2.5 py-2 text-xs font-semibold text-[#17171c] hover:border-[#c9c9d4]"
          >
            Save new
          </button>
        )}
      </div>

      {drafts === null ? (
        <p className="px-3 py-5 text-center text-xs text-[#9a9aa4]">Loading…</p>
      ) : drafts.length === 0 ? (
        <p className="px-3 py-5 text-center text-xs leading-relaxed text-[#9a9aa4]">
          No drafts yet. Save your project to edit later — or keep one styled as a reusable template.
        </p>
      ) : (
        <div className="flex max-h-80 flex-col gap-1 overflow-y-auto">
          {drafts.map((rec) => (
            <div
              key={rec.id}
              onClick={() => load(rec)}
              className={`fk-press flex cursor-pointer items-center gap-2.5 rounded-xl border px-2 py-1.5 ${
                rec.id === currentId
                  ? "border-[#17171c] bg-[#f4f4f8]"
                  : "border-transparent hover:bg-[#f4f4f8]"
              }`}
            >
              <span className="grid h-10 w-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#ececf2] text-[#b0b0ba]">
                {rec.thumbnail ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={rec.thumbnail} alt="" className="h-full w-full object-cover" />
                ) : (
                  <ImageIcon size={14} />
                )}
              </span>
              <span className="min-w-0 flex-1">
                {renaming === rec.id ? (
                  <input
                    autoFocus
                    defaultValue={rec.name}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") rename(rec, (e.target as HTMLInputElement).value);
                      if (e.key === "Escape") setRenaming(null);
                    }}
                    onBlur={(e) => rename(rec, e.target.value)}
                    className="w-full rounded-md border border-[#c9c9d4] px-1.5 py-0.5 text-xs font-medium text-[#17171c] outline-none"
                  />
                ) : (
                  <span className="block truncate text-xs font-medium text-[#17171c]">{rec.name}</span>
                )}
                <span className="block text-[10.5px] text-[#9a9aa4]">{timeAgo(rec.updatedAt)}</span>
              </span>
              <span className="flex shrink-0 text-[#9a9aa4]">
                {(
                  [
                    ["Rename", Pencil, () => setRenaming(rec.id)],
                    ["Duplicate as template", Copy, () => void duplicate(rec)],
                    ["Delete", Trash2, () => void remove(rec)],
                  ] as const
                ).map(([title, Icon, fn]) => (
                  <button
                    key={title}
                    title={title}
                    className="fk-press rounded-md p-1 hover:bg-black/6 hover:text-[#17171c]"
                    onClick={(e) => {
                      e.stopPropagation();
                      fn();
                    }}
                  >
                    <Icon size={12} />
                  </button>
                ))}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
