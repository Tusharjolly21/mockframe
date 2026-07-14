import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getDevice, listDevices } from "@framekit/devices";
import { ChatStoriesSection } from "@/components/marketing/ChatStoriesSection";
import { HeroSection } from "@/components/marketing/HeroSection";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Reveal, RevealGroup, RevealItem } from "@/components/marketing/Reveal";
import { SolarIcon } from "@/components/marketing/SolarIcon";
import { SITE_NAME, SITE_URL, baseDeviceName } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "MockFrame — Free Screenshot Mockup Studio" },
  description:
    "Drop your screenshot into a photoreal iPhone, MacBook, iPad or Apple Watch, style the scene, and export a production-ready image. Start free, online, with no sign-up wall.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "MockFrame — Free Screenshot Mockup Studio",
    description:
      "Turn any screenshot into a stunning device mockup in seconds. 63 pixel-accurate frames, photoreal scenes, one-click export.",
    url: "/",
    type: "website",
    siteName: SITE_NAME,
  },
};

/** Photoreal library cards — pre-rendered scene devices, each linking to its pSEO page. */
const LIBRARY: { id: string; img: string; label?: string }[] = [
  { id: "iphone-16-pro-psd-black-2", img: "/hero/hero-iphone.webp", label: "iPhone 16 Pro · Black Titanium" },
  { id: "iphone-16-pro-psd-desert-2", img: "/hero/lib-iphone-desert.webp", label: "iPhone 16 Pro · Desert Titanium" },
  { id: "samsung-s24-ultra-psd-gray", img: "/hero/lib-samsung.webp", label: "Galaxy S24 Ultra" },
  { id: "apple-watch-ultra-psd-midnight-3", img: "/hero/lib-watch.webp", label: "Apple Watch Ultra" },
  { id: "ipad-pro-2024-psd-space-black-1", img: "/hero/lib-ipad.webp", label: "iPad Pro · Space Black" },
  { id: "ipad-pro-2024-psd-silver-2", img: "/hero/lib-ipad-flat.webp", label: "iPad Pro · Silver" },
  { id: "macbook-pro-16-mockup", img: "/hero/lib-macbook.webp", label: "MacBook Pro 16″" },
  { id: "apple-watch-ultra-psd-midnight-1", img: "/hero/lib-watch-front.webp", label: "Apple Watch Ultra · Front" },
];

const FEATURE_TILES = [
  {
    icon: "monitor-smartphone-bold-duotone",
    title: "63 pixel-accurate frames",
    body: "Every iPhone, iPad, MacBook, Apple Watch, Galaxy and Pixel — at its true screen resolution, so nothing stretches.",
  },
  {
    icon: "magic-stick-3-bold-duotone",
    title: "Style engine",
    body: "Mesh gradients, adaptive shadows, 3D tilt and perspective. Make it match your brand in two clicks.",
  },
  {
    icon: "download-minimalistic-bold-duotone",
    title: "One-click export",
    body: "Crisp, high-resolution PNGs sized for the App Store, X, Dribbble, or your landing page.",
  },
  {
    icon: "crown-bold-duotone",
    title: "Start free",
    body: "No sign-up wall and no install. Open the editor, build your first mockup, and upgrade only when you need Pro exports.",
  },
];

