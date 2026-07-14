"use client";

import { useEffect, useRef, useState } from "react";
import {
  animStateDoc,
  buildAnimPlan,
  encodeScreenAsset,
  resolveScreenAsset,
  type ScreenDoc,
} from "@/lib/screens";

/**
 * A self-playing chat replay — the SAME animation the editor's Preview and the
 * video export produce, running live on the marketing page. Messages reveal one
 * bubble at a time with typing beats and read receipts, then loops. This is the
 * product demoing itself: what plays here is exactly what exports.
 *
 * Renders each frame by encoding a sliced `animStateDoc` and pulling the SVG
 * data-URL out of the same generator the app uses. Plays only while on-screen
 * (IntersectionObserver) and honours prefers-reduced-motion (shows the final
 * frame, no loop).
 */
export function LiveChatStory({
  doc,
  className,
  loopPauseMs = 2600,
}: {
  doc: ScreenDoc;
  className?: string;
  loopPauseMs?: number;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const visibleRef = useRef(false);
  const cancelRef = useRef(false);

  useEffect(() => {
    const frame = (d: ScreenDoc) => resolveScreenAsset(encodeScreenAsset(d))?.url ?? null;
    const full = frame(doc);
    setSrc(full); // paint the finished thread immediately; animation takes over

    const reduce =
      typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const plan = buildAnimPlan(doc);
    if (plan.length === 0) return;

    const sleep = (ms: number) =>
      new Promise<void>((r) => {
        const id = setTimeout(r, ms);
        timers.push(id);
      });
    const timers: ReturnType<typeof setTimeout>[] = [];

    async function run() {
      // wait until the tile is actually visible before the first play
      while (!visibleRef.current && !cancelRef.current) await sleep(200);
      while (!cancelRef.current) {
        for (const shot of plan) {
          if (cancelRef.current) return;
          if (shot.typing) {
            const cycles = Math.max(1, Math.round(shot.holdMs / 200));
            for (let p = 0; p < cycles; p++) {
              setSrc(frame(animStateDoc(doc, shot.k, true, p, false)));
              await sleep(200);
              if (cancelRef.current) return;
            }
          } else {
            setSrc(frame(animStateDoc(doc, shot.k, false, 0, !!shot.settled)));
            await sleep(shot.holdMs);
          }
          // pause the loop while scrolled away, then resume from where it left
          while (!visibleRef.current && !cancelRef.current) await sleep(300);
        }
        await sleep(loopPauseMs);
      }
    }
    void run();

    const io = new IntersectionObserver(
      ([e]) => {
        visibleRef.current = e.isIntersecting;
      },
      { threshold: 0.25 }
    );
    if (hostRef.current) io.observe(hostRef.current);

    return () => {
      cancelRef.current = true;
      io.disconnect();
      timers.forEach(clearTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [doc]);

  return (
    <div ref={hostRef} className={className}>
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt="Live chat replay" className="block h-full w-full object-cover" />
      ) : (
        <div className="h-full w-full" style={{ aspectRatio: "393/852" }} />
      )}
    </div>
  );
}

/** Wraps a live story in a dark phone shell — bezel, notch, screen. */
export function PhoneShell({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`relative overflow-hidden rounded-[38px] border-[6px] border-[#0d0d10] bg-black shadow-[0_40px_90px_rgba(0,0,0,0.6)] ${className ?? ""}`}
      style={{ aspectRatio: "393/852" }}
    >
      <div className="absolute left-1/2 top-2 z-10 h-[26px] w-[92px] -translate-x-1/2 rounded-full bg-black" />
      {children}
    </div>
  );
}
