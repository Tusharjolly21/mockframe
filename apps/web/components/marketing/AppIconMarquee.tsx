"use client";

import Link from "next/link";
import { useEffect, useRef, type ComponentType } from "react";
import {
  SiDiscord,
  SiGooglemessages,
  SiImessage,
  SiInstagram,
  SiLine,
  SiMessenger,
  SiSignal,
  SiSnapchat,
  SiTelegram,
  SiTinder,
  SiWechat,
  SiWhatsapp,
} from "@icons-pack/react-simple-icons";

/**
 * The chat apps the studio can draw, as home-screen icons drifting through a
 * dock. Icons swell as they pass the middle (or under the pointer, which also
 * eases the drift to a stop) and each one opens that app in the editor.
 */

type DockApp = {
  label: string;
  /** /editor?screen=<app> */
  screen: string;
  Icon: ComponentType<{
    color?: string;
    className?: string;
    style?: React.CSSProperties;
  }>;
  tile: string;
  glyph: string;
  /** the colour the light under the dock takes while this app is in focus */
  glow: string;
  /** Snapchat's ghost is white with a black outline */
  outline?: boolean;
};

// Ordered so neighbours never share a colour, including across the wrap.
const APPS: DockApp[] = [
  {
    label: "WhatsApp",
    screen: "whatsapp",
    Icon: SiWhatsapp,
    tile: "linear-gradient(180deg,#5df57d,#1dbd5a)",
    glyph: "#fff",
    glow: "#25d366",
  },
  {
    label: "Instagram",
    screen: "instagram",
    Icon: SiInstagram,
    tile: "radial-gradient(circle at 28% 108%,#ffd776 0%,#f9a43d 14%,#f2513e 36%,#d62d81 58%,#8a3ac9 80%,#4f5bd5 100%)",
    glyph: "#fff",
    glow: "#e1306c",
  },
  {
    label: "Telegram",
    screen: "telegram",
    Icon: SiTelegram,
    tile: "linear-gradient(180deg,#3cbdfd,#1d95d3)",
    glyph: "#fff",
    glow: "#229ed9",
  },
  {
    label: "Snapchat",
    screen: "snapchat",
    Icon: SiSnapchat,
    tile: "#fffc00",
    glyph: "#fff",
    glow: "#e8e400",
    outline: true,
  },
  {
    label: "iMessage",
    screen: "imessage",
    Icon: SiImessage,
    tile: "linear-gradient(180deg,#6ef685,#12c133)",
    glyph: "#fff",
    glow: "#34c759",
  },
  {
    label: "Discord",
    screen: "discord",
    Icon: SiDiscord,
    tile: "#5865f2",
    glyph: "#fff",
    glow: "#5865f2",
  },
  {
    label: "Tinder",
    screen: "dating",
    Icon: SiTinder,
    tile: "linear-gradient(200deg,#ff7a52,#fd2677)",
    glyph: "#fff",
    glow: "#fe3c72",
  },
  {
    label: "Signal",
    screen: "signal",
    Icon: SiSignal,
    tile: "#3a76f0",
    glyph: "#fff",
    glow: "#3a76f0",
  },
  {
    label: "LINE",
    screen: "line",
    Icon: SiLine,
    tile: "#06c755",
    glyph: "#fff",
    glow: "#06c755",
  },
  {
    label: "Messenger",
    screen: "messenger",
    Icon: SiMessenger,
    tile: "linear-gradient(225deg,#ff6b66,#a334fa 48%,#0695ff)",
    glyph: "#fff",
    glow: "#a334fa",
  },
  {
    label: "WeChat",
    screen: "wechat",
    Icon: SiWechat,
    tile: "#07c160",
    glyph: "#fff",
    glow: "#07c160",
  },
  {
    label: "Google Messages",
    screen: "gmessages",
    Icon: SiGooglemessages,
    tile: "#fff",
    glyph: "#1a73e8",
    glow: "#4285f4",
  },
];