export default function HomePage() {
  const devices = listDevices();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    description:
      "Free online screenshot mockup studio. Place screenshots in photoreal device frames, style the scene, and export production-quality images.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingNav />

      {/* ============================ HERO ============================ */}
      <HeroSection devicesCount={devices.length} />

      {/* ===================== CHAT STORIES (live, self-playing) ================= */}
      <ChatStoriesSection />

      {/* ============================ FEATURES (bento) ============================ */}
      <section className="relative border-t border-white/[0.06] py-28">
        <SectionSheen />
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-violet-500" />
              <span className="text-[13.5px] text-zinc-400">Everything you need</span>
            </div>
            <h2 className="mt-4 max-w-2xl text-[30px] font-medium leading-[1.1] tracking-[-0.025em] sm:text-[44px]">
              Made for people who ship screenshots.
            </h2>
          </Reveal>

          {/* bento: two feature panels with real product visuals */}
          <RevealGroup className="mt-12 grid gap-4 lg:grid-cols-5">
            <RevealItem className="lg:col-span-3">
              <div className="relative h-full overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-7 transition-colors hover:border-white/15">
                <div className="max-w-[58%]">
                  <IconChip name="smartphone-bold-duotone" />
                  <h3 className="mt-5 text-[19px] font-semibold">Photoreal device mockups</h3>
                  <p className="mt-2 text-[14px] leading-relaxed text-zinc-400">
                    Not flat vectors — real photographed devices. Your screenshot is perspective-warped onto the display
                    of a leaning iPhone, an angled iPad, or a MacBook on a desk.
                  </p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/hero/lib-iphone-desert.webp"
                  alt="Photoreal Desert Titanium iPhone with an Instagram screenshot"
                  className="absolute -right-4 top-6 w-[38%] max-w-[240px] rotate-[8deg] drop-shadow-[0_30px_50px_rgba(0,0,0,0.55)]"
                />
              </div>
            </RevealItem>

            <RevealItem className="lg:col-span-2">
              <div className="relative h-full overflow-hidden rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-7 transition-colors hover:border-white/15">
                <IconChip name="chat-round-line-bold-duotone" />
                <h3 className="mt-5 text-[19px] font-semibold">Fake screen studio</h3>
                <p className="mt-2 text-[14px] leading-relaxed text-zinc-400">
                  No screenshot yet? Generate believable app screens in one click and drop them straight into any device.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  {["WhatsApp", "Instagram", "iMessage", "YouTube", "Slack", "Telegram", "TikTok", "Discord", "+12 more"].map(
                    (a) => (
                      <span
                        key={a}
                        className="rounded-full border border-white/[0.08] bg-white/[0.03] px-2.5 py-1 text-[12px] font-medium text-zinc-300"
                      >
                        {a}
                      </span>
                    )
                  )}
                </div>
              </div>
            </RevealItem>
          </RevealGroup>

          <RevealGroup className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURE_TILES.map((f) => (
              <RevealItem key={f.title}>
                <div className="h-full rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-6 transition-colors hover:border-white/15">
                  <IconChip name={f.icon} />
                  <h3 className="mt-4 text-[15.5px] font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-400">{f.body}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ============================ DEVICE LIBRARY (photoreal) ============================ */}
      <section className="relative border-t border-white/[0.06] py-28">
        <SectionSheen />
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-cyan-400" />
              <span className="text-[13.5px] text-zinc-400">The device library</span>
            </div>
            <div className="mt-4 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
              <h2 className="max-w-xl text-[30px] font-medium leading-[1.1] tracking-[-0.025em] sm:text-[44px]">
                Every screen your product lives on.
              </h2>
              <Link
                href="/mockups"
                className="inline-flex items-center gap-1.5 text-[14px] font-medium text-zinc-400 transition-colors hover:text-white"
              >
                See all {devices.length}
                <span aria-hidden>→</span>
              </Link>
            </div>
          </Reveal>

          <RevealGroup className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {LIBRARY.map((item) => {
              const device = getDevice(item.id);
              if (!device) return null;
              return (
                <RevealItem key={item.id}>
                  <Link
                    href={`/mockups/${item.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.02] transition-colors hover:border-white/20"
                  >
                    <div
                      className="flex h-52 items-center justify-center overflow-hidden p-5"
                      style={{ background: "radial-gradient(120% 90% at 50% 0%, rgba(124,58,237,0.1), transparent 70%)" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.img}
                        alt={`${item.label ?? baseDeviceName(device)} photoreal mockup`}
                        className="max-h-full w-auto max-w-[86%] object-contain transition-transform duration-300 group-hover:scale-[1.04]"
                      />
                    </div>
                    <div className="flex items-center justify-between border-t border-white/[0.06] p-3.5">
                      <div className="min-w-0">
                        <div className="truncate text-[13.5px] font-semibold text-white">
                          {item.label ?? baseDeviceName(device)}
                        </div>
                        <div className="text-[11.5px] text-zinc-500">
                          {device.screen.width} × {device.screen.height}
                        </div>
                      </div>
                      <ArrowUpRight size={15} className="shrink-0 text-zinc-600 transition-colors group-hover:text-white" />
                    </div>
                  </Link>
                </RevealItem>
              );
            })}
          </RevealGroup>
        </div>
      </section>

      {/* ============================ HOW IT WORKS ============================ */}
      <section className="relative border-t border-white/[0.06] py-28">
        <SectionSheen />
        <div className="mx-auto max-w-6xl px-6">
          <Reveal>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-orange-400" />
              <span className="text-[13.5px] text-zinc-400">Three steps</span>
            </div>
            <h2 className="mt-4 max-w-xl text-[30px] font-medium leading-[1.1] tracking-[-0.025em] sm:text-[44px]">
              From screenshot to share-ready in under a minute.
            </h2>
          </Reveal>
          <RevealGroup className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { n: "01", icon: "gallery-wide-bold-duotone", t: "Add your screenshot", d: "Upload, paste, or drag it in — it snaps into the device display at native resolution." },
              { n: "02", icon: "magic-stick-3-bold-duotone", t: "Style the scene", d: "Pick a background, add a shadow, tilt the device, arrange your layout." },
              { n: "03", icon: "download-minimalistic-bold-duotone", t: "Export", d: "Download a high-resolution PNG ready for anywhere you need it." },
            ].map((s) => (
              <RevealItem key={s.n}>
                <div className="h-full rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-6">
                  <div className="flex items-center justify-between">
                    <IconChip name={s.icon} />
                    <span className="text-[13px] font-semibold text-zinc-600">{s.n}</span>
                  </div>
                  <h3 className="mt-4 text-[16px] font-semibold">{s.t}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-400">{s.d}</p>
                </div>
              </RevealItem>
            ))}
          </RevealGroup>
        </div>
      </section>

      {/* ============================ CTA ============================ */}
      <section className="relative overflow-hidden border-t border-white/[0.06] py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 h-[400px] w-[900px] -translate-x-1/2 -translate-y-1/2"
          style={{ background: "radial-gradient(ellipse at center, rgba(124,58,237,0.18), transparent 70%)" }}
        />
        <Reveal className="relative z-10 mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-[32px] font-medium leading-[1.08] tracking-[-0.025em] sm:text-[46px]">
            Ready to make your mockup?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15.5px] leading-relaxed text-zinc-400">
            Open the editor and turn your screenshot into a share-ready image in under a minute. No sign-up required.
          </p>
          <Link
            href="/editor"
            className="group mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-[15px] font-semibold text-zinc-900 shadow-[0_8px_30px_rgba(255,255,255,0.1)] transition-colors hover:bg-zinc-100"
          >
            Start creating — free
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </Reveal>
      </section>

      <MarketingFooter />
    </main>
  );
}

/* ------------------------------ small helpers ------------------------------ */

function IconChip({ name }: { name: string }) {
  return (
    <span className="inline-grid h-11 w-11 place-items-center rounded-xl border border-white/[0.08] bg-white/[0.04] text-violet-300">
      <SolarIcon name={name} size={23} />
    </span>
  );
}

/** Faint top-lit gradient that separates each dark section (Linear signature). */
function SectionSheen() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-x-0 top-0 h-1/4"
      style={{ background: "linear-gradient(to bottom, rgba(255,255,255,0.04), transparent)" }}
    />
  );
}
