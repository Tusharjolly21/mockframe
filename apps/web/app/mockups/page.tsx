import type { Metadata } from "next";
import { listDevices, previewDataUri } from "@framekit/devices";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { MockupsBrowser, type MockupItem } from "@/components/marketing/MockupsBrowser";
import { Reveal } from "@/components/marketing/Reveal";
import { SITE_URL, cleanDeviceName, socialMeta } from "@/lib/site";

export const metadata: Metadata = {
  title: "Device Mockup Generators",
  description: "Free, pixel-accurate mockup generators for iPhone, iPad, MacBook, Apple Watch, Android and browsers. Drop in a screenshot and export in seconds.",
  alternates: { canonical: "/mockups" },
  ...socialMeta({ path: "/mockups", title: "Device Mockup Generators — MockFrame", description: "Free, pixel-accurate mockup generators for iPhone, iPad, MacBook, Apple Watch, Android and browsers. Drop in a screenshot and export in seconds." }),
};

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
    "@type": "CollectionPage",
    name: "Device Mockup Generators",
    url: `${SITE_URL}/mockups`,
    description: "Free, pixel-accurate device mockup generators for every popular phone, tablet, laptop and watch.",
    hasPart: devices.slice(0, 50).map((d) => ({
      "@type": "WebPage",
      name: `${cleanDeviceName(d)} Mockup`,
      url: `${SITE_URL}/mockups/${d.id}`,
    })),
  };

  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingNav />

      <Reveal className="mx-auto max-w-6xl px-6 pb-8 pt-32">
        <p className="flex items-center gap-2 text-[13px] font-semibold text-violet-400">
          <span className="h-1.5 w-1.5 rounded-full bg-violet-400" /> Device library
        </p>
        <h1 className="mt-4 text-[32px] font-medium leading-[1.05] tracking-[-0.03em] sm:text-[46px]">
          Device mockup generators
        </h1>
        <p className="mt-4 max-w-2xl text-[15.5px] leading-relaxed text-zinc-400">
          {total} free, pixel-accurate device frames. Pick a device, drop in your screenshot, style the background, and
          export a production-ready image — no design tools, no watermark.
        </p>
      </Reveal>

      <MockupsBrowser items={items} />

      <MarketingFooter />
    </main>
  );
}
