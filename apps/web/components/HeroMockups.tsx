import { Heart, Pause, Play, Search, SkipBack, SkipForward, Wifi } from "lucide-react";

/**
 * Premium hero mockups — real-looking devices with fake-but-believable UI
 * rendered in pure HTML/CSS (no heavy renderer, fully static/SSG). A MacBook
 * showing a Chrome window with a landing page, an iPhone showing a music app,
 * and an Apple Watch with an activity face, arranged in a floating cluster.
 */
export function HeroMockups() {
  return (
    <div className="relative mx-auto aspect-[4/3] w-full max-w-[560px]">
      {/* ambient glow */}
      <div
        className="absolute -inset-10 -z-10 blur-2xl"
        style={{
          background:
            "radial-gradient(46% 46% at 64% 34%, rgba(124,58,237,0.28), transparent 70%), radial-gradient(42% 42% at 22% 78%, rgba(6,182,212,0.24), transparent 72%)",
        }}
      />
      <div className="absolute left-0 top-[3%] w-[88%]">
        <LaptopMock />
      </div>
      <div className="absolute -right-1 bottom-[-2%] w-[25%] drop-shadow-[0_30px_45px_rgba(15,15,30,0.35)]">
        <PhoneMock />
      </div>
      <div className="absolute bottom-[3%] left-[3%] w-[15.5%] drop-shadow-[0_20px_35px_rgba(15,15,30,0.4)]">
        <WatchMock />
      </div>
    </div>
  );
}

/* --------------------------------- laptop --------------------------------- */

function LaptopMock() {
  return (
    <div className="w-full">
      {/* lid + screen */}
      <div className="rounded-[14px] bg-[#101014] p-[7px] shadow-[0_28px_60px_rgba(15,15,30,0.34)]">
        <div className="overflow-hidden rounded-[7px] bg-white">
          {/* chrome toolbar */}
          <div className="flex items-center gap-2 bg-[#e9eaed] px-2.5 py-1.5">
            <span className="flex gap-1">
              <i className="h-[7px] w-[7px] rounded-full bg-[#ff5f57]" />
              <i className="h-[7px] w-[7px] rounded-full bg-[#febc2e]" />
              <i className="h-[7px] w-[7px] rounded-full bg-[#28c840]" />
            </span>
            <div className="ml-1.5 flex flex-1 items-center gap-1.5 rounded-md bg-white px-2 py-[3px] shadow-sm">
              <Search size={8} className="text-[#9a9aa4]" />
              <span className="text-[8px] font-medium text-[#6b6b76]">mockframe.app</span>
            </div>
          </div>
          {/* website */}
          <div className="bg-white">
            {/* nav */}
            <div className="flex items-center justify-between px-4 py-2.5">
              <div className="flex items-center gap-1.5">
                <span className="h-3 w-3 rounded-[4px] bg-gradient-to-br from-violet-600 to-cyan-500" />
                <span className="text-[8.5px] font-bold text-[#17171c]">Northwind</span>
              </div>
              <div className="flex items-center gap-2.5 text-[7.5px] font-semibold text-[#8a8a94]">
                <span>Product</span>
                <span>Pricing</span>
                <span className="rounded-full bg-[#17171c] px-2 py-[3px] text-white">Sign up</span>
              </div>
            </div>
            {/* hero */}
            <div className="grid grid-cols-[1.1fr_1fr] items-center gap-3 px-4 pb-4 pt-1">
              <div>
                <div className="text-[15px] font-extrabold leading-[1.1] tracking-tight text-[#17171c]">
                  Analytics that feel effortless.
                </div>
                <div className="mt-1.5 text-[8px] leading-relaxed text-[#8a8a94]">
                  Ship faster with one dashboard for every metric that matters.
                </div>
                <div className="mt-2.5 flex gap-1.5">
                  <span className="rounded-md bg-gradient-to-r from-violet-600 to-cyan-500 px-2.5 py-1 text-[7.5px] font-semibold text-white">
                    Start free
                  </span>
                  <span className="rounded-md border border-black/10 px-2.5 py-1 text-[7.5px] font-semibold text-[#6b6b76]">
                    Live demo
                  </span>
                </div>
              </div>
              {/* mini chart card */}
              <div className="rounded-xl bg-gradient-to-br from-[#f6f4ff] to-[#eef7fb] p-2.5 shadow-[0_6px_18px_rgba(20,20,45,0.08)]">
                <div className="flex items-center justify-between">
                  <span className="text-[7px] font-semibold text-[#8a8a94]">Revenue</span>
                  <span className="text-[7px] font-bold text-emerald-500">+24%</span>
                </div>
                <div className="mt-0.5 text-[13px] font-extrabold tracking-tight text-[#17171c]">$48.2k</div>
                <svg viewBox="0 0 100 34" className="mt-1 w-full" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="ar" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0" stopColor="#7c3aed" stopOpacity="0.35" />
                      <stop offset="1" stopColor="#7c3aed" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <path d="M0 26 L16 22 L32 25 L48 14 L64 17 L80 7 L100 4 L100 34 L0 34 Z" fill="url(#ar)" />
                  <path
                    d="M0 26 L16 22 L32 25 L48 14 L64 17 L80 7 L100 4"
                    fill="none"
                    stroke="#7c3aed"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
                <div className="mt-1.5 flex gap-1">
                  <span className="h-1 flex-1 rounded-full bg-violet-500/70" />
                  <span className="h-1 flex-1 rounded-full bg-cyan-400/70" />
                  <span className="h-1 flex-1 rounded-full bg-black/10" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* base */}
      <div className="relative mx-auto h-[9px] w-[112%] -translate-x-[5.4%] rounded-b-[10px] bg-gradient-to-b from-[#d7dae1] to-[#a9adb7]">
        <span className="absolute left-1/2 top-0 h-[4px] w-[22%] -translate-x-1/2 rounded-b-[6px] bg-[#8f939d]" />
      </div>
    </div>
  );
}