// Four identical sets cover a 2560 px wide window plus one set of travel.
const COPIES = 4;
const SPEED = 32; // px per second
const SWELL = 0.55; // extra scale at the centre of the lens
// icons stand on a dark floor and catch a faint reflection (Chromium and Safari)
const REFLECTION = "below 5px linear-gradient(transparent 55%, rgba(0,0,0,0.16))";

export function AppIconMarquee() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const wrap = wrapRef.current;
    const track = trackRef.current;
    const glow = glowRef.current;
    const label = labelRef.current;
    if (!wrap || !track || !glow || !label) return;
    const tiles = Array.from(track.children) as HTMLElement[];
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    let size = 0;
    let pitch = 0;
    let setW = 0;
    let width = 0;
    let base: number[] = [];
    const measure = () => {
      // offsetLeft ignores transforms, so this reads the resting layout
      size = tiles[0].offsetWidth;
      pitch = tiles[1].offsetLeft - tiles[0].offsetLeft;
      setW = pitch * APPS.length;
      width = wrap.clientWidth;
      base = tiles.map((t) => t.offsetLeft + size / 2);
    };
    measure();

    // start with the first app resting in the middle
    let offset = (((base[0] - width / 2) % setW) + setW) % setW;
    let velocity = reduce ? 0 : SPEED;
    let lens = width / 2;
    let hover = false;
    let pointerX = 0;
    let focused = -1;
    let last = 0;
    let raf = 0;

    const n = tiles.length;
    const extra = new Float64Array(n);
    const scale = new Float64Array(n);

    const draw = (dt: number) => {
      const target = hover || reduce ? 0 : SPEED;
      velocity += (target - velocity) * Math.min(1, dt * 3.5);
      if (Math.abs(velocity - target) < 0.2) velocity = target;
      offset = (offset + velocity * dt) % setW;
      lens += ((hover ? pointerX : width / 2) - lens) * (dt ? Math.min(1, dt * 9) : 1);

      // Swell each icon by its distance from the lens, then push neighbours
      // apart by half of every swell on either side so the gaps stay even.
      const sigma = pitch * 1.35;
      let total = 0;
      for (let i = 0; i < n; i++) {
        const d = base[i] - offset - lens;
        const s = 1 + SWELL * Math.exp(-(d * d) / (sigma * sigma));
        scale[i] = s;
        extra[i] = size * (s - 1);
        total += extra[i];
      }
      let before = 0;
      let best = 0;
      let bestD = Infinity;
      let bestX = 0;
      for (let i = 0; i < n; i++) {
        const shift = 0.5 * (before - (total - before - extra[i]));
        before += extra[i];
        tiles[i].style.transform = `translate3d(${shift.toFixed(2)}px,0,0) scale(${scale[i].toFixed(4)})`;
        const x = base[i] - offset + shift;
        const d = Math.abs(x - lens);
        if (d < bestD) {
          bestD = d;
          best = i;
          bestX = x;
        }
      }
      track.style.transform = `translate3d(${(-offset).toFixed(2)}px,0,0)`;

      const app = APPS[best % APPS.length];
      if (best % APPS.length !== focused) {
        focused = best % APPS.length;
        label.textContent = app.label;
        glow.style.backgroundColor = app.glow;
      }
      // full strength while one icon clearly owns the lens, crossfading only
      // in the last stretch before its neighbour takes over
      const near = Math.min(1, bestD / ((pitch + extra[best]) / 2));
      const fade = Math.min(1, Math.max(0, (near - 0.65) / 0.35));
      label.style.opacity = String(1 - fade * fade * (3 - 2 * fade));
      label.style.transform = `translate3d(${bestX.toFixed(1)}px,0,0) translateX(-50%)`;
      glow.style.transform = `translate3d(${lens.toFixed(1)}px,0,0) translateX(-50%)`;
    };

    const tick = (t: number) => {
      const dt = last ? Math.min(0.05, (t - last) / 1000) : 0;
      last = t;
      draw(dt);
      raf = requestAnimationFrame(tick);
    };
    const start = () => {
      if (raf) return;
      last = 0;
      raf = requestAnimationFrame(tick);
    };
    const stop = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    draw(0);

    const io = new IntersectionObserver(([e]) => (e.isIntersecting ? start() : stop()));
    io.observe(wrap);
    const ro = new ResizeObserver(() => {
      measure();
      draw(0);
    });
    ro.observe(wrap);

    const onEnter = (e: PointerEvent) => {
      if (e.pointerType === "mouse") hover = true;
    };
    const onMove = (e: PointerEvent) => {
      if (e.pointerType !== "mouse") return;
      hover = true;
      pointerX = e.clientX - wrap.getBoundingClientRect().left;
    };
    const onLeave = () => {
      hover = false;
    };
    wrap.addEventListener("pointerenter", onEnter);
    wrap.addEventListener("pointermove", onMove);
    wrap.addEventListener("pointerleave", onLeave);

    return () => {
      stop();
      io.disconnect();
      ro.disconnect();
      wrap.removeEventListener("pointerenter", onEnter);
      wrap.removeEventListener("pointermove", onMove);
      wrap.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div>
      <p className="mx-auto max-w-md px-6 text-center text-[15px] leading-relaxed text-zinc-400">
        Pick an app to start your story in it. Slack, Teams, Bumble and Hinge are in the editor too.
      </p>
      <ul className="sr-only">
        {APPS.map((a) => (
          <li key={a.label}>{a.label}</li>
        ))}
      </ul>

      <div className="relative mt-6 sm:mt-8">
        {/* light pooling under the icon in focus, tinted with its brand colour;
            outside the clipped dock so its blur can fade out on its own */}
        <div
          ref={glowRef}
          aria-hidden
          className="pointer-events-none absolute bottom-[24px] left-0 h-14 w-40 rounded-full opacity-35 blur-[28px] transition-[background-color] duration-700 sm:bottom-[30px] sm:h-16 sm:w-56 sm:blur-[34px]"
        />
        <div
          ref={wrapRef}
          aria-hidden
          className="relative h-[150px] overflow-hidden [mask-image:linear-gradient(90deg,transparent,#000_16%,#000_84%,transparent)] sm:h-[186px]"
        >
          <div
            ref={trackRef}
            className="absolute bottom-[62px] left-0 flex items-end will-change-transform sm:bottom-[74px]"
          >
            {Array.from({ length: COPIES }, (_, copy) =>
              APPS.map((app) => (
                <Link
                  key={`${copy}-${app.label}`}
                  href={`/editor?screen=${app.screen}`}
                  tabIndex={-1}
                  title={`Open ${app.label} in the editor`}
                  className="mr-[17px] flex h-12 w-12 shrink-0 origin-bottom items-center justify-center rounded-[23%] shadow-[inset_0_1px_0_rgba(255,255,255,0.3),inset_0_-1px_0_rgba(0,0,0,0.1),0_0_0_0.5px_rgba(255,255,255,0.08),0_12px_22px_-12px_rgba(0,0,0,0.9)] will-change-transform sm:mr-[22px] sm:h-[60px] sm:w-[60px]"
                  style={{ background: app.tile, WebkitBoxReflect: REFLECTION }}
                >
                  <app.Icon
                    color={app.glyph}
                    className="h-[54%] w-[54%]"
                    style={
                      app.outline
                        ? {
                            stroke: "#111",
                            strokeWidth: 1.7,
                            paintOrder: "stroke",
                          }
                        : undefined
                    }
                  />
                </Link>
              )),
            )}
          </div>
          <span
            ref={labelRef}
            className="pointer-events-none absolute bottom-[6px] left-0 whitespace-nowrap text-[13px] font-medium tracking-[-0.01em] text-white sm:bottom-[8px] sm:text-[14px]"
          />
        </div>
      </div>
    </div>
  );
}
