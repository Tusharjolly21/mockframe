"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ImageUp, LoaderCircle } from "lucide-react";
import { track } from "@/lib/analytics";
import { parkScreenshot } from "@/lib/handoff";

const ACCEPT = "image/png,image/jpeg,image/webp,image/gif,image/avif";

const firstImage = (files: FileList | File[] | null | undefined) => Array.from(files ?? []).find((f) => f.type.startsWith("image/"));

/**
 * "Drop a screenshot" on the homepage hero: drop it anywhere on the page,
 * paste it, or browse. The file is parked for the editor, which opens it
 * already inside a matching device.
 */
export function HeroDrop() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busyRef = useRef(false);

  useEffect(() => {
    router.prefetch("/editor");
  }, [router]);

  async function open(file: File | undefined, via: "drop" | "paste" | "browse") {
    if (busyRef.current) return;
    if (!file) {
      setError("That isn't an image. Try a PNG, JPG or WebP screenshot.");
      return;
    }
    if (file.size > 40 * 1024 * 1024) {
      setError("That image is over 40 MB. Try a smaller screenshot.");
      return;
    }
    busyRef.current = true;
    setBusy(true);
    setError(null);
    track("homepage_drop", { via, mime: file.type });
    try {
      await parkScreenshot(file);
      router.push("/editor?drop=1");
    } catch {
      // storage blocked (some private modes): the editor still takes drops
      router.push("/editor");
    }
  }

  // the whole page is a drop target; a counter survives dragenter/leave on children
  useEffect(() => {
    let depth = 0;
    const hasFiles = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files");
    const onEnter = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth++;
      setDragging(true);
    };
    const onOver = (e: DragEvent) => {
      if (hasFiles(e)) e.preventDefault();
    };
    const onLeave = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      depth = Math.max(0, depth - 1);
      if (!depth) setDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      if (!hasFiles(e)) return;
      e.preventDefault();
      depth = 0;
      setDragging(false);
      void open(firstImage(e.dataTransfer?.files), "drop");
    };
    const onPaste = (e: ClipboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target?.closest("input, textarea, [contenteditable=true]")) return;
      const file = firstImage(e.clipboardData?.files);
      if (file) void open(file, "paste");
    };
    window.addEventListener("dragenter", onEnter);
    window.addEventListener("dragover", onOver);
    window.addEventListener("dragleave", onLeave);
    window.addEventListener("drop", onDrop);
    window.addEventListener("paste", onPaste);
    return () => {
      window.removeEventListener("dragenter", onEnter);
      window.removeEventListener("dragover", onOver);
      window.removeEventListener("dragleave", onLeave);
      window.removeEventListener("drop", onDrop);
      window.removeEventListener("paste", onPaste);
    };
    // open() only reads refs and stable setters
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="group relative flex w-full max-w-[520px] items-center gap-4 rounded-2xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-3.5 text-left transition-colors hover:border-violet-400/60 hover:bg-violet-500/[0.05] focus-visible:border-violet-400 focus-visible:outline-none disabled:cursor-wait"
      >
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/[0.06] text-zinc-300 transition-colors group-hover:bg-violet-500/20 group-hover:text-violet-200">
          {busy ? <LoaderCircle size={18} className="animate-spin" /> : <ImageUp size={18} />}
        </span>
        <span className="min-w-0">
          <span className="block text-[14px] font-medium text-zinc-100">
            {busy ? "Opening the editor…" : "Drop a screenshot here to try it"}
          </span>
          <span className="block text-[12.5px] text-zinc-500">
            or <span className="text-zinc-300 underline decoration-white/20 underline-offset-2">browse</span>, or paste. It opens inside a device, ready to export.
          </span>
        </span>
      </button>
      {error && (
        <p role="alert" className="mt-2 text-[12.5px] text-red-300">
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(e) => {
          void open(firstImage(e.target.files), "browse");
          e.target.value = "";
        }}
      />

      <AnimatePresence>
        {dragging && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none fixed inset-0 z-[100] grid place-items-center bg-[#09090b]/80 p-6 backdrop-blur-sm"
          >
            <motion.div
              initial={{ scale: 0.96 }}
              animate={{ scale: 1 }}
              className="flex h-full max-h-[520px] w-full max-w-[880px] flex-col items-center justify-center rounded-[28px] border-2 border-dashed border-violet-400/70 bg-violet-500/[0.06] text-center"
            >
              <ImageUp size={34} className="text-violet-200" />
              <p className="mt-4 text-[24px] font-semibold tracking-[-0.02em] text-white">Drop to put it in a device</p>
              <p className="mt-1.5 text-[14px] text-zinc-400">The editor opens with your screenshot already framed.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
