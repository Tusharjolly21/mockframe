import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ArrowUpRight, Download, Layers, Smartphone, Sparkles } from "lucide-react";
import { getDevice, listDevices, previewDataUri } from "@framekit/devices";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { SITE_NAME, SITE_URL, cleanDeviceName } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "MockFrame — Free Screenshot Mockup Studio" },
  description:
    "Drop your screenshot into a pixel-perfect iPhone, MacBook, iPad or Apple Watch, style the scene, and export a production-ready image. Free, online, no watermark.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "MockFrame — Free Screenshot Mockup Studio",
    description:
      "Turn any screenshot into a stunning device mockup in seconds. 63 pixel-accurate frames, gorgeous scenes, one-click export.",
    url: "/",
    type: "website",
    siteName: SITE_NAME,
  },
};

const POPULAR = [
  "iphone-16-pro",
  "macbook-pro-16",
  "ipad-pro-13",
  "apple-watch-ultra-2",
  "galaxy-s25-ultra",
  "pixel-9-pro",
  "iphone-17-pro",
  "watch-front",
];

export default function HomePage() {
  const devices = listDevices();
  const popular = POPULAR.map((id) => getDevice(id)).filter((d): d is NonNullable<typeof d> => Boolean(d));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: SITE_NAME,
    url: SITE_URL,
    applicationCategory: "DesignApplication",
    operatingSystem: "Web",
    description:
      "Free online screenshot mockup studio. Place screenshots in pixel-accurate device frames, style the scene, and export production-quality images.",
    offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
  };

  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingNav />

      {/* ============================ HERO ============================ */}
      <section className="relative overflow-hidden">
        {/* brand glow */}
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-0 -z-0 h-[820px] w-[1200px] -translate-x-1/2"
          style={{
            background:
              "radial-gradient(ellipse 50% 50% at 50% 22%, rgba(124,58,237,0.16), transparent 70%), radial-gradient(ellipse 40% 40% at 68% 30%, rgba(6,182,212,0.12), transparent 70%)",
          }}
        />

        <div className="relative z-10 mx-auto flex max-w-4xl flex-col items-center px-6 pt-36 text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12.5px] font-medium text-zinc-300 backdrop-blur">
            <Sparkles size={13} className="text-violet-400" />
            {devices.length} devices · free forever
          </span>
          <h1 className="mt-6 text-[40px] font-medium leading-[1.05] tracking-[-0.03em] text-balance sm:text-[56px]">
            Turn any screenshot into a{" "}
            <span className="bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-transparent">
              stunning mockup.
            </span>
          </h1>
          <p className="mt-6 max-w-xl text-[16px] leading-relaxed text-zinc-400 sm:text-[17px]">
            Drop your screenshot into a pixel-perfect iPhone, MacBook, iPad or Apple Watch, style the scene, and export a
            production-ready image. Free, online, no watermark.
          </p>
          <div className="mt-8 flex items-center gap-5">
            <Link
              href="/editor"
              className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-[14.5px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
            >
              Open the editor
              <ArrowRight size={17} />
            </Link>
            <Link
              href="/mockups"
              className="inline-flex items-center gap-1.5 text-[14px] font-medium text-zinc-300 transition-colors hover:text-white"
            >
              Browse {devices.length} devices
              <span aria-hidden>→</span>
            </Link>
          </div>
        </div>

        {/* photoreal device stage — pre-rendered scene mockups (real device
            photos with real screenshots warped into the screen) */}
        <div className="relative mx-auto mt-12 max-w-5xl px-6">
          <div className="relative mx-auto h-[300px] sm:h-[540px]">
            {/* iPad Pro — angled centerpiece, showing the /mockups page */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero/shot-ipad.webp"
              alt="iPad Pro mockup showing the MockFrame device library"
              className="absolute left-1/2 top-2 z-10 w-[82%] max-w-[720px] -translate-x-1/2 drop-shadow-[0_50px_90px_rgba(0,0,0,0.55)]"
            />
            {/* iPhone — leaning, front-right, showing the /templates page */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero/shot-iphone.webp"
              alt="iPhone mockup showing MockFrame templates"
              className="absolute bottom-0 right-[3%] z-20 hidden w-[23%] max-w-[220px] drop-shadow-[0_36px_56px_rgba(0,0,0,0.6)] sm:block"
            />
            {/* Apple Watch Ultra — front-left */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/hero/shot-watch.webp"
              alt="Apple Watch Ultra mockup"
              className="absolute bottom-4 left-[5%] z-20 hidden w-[14%] max-w-[128px] drop-shadow-[0_22px_40px_rgba(0,0,0,0.6)] sm:block"
            />
          </div>
          {/* fade the stage into the page */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 h-28"
            style={{ background: "linear-gradient(to top, #09090b 8%, transparent)" }}
          />
        </div>

        {/* trust row */}
        <div className="relative z-10 mx-auto flex max-w-4xl flex-wrap items-center justify-center gap-x-8 gap-y-2 px-6 pb-6 text-[12.5px] font-medium text-zinc-500">
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> No sign-up
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> No watermark
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Pixel-accurate frames
          </span>
          <span className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> Instant export
          </span>
        </div>
      </section>

      {/* ============================ FEATURES ============================ */}
      <section className="relative border-t border-white/[0.06] py-28">
        <SectionSheen />
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-violet-500" />
            <span className="text-[13.5px] text-zinc-400">Everything you need</span>
          </div>
          <h2 className="mt-4 max-w-2xl text-[30px] font-medium leading-[1.1] tracking-[-0.025em] sm:text-[44px]">
            Made for people who ship screenshots.
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              {
                icon: Smartphone,
                title: "63 pixel-accurate devices",
                body: "iPhone, MacBook, iPad, Apple Watch, Galaxy, Pixel and browser frames — each at its true screen resolution.",
              },
              {
                icon: Layers,
                title: "Style the whole scene",
                body: "Gradients, mesh backgrounds, shadows, 3D tilt and photoreal scenes. Match your brand in a couple of clicks.",
              },
              {
                icon: Download,
                title: "Export anywhere",
                body: "Download a crisp, high-resolution PNG ready for the App Store, a landing page, a deck, or social.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="group flex flex-col justify-between rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-6 transition-colors hover:border-white/20"
                style={{ minHeight: 220 }}
              >
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-white">
                  <f.icon size={19} strokeWidth={2.2} />
                </span>
                <div className="mt-8">
                  <h3 className="text-[16.5px] font-semibold text-white">{f.title}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-400">{f.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ DEVICE SHOWCASE ============================ */}
      <section className="relative border-t border-white/[0.06] py-28">
        <SectionSheen />
        <div className="mx-auto max-w-6xl px-6">
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
          <div className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {popular.map((d) => (
              <Link
                key={d.id}
                href={`/mockups/${d.id}`}
                className="group flex flex-col overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.02] transition-colors hover:border-white/20"
              >
                <div
                  className="flex h-40 items-center justify-center overflow-hidden p-6"
                  style={{ background: "radial-gradient(120% 90% at 50% 0%, rgba(124,58,237,0.14), transparent 70%)" }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={previewDataUri(d)}
                    alt={`${cleanDeviceName(d)} mockup`}
                    className="drop-shadow-[0_12px_28px_rgba(0,0,0,0.5)]"
                    style={{ maxHeight: "100%", maxWidth: "70%", width: "auto", objectFit: "contain" }}
                  />
                </div>
                <div className="flex items-center justify-between border-t border-white/[0.06] p-3.5">
                  <div className="min-w-0">
                    <div className="truncate text-[13.5px] font-semibold text-white">{cleanDeviceName(d)}</div>
                    <div className="text-[11.5px] text-zinc-500">
                      {d.screen.width} × {d.screen.height}
                    </div>
                  </div>
                  <ArrowUpRight size={15} className="shrink-0 text-zinc-600 transition-colors group-hover:text-white" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ HOW IT WORKS ============================ */}
      <section className="relative border-t border-white/[0.06] py-28">
        <SectionSheen />
        <div className="mx-auto max-w-6xl px-6">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-400" />
            <span className="text-[13.5px] text-zinc-400">Three steps</span>
          </div>
          <h2 className="mt-4 max-w-xl text-[30px] font-medium leading-[1.1] tracking-[-0.025em] sm:text-[44px]">
            From screenshot to share-ready in under a minute.
          </h2>
          <div className="mt-12 grid gap-4 md:grid-cols-3">
            {[
              { n: "01", t: "Add your screenshot", d: "Upload, paste, or drag it in — it snaps into the display at native resolution." },
              { n: "02", t: "Style the scene", d: "Pick a background, add a shadow, tilt the device, arrange your layout." },
              { n: "03", t: "Export", d: "Download a high-resolution PNG ready for anywhere you need it." },
            ].map((s) => (
              <div key={s.n} className="rounded-[24px] border border-white/[0.08] bg-white/[0.02] p-6">
                <span className="text-[13px] font-semibold text-violet-400">{s.n}</span>
                <h3 className="mt-3 text-[16.5px] font-semibold text-white">{s.t}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-400">{s.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ CTA ============================ */}
      <section className="relative overflow-hidden border-t border-white/[0.06] py-28">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/2 -z-0 h-[400px] w-[900px] -translate-x-1/2 -translate-y-1/2"
          style={{ background: "radial-gradient(ellipse at center, rgba(124,58,237,0.18), transparent 70%)" }}
        />
        <div className="relative z-10 mx-auto max-w-2xl px-6 text-center">
          <h2 className="text-[32px] font-medium leading-[1.08] tracking-[-0.025em] sm:text-[46px]">
            Ready to make your mockup?
          </h2>
          <p className="mx-auto mt-4 max-w-md text-[15.5px] leading-relaxed text-zinc-400">
            Open the editor and turn your screenshot into a share-ready image in under a minute. No sign-up required.
          </p>
          <Link
            href="/editor"
            className="mt-8 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-[15px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
          >
            Start creating — free
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
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
