import type { Metadata } from "next";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { listDevices, previewDataUri } from "@framekit/devices";
import { SiteFooter, SiteHeader } from "@/components/SiteChrome";
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
    <main className="min-h-dvh bg-[#e9e9f0] text-[#17171c]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SiteHeader active="mockups" />

      <section className="mx-auto max-w-6xl px-6 pb-8 pt-6">
        <h1 className="text-[32px] font-extrabold tracking-tight sm:text-[42px]">Device mockup generators</h1>
        <p className="mt-3 max-w-2xl text-[15.5px] leading-relaxed text-[#5b5b66]">
          {total} free, pixel-accurate device frames. Pick a device, drop in your screenshot, style the background, and
          export a production-ready image — no design tools, no watermark.
        </p>
      </section>

      <div className="mx-auto max-w-6xl px-6 pb-20">
        {groups.map((g) => (
          <section key={g.cat} className="pt-10">
            <div className="flex items-baseline justify-between">
              <h2 className="text-[22px] font-extrabold tracking-tight sm:text-[26px]">{g.meta.label}</h2>
              <span className="text-[13px] font-semibold text-[#9a9aa4]">
                {g.items.length} device{g.items.length === 1 ? "" : "s"}
              </span>
            </div>
            <p className="mt-1 max-w-xl text-[13.5px] leading-relaxed text-[#6b6b76]">{g.meta.blurb}</p>

            <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {g.items.map((d) => (
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
                      style={{ maxHeight: "100%", maxWidth: "74%", width: "auto", objectFit: "contain" }}
                    />
                  </div>
                  <div className="flex items-center justify-between border-t border-black/5 p-3.5">
                    <div className="min-w-0">
                      <div className="truncate text-[13.5px] font-bold">{cleanDeviceName(d)}</div>
                      <div className="text-[11.5px] text-[#9a9aa4]">
                        {d.screen.width} × {d.screen.height}
                      </div>
                    </div>
                    <ArrowUpRight size={15} className="shrink-0 text-[#b0b0ba] transition group-hover:text-[#17171c]" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>

      <SiteFooter />
    </main>
  );
}