/* --------------------------------- phone ---------------------------------- */

function PhoneMock() {
  return (
    <div className="rounded-[1.9rem] bg-[#0c0c10] p-[4px] shadow-[0_10px_30px_rgba(15,15,30,0.35)]">
      <div className="relative overflow-hidden rounded-[1.6rem] bg-gradient-to-b from-[#241238] via-[#160e28] to-[#0a0a15]">
        {/* dynamic island */}
        <span className="absolute left-1/2 top-[6px] z-10 h-[10px] w-[34%] -translate-x-1/2 rounded-full bg-black" />
        {/* status bar */}
        <div className="flex items-center justify-between px-3.5 pt-[7px] text-[6.5px] font-semibold text-white/80">
          <span>9:41</span>
          <Wifi size={7} className="text-white/70" />
        </div>
        {/* now playing */}
        <div className="px-3.5 pb-4 pt-4">
          <div className="text-center text-[6.5px] font-semibold uppercase tracking-wider text-white/50">Now Playing</div>
          <div
            className="mt-2 aspect-square w-full rounded-[14px] shadow-[0_12px_24px_rgba(0,0,0,0.35)]"
            style={{ background: "linear-gradient(135deg, #f472b6 0%, #a855f7 45%, #22d3ee 100%)" }}
          />
          <div className="mt-2.5 flex items-start justify-between">
            <div className="min-w-0">
              <div className="truncate text-[9px] font-bold text-white">Midnight City</div>
              <div className="truncate text-[7px] text-white/50">M83</div>
            </div>
            <Heart size={9} className="mt-0.5 shrink-0 fill-pink-500 text-pink-500" />
          </div>
          {/* progress */}
          <div className="mt-2.5 h-[3px] w-full rounded-full bg-white/15">
            <div className="h-full w-[38%] rounded-full bg-white" />
          </div>
          <div className="mt-1 flex justify-between text-[5.5px] text-white/40">
            <span>1:34</span>
            <span>4:03</span>
          </div>
          {/* controls */}
          <div className="mt-2.5 flex items-center justify-center gap-4 text-white">
            <SkipBack size={10} className="fill-white" />
            <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[#160e28]">
              <Play size={11} className="translate-x-[0.5px] fill-[#160e28]" />
            </span>
            <SkipForward size={10} className="fill-white" />
          </div>
        </div>
      </div>
    </div>
  );
}

/* --------------------------------- watch ---------------------------------- */

function WatchMock() {
  return (
    <div className="relative">
      {/* band */}
      <div className="absolute left-1/2 top-[-26%] h-[40%] w-[54%] -translate-x-1/2 rounded-t-[6px] bg-gradient-to-b from-[#3a3a42] to-[#26262c]" />
      <div className="absolute bottom-[-26%] left-1/2 h-[40%] w-[54%] -translate-x-1/2 rounded-b-[6px] bg-gradient-to-t from-[#3a3a42] to-[#26262c]" />
      {/* case */}
      <div className="relative rounded-[26%] bg-[#0c0c10] p-[9%] shadow-[0_8px_20px_rgba(0,0,0,0.4)]">
        <div className="aspect-square overflow-hidden rounded-[22%] bg-black p-[10%]">
          <div className="flex items-center justify-between text-[5px] font-bold">
            <span className="text-[#8b5cf6]">9:41</span>
            <Pause size={4} className="text-white/40" />
          </div>
          {/* activity rings */}
          <div className="relative mx-auto mt-[6%] aspect-square w-[76%]">
            <div className="absolute inset-0 rounded-full border-[3px] border-[#fb2c6b]/25" />
            <div className="absolute inset-0 rounded-full border-[3px] border-transparent border-t-[#fb2c6b] border-r-[#fb2c6b]" />
            <div className="absolute inset-[22%] rounded-full border-[3px] border-[#a3e635]/25" />
            <div className="absolute inset-[22%] rounded-full border-[3px] border-transparent border-t-[#a3e635] border-l-[#a3e635]" />
            <div className="absolute inset-[44%] rounded-full border-[3px] border-[#22d3ee]/25" />
            <div className="absolute inset-[44%] rounded-full border-[3px] border-transparent border-t-[#22d3ee]" />
          </div>
        </div>
      </div>
    </div>
  );
}
