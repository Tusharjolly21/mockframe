import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { listDevices, previewDataUri } from "@framekit/devices";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Reveal, RevealGroup, RevealItem } from "@/components/marketing/Reveal";
import { CATEGORY_META, CATEGORY_ORDER, SITE_NAME, SITE_URL, cleanDeviceName } from "@/lib/site";

export const metadata: Metadata = {
  title: "Device Mockup Generators",
  description:
    "Free, pixel-accurate mockup generators for iPhone, iPad, MacBook, Apple Watch, Android and browser screenshots. Drop in your screenshot, style the scene, export in seconds.",
  alternates: { canonical: "/mockups" },
  openGraph: {
    title: `Device Mockup Generators — ${SITE_NAME}`,
    description:
      "Free, pixel-accurate mockup generators for iPhone, iPad, MacBook, Apple Watch, Android and browser screenshots.",
    url: "/mockups",
    type: "website",
    siteName: SITE_NAME,
  },
};

export default function MockupsIndexPage() {
  const devices = listDevices();
  const total = devices.length;
  const groups = CATEGORY_ORDER.map((cat) => ({
    cat,
    meta: CATEGORY_META[cat],
    items: devices.filter((d) => d.category === cat),
  })).filter((g) => g.items.length > 0);

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

      <div className="mx-auto max-w-6xl px-6 pb-20">
        {groups.map((g) => (
          <section key={g.cat} className="pt-10">
            <Reveal>
              <div className="flex items-baseline justify-between">
                <h2 className="text-[22px] font-medium tracking-[-0.02em] sm:text-[26px]">{g.meta.label}</h2>
                <span className="text-[13px] font-medium text-zinc-500">
                  {g.items.length} device{g.items.length === 1 ? "" : "s"}
                </span>
              </div>
              <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-zinc-500">{g.meta.blurb}</p>
            </Reveal>

            <RevealGroup className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {g.items.map((d) => (
                <RevealItem key={d.id}>
                  <Link
                    href={`/mockups/${d.id}`}
                    className="group flex h-full flex-col overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.02] transition-colors hover:border-white/20"
                  >
                    <div
                      className="flex h-44 items-center justify-center overflow-hidden p-6"
                      style={{ background: "radial-gradient(120% 90% at 50% 0%, rgba(124,58,237,0.12), transparent 70%)" }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={previewDataUri(d)}
                        alt={`${cleanDeviceName(d)} mockup`}
                        className="drop-shadow-[0_12px_28px_rgba(0,0,0,0.55)]"
                        style={{ maxHeight: "100%", maxWidth: "74%", width: "auto", objectFit: "contain" }}
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
                </RevealItem>
              ))}
            </RevealGroup>
          </section>
        ))}
      </div>

      <MarketingFooter />
    </main>
  );
}
