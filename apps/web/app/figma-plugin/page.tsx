import type { Metadata } from "next";
import { ArrowRight, Clock, Smartphone, Store } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { DownloadPlugin } from "@/components/marketing/figma/DownloadPlugin";
import { socialMeta } from "@/lib/site";

const TITLE = "Figma Mockup Plugin: send frames to device mockups and App Store sets";
const DESCRIPTION =
  "The MockFrame Figma plugin sends the frames you select into realistic device mockups, or a full App Store or Google Play screenshot set, in one click.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/figma-plugin" },
  ...socialMeta({ path: "/figma-plugin", title: "MockFrame for Figma", description: DESCRIPTION }),
};

const FRAMES = [1, 2, 3].map((n) => `/store-sets/stride/ios-0${n}.webp`);
const RESULT = [1, 2, 3, 4].map((n) => `/store-sets/previews/stride-ios-${n}.webp`);

/** A still of the plugin panel next to what it opens: frames in, store shots out. */
function PluginStill() {
  return (
    <div aria-hidden className="relative grid items-center gap-6 sm:grid-cols-[minmax(0,260px)_auto_minmax(0,1fr)]">
      <div className="rounded-xl border border-black/10 bg-white text-[#1e1e1e] shadow-[0_30px_60px_rgba(0,0,0,.45)]">
        <div className="border-b border-[#e6e6e6] px-4 pb-2.5 pt-3.5">
          <p className="text-[12.5px] font-semibold">Send to Mockframe</p>
          <p className="text-[11px] text-[#6b6b6b]">Put frames in a device, or turn them into a store listing set.</p>
        </div>
        <div className="grid grid-cols-3 gap-2.5 px-4 py-3">
          {FRAMES.map((src, i) => (
            <div key={src} className="min-w-0">
              <div className="grid h-[86px] place-items-center overflow-hidden rounded-md border border-[#e6e6e6] bg-[#f5f5f5]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="max-h-full" />
              </div>
              <p className="mt-1 truncate text-[11px] font-medium">Run {i + 1}</p>
              <p className="text-[10px] tabular-nums text-[#6b6b6b]">402 × 874</p>
            </div>
          ))}
        </div>
        <div className="grid gap-2.5 border-t border-[#e6e6e6] px-4 py-3">
          <div className="flex rounded-md bg-[#f5f5f5] p-0.5 text-[11px]">
            <span className="flex-1 rounded px-2 py-1 text-center text-[#6b6b6b]">In devices</span>
            <span className="flex-1 rounded bg-white px-2 py-1 text-center font-semibold shadow-[0_0_0_1px_#e6e6e6]">Store set</span>
          </div>
          <span className="rounded-md bg-[#6d4aff] py-2 text-center text-[11.5px] font-semibold text-white">Send 3 frames to Mockframe</span>
        </div>
      </div>
      <ArrowRight className="mx-auto hidden text-zinc-500 sm:block" size={22} />
      <div className="flex gap-2.5 overflow-hidden">
        {RESULT.map((src) => (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={src} src={src} alt="" className="h-[230px] w-auto shrink-0 rounded-[10px] ring-1 ring-white/10" />
        ))}
      </div>
    </div>
  );
}

const STEPS = [
  { title: "Download and unzip", body: "You get a folder called mockframe-figma-plugin with three files in it." },
  { title: "Import it in Figma", body: "In the Figma desktop app, open the main menu, then Plugins, Development, Import plugin from manifest, and pick manifest.json from that folder." },
  { title: "Select frames and send", body: "Select up to 8 frames, run Plugins, Development, Mockframe, and press Send. The editor opens in your browser with them in." },
];

export default function FigmaPluginPage() {
  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />

      <section className="mx-auto max-w-6xl px-6 pb-16 pt-32">
        <div className="max-w-2xl">
          <p className="text-[14px] font-medium text-zinc-400">MockFrame for Figma</p>
          <h1 className="mt-3 text-[40px] font-semibold leading-[1.03] tracking-[-0.035em] sm:text-[58px]">
            Your frames, in a real device, without exporting a thing.
          </h1>
          <p className="mt-5 max-w-xl text-[16px] leading-7 text-zinc-400">
            Select frames in Figma and send them to MockFrame. They open in the device that fits their shape, or as an App Store or Google Play listing set, ready to style and export.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3">
            <DownloadPlugin />
            <a href="#install" className="text-[14px] font-medium text-zinc-300 underline-offset-4 hover:text-white hover:underline">
              How to install it
            </a>
          </div>
        </div>
        <div className="mt-16">
          <PluginStill />
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-6 pb-20 md:grid-cols-2">
        <article className="rounded-2xl border border-white/10 bg-[#101116] p-7">
          <Smartphone size={22} className="text-cyan-300" />
          <h2 className="mt-5 text-[22px] font-semibold tracking-[-0.02em]">In devices</h2>
          <p className="mt-2 text-[14px] leading-6 text-zinc-400">
            Phone frames go in an iPhone, tablet frames in an iPad, desktop frames in a MacBook or browser. Send several and each becomes its own shot, switchable under the canvas and exported together.
          </p>
        </article>
        <article className="rounded-2xl border border-white/10 bg-[#101116] p-7">
          <Store size={22} className="text-cyan-300" />
          <h2 className="mt-5 text-[22px] font-semibold tracking-[-0.02em]">As a store listing set</h2>
          <p className="mt-2 text-[14px] leading-6 text-zinc-400">
            Pick one of four styles and your phone frames fill all eight App Store or Google Play screenshots, captions and all. Change the words, then export the set as one zip.
          </p>
        </article>
      </section>

      <section id="install" className="mx-auto max-w-6xl scroll-mt-24 px-6 pb-24">
        <h2 className="text-[28px] font-semibold tracking-[-0.03em] sm:text-[34px]">Install it in a minute</h2>
        <p className="mt-2 max-w-xl text-[14.5px] leading-6 text-zinc-400">Until the plugin is listed in Figma Community, add it from its files like this.</p>
        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((s, i) => (
            <li key={s.title} className="rounded-2xl border border-white/10 p-6">
              <span className="grid h-8 w-8 place-items-center rounded-full bg-white text-[13px] font-bold text-zinc-950">{i + 1}</span>
              <h3 className="mt-5 text-[16px] font-semibold">{s.title}</h3>
              <p className="mt-1.5 text-[13.5px] leading-6 text-zinc-400">{s.body}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 flex items-start gap-2 text-[13px] leading-6 text-zinc-500">
          <Clock size={15} className="mt-1 shrink-0" />
          Frames you send can be opened in the editor for 24 hours, then the link expires. The plugin reads only the frames you select.
        </p>
      </section>

      <MarketingFooter />
    </main>
  );
}
