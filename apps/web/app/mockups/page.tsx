import type { Metadata } from "next";
import { listDevices, previewDataUri } from "@framekit/devices";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MockupsBrowser, type MockupItem } from "@/components/marketing/MockupsBrowser";
import { Reveal } from "@/components/marketing/Reveal";
import { SITE_URL, cleanDeviceName, socialMeta } from "@/lib/site";
import { safeJsonLd } from "@/lib/jsonLd";
import { isCanonicalDevicePage } from "@/lib/deviceSeo";
import Link from "next/link";

// "100+" style count for titles: rounded down so it never overstates
const DEVICE_COUNT = `${Math.floor(listDevices().length / 10) * 10}+`;
const TITLE = `Free Device Mockup Generator: ${DEVICE_COUNT} Devices`;
const DESCRIPTION = `${DEVICE_COUNT} free, pixel-accurate mockups for iPhone, iPad, MacBook, Apple Watch, Android and browsers, including photoreal scenes. Drop in a screenshot and export with no watermark.`;

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: "/mockups" },
  ...socialMeta({ path: "/mockups", title: `${TITLE} — MockFrame`, description: DESCRIPTION }),
};

const STEPS = [
  ["Pick a device", "Filter by type, brand or model, or choose a photographed scene for a realistic shot."],
  ["Add your screenshot", "Upload, paste or drop it in. It snaps to the device's native screen resolution."],
  ["Style and export", "Choose a background and shadow, then export a PNG, JPEG or WebP — no watermark."],
] as const;

const FAQ = [
  {
    q: "Are these device mockups free?",
    a: "Yes. Every device frame and the full editor are free, with no watermark, for personal use. Pro adds 6K export, video and GIF export, premium backgrounds and a commercial license for ads, client work and store listings beyond your first free pack.",
  },
  {
    q: "What's the difference between a frame and a photoreal scene?",
    a: "Frames are drawn, pixel-accurate devices you can place on any background and tilt. Photoreal scenes are photographs of real devices — on a desk, in a hand, on a podium — calibrated so your screenshot is warped onto the screen with the photo's lighting.",
  },
  {
    q: "Which devices are included?",
    a: "Current and recent iPhones, iPads, MacBooks, iMac and Studio Display, Apple Watch, Samsung Galaxy phones, foldables, tablets and watches, Google Pixel, OnePlus, Nothing and Xiaomi phones, plus Safari, Chrome and Arc browser windows.",
  },
  {
    q: "Do I need to resize my screenshot first?",
    a: "No. A screenshot at the device's native resolution fills the screen pixel for pixel, and other sizes are scaled to the display. Each device page lists its exact screen resolution.",
  },
  {
    q: "Can I make App Store screenshots with these mockups?",
    a: "Yes. For a full store listing, the App Store screenshot generator puts your screens in a device, adds captions and exports every required App Store and Google Play size from one design.",
  },
] as const;

export default function MockupsIndexPage() {
  const devices = listDevices();
  const total = devices.length;
  const items: MockupItem[] = devices.map((d) => ({
    id: d.id,
    name: d.name,
    title: cleanDeviceName(d),
    category: d.category,
    brand: d.brand,
    photo: !!d.plate,
    preview: previewDataUri(d),
    screen: [d.screen.width, d.screen.height],
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: "Device Mockup Generators",
        url: `${SITE_URL}/mockups`,
        description: DESCRIPTION,
        // only family pages: photo-scene variants canonicalise to them (lib/deviceSeo.ts)
        hasPart: devices.filter(isCanonicalDevicePage).slice(0, 60).map((d) => ({
          "@type": "WebPage",
          name: `${cleanDeviceName(d)} Mockup`,
          url: `${SITE_URL}/mockups/${d.id}`,
        })),
      },
      {
        "@type": "FAQPage",
        mainEntity: FAQ.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };

  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <MarketingNav />

      <Reveal className="mx-auto max-w-6xl px-6 pb-8 pt-32">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-violet-400">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" /> Device library
        </p>
        <h1 className="mt-4 text-[32px] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[46px]">
          Free device mockup generators
        </h1>
        <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-zinc-400">
          {total} free, pixel-accurate device frames. Pick a device, drop in your screenshot, style the background, and
          export a production-ready image — no design tools, no watermark.
        </p>
      </Reveal>

      <MockupsBrowser items={items} />

      <section className="mx-auto max-w-6xl px-6 pb-24 pt-16">
        <h2 className="text-[24px] font-medium tracking-[-0.02em] sm:text-[28px]">How to make a device mockup</h2>
        <ol className="mt-6 grid gap-4 sm:grid-cols-3">
          {STEPS.map(([t, d], i) => (
            <li key={t} className="rounded-[20px] border border-white/[0.08] bg-white/[0.02] p-5">
              <span className="text-[13px] font-semibold text-violet-300">Step {i + 1}</span>
              <h3 className="mt-2 text-[15.5px] font-semibold text-white">{t}</h3>
              <p className="mt-1 text-[13.5px] leading-relaxed text-zinc-400">{d}</p>
            </li>
          ))}
        </ol>

        <h2 className="mt-16 text-[24px] font-medium tracking-[-0.02em] sm:text-[28px]">Frequently asked questions</h2>
        <dl className="mt-6 max-w-3xl space-y-6">
          {FAQ.map((f) => (
            <div key={f.q}>
              <dt className="text-[15.5px] font-semibold text-white">{f.q}</dt>
              <dd className="mt-1 text-[14.5px] leading-relaxed text-zinc-400">{f.a}</dd>
            </div>
          ))}
        </dl>
        <p className="mt-10 text-[14px] text-zinc-500">
          Making store screenshots? Use the{" "}
          <Link href="/app-store-screenshots" className="text-violet-300 underline-offset-2 hover:underline">
            App Store screenshot generator
          </Link>{" "}
          or read the{" "}
          <Link href="/guides/app-store-screenshot-sizes" className="text-violet-300 underline-offset-2 hover:underline">
            2026 screenshot size guide
          </Link>
          .
        </p>
      </section>

      <MarketingFooter />
    </main>
  );
}
