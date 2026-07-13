import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Boxes, Download, ImageIcon, Layers, Sparkles, Wand2 } from "lucide-react";
import { getDevice, listDevices, previewDataUri } from "@framekit/devices";
import { HeroMockups } from "@/components/HeroMockups";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
import { SITE_NAME, SITE_URL, cleanDeviceName } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: "MockFrame — Free Screenshot Mockup Studio" },
  description:
    "Drop your screenshot into a pixel-perfect iPhone, MacBook, iPad or Apple Watch frame, style the scene, and export a production-ready image. Free, online, no watermark.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "MockFrame — Free Screenshot Mockup Studio",
    description:
      "Turn screenshots into stunning device mockups in seconds. 63 pixel-accurate frames, gorgeous backgrounds, one-click export.",
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

const FEATURES = [
  { icon: Boxes, title: "63 pixel-accurate devices", body: "iPhone, MacBook, iPad, Apple Watch, Galaxy, Pixel and browser frames — each at its true screen resolution, so nothing stretches or blurs." },
  { icon: Wand2, title: "Style the whole scene", body: "Gradients, mesh backgrounds, solid fills, shadows, 3D tilt and perspective. Make it match your brand in a couple of clicks." },
  { icon: ImageIcon, title: "Photoreal scenes", body: "Drop your screenshot straight into a photographed device held in a real hand or resting on a desk — instantly believable." },
  { icon: Layers, title: "Multi-device layouts", body: "Combine a phone, laptop and watch on one canvas to show your product across every screen at once." },
  { icon: Download, title: "One-click export", body: "Download a crisp, high-resolution PNG ready for the App Store, a landing page, a pitch deck, or social." },
  { icon: Sparkles, title: "Free, online, no watermark", body: "No install, no sign-up wall, no watermark. Open the editor and start creating right away." },
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
    <main className="relative min-h-dvh overflow-hidden bg-[#e9e9f0] text-[#17171c]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {/* ambient page-top wash for depth */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[720px]"
        style={{
          background:
            "radial-gradient(60% 50% at 82% 8%, rgba(124,58,237,0.14), transparent 60%), radial-gradient(50% 40% at 8% 20%, rgba(6,182,212,0.12), transparent 60%), linear-gradient(180deg, #f3f3f7, #e9e9f0 60%)",
        }}
      />
      <SiteHeader />

      {/* hero */}
      <section className="mx-auto grid max-w-6xl gap-12 px-6 pt-10 pb-8 lg:grid-cols-[1fr_1.08fr] lg:items-center lg:pt-20">
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-black/5 bg-white/80 px-3 py-1 text-[12px] font-semibold text-[#6b6b76] shadow-sm backdrop-blur">
            <Sparkles size={13} className="text-violet-600" />
            {devices.length} device frames · free forever
          </span>
          <h1 className="mt-5 text-[42px] font-extrabold leading-[1.03] tracking-[-0.03em] sm:text-[58px]">
            Screenshots into
            <br />
            <span className="bg-gradient-to-r from-violet-600 via-fuchsia-500 to-cyan-500 bg-clip-text text-transparent">
              stunning mockups.
            </span>
          </h1>
          <p className="mt-5 max-w-md text-[16px] leading-relaxed text-[#5b5b66] sm:text-[17px]">
            Drop your screenshot into a pixel-perfect iPhone, MacBook, iPad or Apple Watch, style the scene, and export a
            production-ready image. Free, online, no watermark.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              href="/editor"
              className="inline-flex items-center gap-2 rounded-xl bg-[#17171c] px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_8px_24px_rgba(20,20,45,0.2)] transition hover:bg-black hover:shadow-[0_12px_30px_rgba(20,20,45,0.28)]"
            >
              Open the editor
              <ArrowRight size={18} />
            </Link>
            <Link
              href="/mockups"
              className="inline-flex items-center gap-2 rounded-xl border border-black/10 bg-white px-6 py-3.5 text-[15px] font-semibold text-[#17171c] transition hover:border-black/20"
            >
              Browse {devices.length} devices
            </Link>
          </div>
          <div className="mt-7 flex items-center gap-5 text-[12.5px] font-medium text-[#8a8a94]">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> No sign-up
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> No watermark
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Instant export
            </span>
          </div>
        </div>

        {/* hero device cluster — real UI inside each device */}
        <div className="lg:pl-4">
          <HeroMockups />
        </div>
      </section>

      {/* features */}
      <section className="mx-auto max-w-6xl px-6 pt-16">
        <h2 className="text-[26px] font-extrabold tracking-tight sm:text-[32px]">Everything you need to ship the shot</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_2px_12px_rgba(20,20,45,0.06)]">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white">
                <f.icon size={19} strokeWidth={2.2} />
              </span>
              <h3 className="mt-4 text-[16px] font-bold">{f.title}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#6b6b76]">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* popular devices */}
      <section className="mx-auto max-w-6xl px-6 pt-20">
        <div className="flex items-baseline justify-between">
          <h2 className="text-[26px] font-extrabold tracking-tight sm:text-[32px]">Popular device mockups</h2>
          <Link href="/mockups" className="text-[14px] font-semibold text-[#6b6b76] hover:text-[#17171c]">
            See all {devices.length} →
          </Link>
        </div>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {popular.map((d) => (
            <Link
              key={d.id}
              href={`/mockups/${d.id}`}
              className="group flex flex-col overflow-hidden rounded-3xl border border-black/5 bg-white shadow-[0_2px_12px_rgba(20,20,45,0.06)] transition hover:-translate-y-0.5 hover:shadow-[0_10px_30px_rgba(20,20,45,0.12)]"
            >
              <div
                className="flex h-44 items-center justify-center overflow-hidden p-6"
                style={{ background: "linear-gradient(135deg, #7c3aed1a, #06b6d40a)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewDataUri(d)}
                  alt={`${cleanDeviceName(d)} mockup`}
                  className="drop-shadow-[0_12px_28px_rgba(20,20,45,0.2)]"
                  style={{ maxHeight: "100%", maxWidth: "72%", width: "auto", objectFit: "contain" }}
                />
              </div>
              <div className="border-t border-black/5 p-3.5">
                <div className="text-[13.5px] font-bold">{cleanDeviceName(d)}</div>
                <div className="text-[11.5px] text-[#9a9aa4]">
                  {d.screen.width} × {d.screen.height}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* how it works */}
      <section className="mx-auto max-w-6xl px-6 pt-20">
        <h2 className="text-[26px] font-extrabold tracking-tight sm:text-[32px]">Three steps to a perfect mockup</h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {[
            { n: "1", t: "Add your screenshot", d: "Upload, paste, or drag it in — it snaps into the device display at native resolution." },
            { n: "2", t: "Style the scene", d: "Pick a background, add a shadow, tilt the device, and arrange your layout." },
            { n: "3", t: "Export", d: "Download a high-resolution PNG ready for anywhere you need it." },
          ].map((s) => (
            <div key={s.n} className="rounded-3xl border border-black/5 bg-white p-6 shadow-[0_2px_12px_rgba(20,20,45,0.06)]">
              <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-[14px] font-bold text-white">
                {s.n}
              </span>
              <h3 className="mt-3 text-[16px] font-bold">{s.t}</h3>
              <p className="mt-1.5 text-[14px] leading-relaxed text-[#6b6b76]">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA band */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-24">
        <div className="overflow-hidden rounded-[32px] bg-[#17171c] px-8 py-14 text-center text-white sm:px-16">
          <h2 className="text-[28px] font-extrabold tracking-tight sm:text-[36px]">Ready to make your mockup?</h2>
          <p className="mx-auto mt-3 max-w-md text-[15.5px] leading-relaxed text-white/70">
            Open the editor and turn your screenshot into a share-ready image in under a minute. No sign-up required.
          </p>
          <Link
            href="/editor"
            className="mt-7 inline-flex items-center gap-2 rounded-xl bg-white px-7 py-3.5 text-[15px] font-semibold text-[#17171c] transition hover:bg-white/90"
          >
            Start creating — free
            <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
