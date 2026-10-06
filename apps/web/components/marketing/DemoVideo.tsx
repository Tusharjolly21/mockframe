"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { Pause, Play } from "lucide-react";

/**
 * The homepage product demo: a real screen recording of the editor (cursor,
 * auto-zoom, end card) in public/demo. Autoplays muted and loops only while on
 * screen; reduced-motion visitors get the poster and a play button.
 */
export function DemoVideo({ src, poster }: { src: string; poster: string }) {
  const reduce = useReducedMotion();
  const wrap = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);

  // tilt flat as the frame scrolls into view (Linear-style reveal)
  const { scrollYProgress } = useScroll({ target: wrap, offset: ["start end", "center center"] });
  const rotateX = useTransform(scrollYProgress, [0, 1], [reduce ? 0 : 14, 0]);
  const scale = useTransform(scrollYProgress, [0, 1], [reduce ? 1 : 0.94, 1]);

  useEffect(() => {
    const el = video.current;
    if (!el || reduce) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) el.play().catch(() => {});
        else el.pause();
      },
      { threshold: 0.25 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [reduce]);

  const toggle = () => {
    const el = video.current;
    if (!el) return;
    if (el.paused) el.play().catch(() => {});
    else el.pause();
  };

  return (
    <div ref={wrap} className="relative mx-auto w-full max-w-[1120px] [perspective:1600px]">
      {/* soft light pooling under the frame */}
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-20 -bottom-24 top-1/3 -z-10 blur-3xl"
        style={{ background: "radial-gradient(60% 60% at 50% 40%, rgba(124,58,237,0.35), transparent 70%)" }}
      />
      <motion.div
        style={{ rotateX, scale, transformOrigin: "50% 100%" }}
        className="group relative rounded-[22px] p-px"
      >
        {/* hairline gradient rim */}
        <div
          aria-hidden
          className="absolute inset-0 rounded-[22px]"
          style={{ background: "linear-gradient(180deg, rgba(255,255,255,0.22), rgba(255,255,255,0.04) 40%, rgba(124,58,237,0.35))" }}
        />
        <div className="relative overflow-hidden rounded-[21px] bg-[#0c0c10] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.8)]">
          <video
            ref={video}
            className="block aspect-[16/10] w-full"
            src={src}
            poster={poster}
            muted
            loop
            playsInline
            preload="metadata"
            aria-label="Screen recording of the MockFrame editor: a screenshot is dropped into an iPhone, styled, and exported"
            onPlay={() => setPlaying(true)}
            onPause={() => setPlaying(false)}
          />
          <button
            type="button"
            onClick={toggle}
            aria-label={playing ? "Pause demo" : "Play demo"}
            className={`absolute bottom-4 right-4 grid h-10 w-10 place-items-center rounded-full border border-white/15 bg-black/50 text-white backdrop-blur-md transition-opacity hover:bg-black/70 ${
              playing ? "opacity-0 group-hover:opacity-100 focus-visible:opacity-100" : "opacity-100"
            }`}
          >
            {playing ? <Pause size={16} /> : <Play size={16} className="translate-x-px" />}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
