"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HOME_STORIES } from "@/lib/marketing/stories";
import { AppIconMarquee } from "./AppIconMarquee";
import { LiveChatStory, PhoneShell } from "./LiveChatStory";

/**
 * The homepage's showpiece: real chat stories playing LIVE — the same replay
 * the studio renders and exports, not screenshots. A conversation unfolds line
 * by line and viewers stay to see how it ends. All fiction, written from
 * scratch, playing back exactly as it exports.
 */
export function ChatStoriesSection() {
  return (
    <section className="relative overflow-hidden border-t border-white/[0.06] bg-[#0b0b0d] py-28">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }}
      />
      <div className="mx-auto max-w-6xl px-6">
        <div className="flex flex-col items-center text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-zinc-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> The chat-story format
          </span>
          <h2 className="mt-5 max-w-2xl text-[30px] font-medium leading-[1.1] tracking-[-0.025em] text-white sm:text-[46px]">
            Chat stories that keep viewers to the last message
          </h2>
          <p className="mt-4 max-w-xl text-[15px] leading-relaxed text-zinc-400">
            A conversation unfolds line by line and people stay to see how it ends. Every story below is
            playing live in the same engine that renders your export — press nothing, it&apos;s already running.
          </p>
        </div>

        <div className="mt-16 grid gap-x-8 gap-y-14 sm:grid-cols-2 md:grid-cols-3">
          {HOME_STORIES.map((story) => (
            <div key={story.id} className="flex flex-col items-center">
              <div className="w-[232px] max-w-full">
                <PhoneShell notch={story.notch}>
                  <LiveChatStory doc={story.doc} className="absolute inset-0" />
                </PhoneShell>
              </div>
              <div className="mt-7 text-center">
                <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.03] px-2.5 py-0.5 text-[10.5px] font-semibold uppercase tracking-wide text-emerald-300">
                  <span className="h-1 w-1 rounded-full bg-emerald-400" /> {story.eyebrow}
                </span>
                <h3 className="mt-3 text-[20px] font-medium tracking-[-0.02em] text-white">{story.title}</h3>
                <p className="mx-auto mt-2 max-w-[16rem] text-[13.5px] leading-relaxed text-zinc-400">{story.blurb}</p>
              </div>
            </div>
          ))}
        </div>

        {/* infinite marquee of every app you can fake */}
        <div className="mt-20">
          <p className="mb-6 text-center text-[11px] font-semibold uppercase tracking-widest text-zinc-600">
            Fake any app your story needs
          </p>
          <AppIconMarquee />
        </div>

        <div className="mt-16 flex flex-col items-center gap-3">
          <Link
            href="/editor"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-[14.5px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
          >
            Write your own chat story
            <ArrowRight size={17} />
          </Link>
          <p className="text-[12px] text-zinc-500">
            Script it, style it, export a vertical video for TikTok, Reels &amp; Shorts — no editing.
          </p>
        </div>
      </div>
    </section>
  );
}
