"use client";

import Link from "next/link";
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
    <section className="relative overflow-hidden border-t border-white/[0.06] bg-[#0b0b0d] py-24 sm:py-32">
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.12), transparent)" }}
      />
      <div className="mx-auto max-w-6xl px-6">
        <div className="grid gap-6 lg:grid-cols-12 lg:items-end lg:gap-16">
          <h2 className="text-balance text-[32px] font-semibold leading-[1.05] tracking-[-0.04em] text-white sm:text-[44px] lg:col-span-7">
            Chat stories that keep viewers to the last message
          </h2>
          <p className="max-w-md text-[16px] leading-relaxed text-zinc-400 lg:col-span-5">
            A conversation unfolds line by line and people stay to see how it ends. The chats below are playing live
            in the same engine that renders your video export.
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
                <span className="text-[12.5px] font-medium text-emerald-300/90">{story.eyebrow.replace(" · ", ", ")}</span>
                <h3 className="mt-1.5 text-[20px] font-medium tracking-[-0.02em] text-white">{story.title}</h3>
                <p className="mx-auto mt-2 max-w-[16rem] text-[13.5px] leading-relaxed text-zinc-400">{story.blurb}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* full-bleed dock of the chat apps, each one opens in the editor */}
      <div className="mt-24">
        <AppIconMarquee />
      </div>

      <div className="mx-auto max-w-6xl px-6">
        <div className="mt-12 flex flex-col items-center gap-3">
          <Link
            href="/editor"
            className="inline-flex h-11 items-center gap-2 rounded-full bg-white px-6 text-[14.5px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Write your own chat story
          </Link>
          <p className="text-center text-[12px] text-zinc-500">
            Script it, style it, and export a vertical video for TikTok, Reels and Shorts.
          </p>
        </div>
      </div>
    </section>
  );
}
