"use client";

import { useEffect, useState } from "react";
import { Keyboard, X } from "lucide-react";

const isMac = () => typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);

const GROUPS: { title: string; rows: [string, string][] }[] = [
  {
    title: "Edit",
    rows: [
      ["⌘Z / ⇧⌘Z", "Undo / redo"],
      ["⌘C / ⌘X / ⌘V", "Copy, cut, paste elements"],
      ["⌘D", "Duplicate"],
      ["⌘A", "Select everything"],
      ["⌫", "Delete (clears a device's screenshot)"],
      ["⌘S", "Save to Drafts"],
    ],
  },
  {
    title: "Arrange",
    rows: [
      ["⌥A / ⌥D", "Align left / right"],
      ["⌥W / ⌥S", "Align top / bottom"],
      ["⌥H / ⌥V", "Center horizontally / vertically"],
      ["⇧⌥H / ⇧⌥V", "Distribute horizontally / vertically"],
      ["⌘] / ⌘[", "Forward / backward"],
      ["⌥⌘] / ⌥⌘[", "Bring to front / send to back"],
      ["⌘G / ⇧⌘G", "Group / ungroup"],
    ],
  },
  {
    title: "Move",
    rows: [
      ["Arrows", "Nudge 1px (⇧ for 10px)"],
      ["Drag", "Smart guides snap to canvas and other elements"],
      ["⌥ + drag", "Move without snapping"],
      ["⇧ + click", "Add to selection"],
      ["E / T / A", "Emoji, themes, annotate panels"],
      ["?", "This sheet"],
    ],
  },
];

/** "?" opens a keyboard cheat sheet; ⌘ reads as Ctrl outside macOS. */
export function ShortcutsSheet() {
  const [open, setOpen] = useState(false);
  const [mac, setMac] = useState(true);
  useEffect(() => {
    setMac(isMac());
    const show = () => setOpen(true);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("framekit:shortcuts", show);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("framekit:shortcuts", show);
      window.removeEventListener("keydown", onKey);
    };
  }, []);
  if (!open) return null;
  const k = (s: string) => (mac ? s : s.replace(/⌘/g, "Ctrl+").replace(/⌥/g, "Alt+").replace(/⇧/g, "Shift+").replace(/\+ \+/g, " +"));
  return (
    <div className="fixed inset-0 z-[80] grid place-items-center bg-[#0b0b0e]/50 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
      <div className="fk-card w-full max-w-[980px] rounded-2xl bg-white p-6" onClick={(e) => e.stopPropagation()}>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-[15px] font-bold text-[#17171c]">
            <Keyboard size={17} className="text-violet-600" /> Keyboard shortcuts
          </h2>
          <button onClick={() => setOpen(false)} className="fk-press rounded-full p-1.5 text-[#6b6b76] hover:bg-black/5">
            <X size={15} />
          </button>
        </div>
        <div className="grid gap-6 sm:grid-cols-3">
          {GROUPS.map((g) => (
            <div key={g.title}>
              <p className="mb-2 text-[10.5px] font-bold uppercase tracking-wider text-[#9a9aa4]">{g.title}</p>
              <ul className="flex flex-col gap-1.5">
                {g.rows.map(([keys, label]) => (
                  <li key={label} className="flex items-start justify-between gap-3 text-[12px]">
                    <span className="min-w-0 text-[#4a4a55]">{label}</span>
                    <kbd className="shrink-0 whitespace-nowrap rounded-md border border-black/10 bg-[#f4f4f8] px-1.5 py-0.5 font-mono text-[10.5px] text-[#17171c]">{k(keys)}</kbd>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
