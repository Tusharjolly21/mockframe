import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, Sparkles } from "lucide-react";
import { getDevice, listDevices, previewDataUri, type Device, deviceModel, filterDevices } from "@framekit/devices";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { SITE_NAME, SITE_URL, baseDeviceName, categoryLabel, cleanDeviceName, deviceDescription, deviceKeywords, deviceOgImage, deviceSpecs, deviceTitle, socialMeta } from "@/lib/site";
import { safeJsonLd } from "@/lib/jsonLd";
import { DEVICE_PAGES_UPDATED, canonicalDevice, deviceFaq, familyScenes, isCanonicalDevicePage } from "@/lib/deviceSeo";
import { formatArticleDate } from "@/lib/articles";

/** Statically generate one page per device in the registry. */
export function generateStaticParams() {
  return listDevices().map((d) => ({ deviceId: d.id }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}): Promise<Metadata> {
  const { deviceId } = await params;
  const device = getDevice(deviceId);
  if (!device) return { title: "Mockup not found", robots: { index: false } };
  const title = deviceTitle(device);
  const description = deviceDescription(device);
  // photo scenes defer to their family page (see lib/deviceSeo.ts)
  const canonical = `/mockups/${canonicalDevice(device).id}`;
  const og = deviceOgImage(device);
  return {
    title,
    description,
    keywords: deviceKeywords(device),
    alternates: { canonical },
    // photo devices share their plate; drawn frames fall back to the site card
    ...socialMeta({ path: canonical, title: `${title} — ${SITE_NAME}`, description, image: og }),
  };
}

/** Up to 7 sibling devices in the same category (then fill from the rest). */
function relatedDevices(device: Device): Device[] {
  const family = canonicalDevice(device).id;
  const all = listDevices().filter((d) => d.id !== device.id && isCanonicalDevicePage(d) && d.id !== family);
  const sameCat = all.filter((d) => d.category === device.category);
  const rest = all.filter((d) => d.category !== device.category);
  return [...sameCat, ...rest].slice(0, 7);
}

export default async function DeviceMockupPage({
  params,
}: {
  params: Promise<{ deviceId: string }>;
}) {
  const { deviceId } = await params;
  const device = getDevice(deviceId);
  if (!device) notFound();

  const name = cleanDeviceName(device);
  const base = baseDeviceName(device);
  const preview = previewDataUri(device);
  const specs = deviceSpecs(device);
  const related = relatedDevices(device);
  const scenes = familyScenes(device);
  const familyHead = canonicalDevice(device);
  const ratio = specs.find((s) => s.label === "Aspect ratio")?.value ?? "";
  const faq = deviceFaq(device, { name, base, ratio, scenes: scenes.length });
  const model = deviceModel(device);
  const sameModel = filterDevices(listDevices(), { model }).length;
  const editorHref = `/editor?device=${device.id}`;

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Mockups", item: `${SITE_URL}/mockups` },
          { "@type": "ListItem", position: 3, name: `${name} Mockup`, item: `${SITE_URL}/mockups/${device.id}` },
        ],
      },
      {
        "@type": "SoftwareApplication",
        name: `${name} Mockup Generator`,
        applicationCategory: "DesignApplication",
        operatingSystem: "Web",
        url: `${SITE_URL}/mockups/${device.id}`,
        description: deviceDescription(device),
        offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
        publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
      },
      {
        "@type": "FAQPage",
        mainEntity: faq.map((f) => ({ "@type": "Question", name: f.q, acceptedAnswer: { "@type": "Answer", text: f.a } })),
      },
    ],
  };

  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(jsonLd) }} />
      <MarketingNav />

      <div className="mx-auto max-w-6xl px-6 pt-24">
        {/* breadcrumb */}
        <nav className="flex items-center gap-1.5 pt-6 text-[13px] text-zinc-500">
          <Link href="/mockups" className="hover:text-zinc-300">
            Mockups
          </Link>
          <span>/</span>
          <span className="font-medium text-zinc-300">{name}</span>
          <span className="ml-auto text-zinc-600">
            Updated <time dateTime={DEVICE_PAGES_UPDATED}>{formatArticleDate(DEVICE_PAGES_UPDATED)}</time>
          </span>
        </nav>

        {/* hero */}
        <section className="grid gap-8 pt-6 lg:grid-cols-[1.1fr_1fr] lg:items-center">
          <div
            className="flex h-[420px] items-center justify-center overflow-hidden rounded-[28px] border border-white/[0.08] p-10 sm:h-[500px]"
            style={{ background: "radial-gradient(120% 90% at 50% 10%, rgba(124,58,237,0.18), transparent 65%)" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt={`${name} mockup preview`}
              className="drop-shadow-[0_24px_60px_rgba(0,0,0,0.6)]"
              style={{ maxHeight: "100%", maxWidth: "88%", width: "auto", objectFit: "contain" }}
            />
          </div>

          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[12px] font-medium text-zinc-300 backdrop-blur">
              <Sparkles size={13} className="text-violet-400" />
              {categoryLabel(device.category)} mockup
            </span>
            <h1 className="mt-3 text-[32px] font-medium leading-[1.1] tracking-[-0.02em] sm:text-[42px]">
              {name} Mockup Generator
            </h1>
            <p className="mt-3 max-w-lg text-[15.5px] leading-relaxed text-zinc-400">
              Drop your screenshot into a pixel-accurate {base} frame, style the background, and export a
              production-ready image in seconds. Free, online, no watermark.
            </p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <Link
                href={editorHref}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-3 text-[14.5px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
              >
                Open in editor
                <ArrowRight size={17} />
              </Link>
              <Link
                href="/mockups"
                className="inline-flex items-center gap-1.5 rounded-lg px-4 py-3 text-[14px] font-medium text-zinc-400 hover:text-white"
              >
                All devices
              </Link>
              {sameModel > 1 && (
                <Link
                  href={`/mockups?${new URLSearchParams({ model }).toString()}`}
                  className="inline-flex items-center gap-1.5 rounded-lg px-4 py-3 text-[14px] font-medium text-zinc-400 hover:text-white"
                >
                  All {model} mockups ({sameModel})
                </Link>
              )}
            </div>

            {/* quick spec chips */}
            <dl className="mt-7 grid grid-cols-2 gap-3 sm:grid-cols-3">
              {specs.slice(0, 3).map((s) => (
                <div key={s.label} className="rounded-2xl border border-white/[0.08] bg-white/[0.02] p-3">
                  <dt className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">{s.label}</dt>
                  <dd className="mt-0.5 text-[14px] font-semibold text-white">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </section>

        {/* how it works */}
        <section className="pt-20">
          <h2 className="text-[24px] font-medium tracking-[-0.02em] sm:text-[28px]">How to make your {base} mockup</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { n: "1", t: "Add your screenshot", d: `Upload or paste your ${base} screenshot — it snaps into the display at the exact ${device.screen.width}×${device.screen.height} resolution.` },
              { n: "2", t: "Style the scene", d: "Pick a gradient, mesh, or solid background, add a shadow, and position the device however you like." },
              { n: "3", t: "Export", d: "Download a crisp, high-resolution PNG ready for the App Store, a landing page, or social." },
            ].map((step) => (
              <div key={step.n} className="rounded-[20px] border border-white/[0.08] bg-white/[0.02] p-5">
                <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-500 to-cyan-400 text-[14px] font-bold text-white">
                  {step.n}
                </span>
                <h3 className="mt-3 text-[15.5px] font-semibold text-white">{step.t}</h3>
                <p className="mt-1 text-[13.5px] leading-relaxed text-zinc-400">{step.d}</p>
              </div>
            ))}
          </div>
        </section>

        {/* full specs */}
        <section className="pt-16">
          <h2 className="text-[24px] font-medium tracking-[-0.02em] sm:text-[28px]">{name} specifications</h2>
          <div className="mt-5 overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.02]">
            <dl className="divide-y divide-white/[0.06]">
              {specs.map((s) => (
                <div key={s.label} className="flex items-center justify-between px-5 py-3.5">
                  <dt className="text-[14px] text-zinc-500">{s.label}</dt>
                  <dd className="text-[14px] font-semibold text-white">{s.value}</dd>
                </div>
              ))}
            </dl>
          </div>
          <p className="mt-5 max-w-2xl text-[14px] leading-relaxed text-zinc-500">
            The {name} mockup renders at a native {device.screen.width} × {device.screen.height} display resolution, so
            your screenshot stays razor-sharp with no stretching or blur. Perfect for {base} app screenshots, product
            pages, pitch decks, and social posts. Shipping to the stores? Generate every required size at once with the{" "}
            <Link href="/app-store-screenshots" className="text-violet-300 underline-offset-2 hover:underline">
              App Store screenshot generator
            </Link>
            .
          </p>
        </section>

        {/* every photo scene of this device family, gathered on the family page */}
        {scenes.length > 0 && (
          <section className="pt-16">
            <h2 className="text-[24px] font-medium tracking-[-0.02em] sm:text-[28px]">
              Photoreal {base} scenes ({scenes.length})
            </h2>
            <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-zinc-500">
              Prefer a photographed device to a flat frame? Each scene below is calibrated to the {base} display —
              open one and your screenshot is warped onto the screen with real lighting.
            </p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {scenes.map((d) => (
                <Link
                  key={d.id}
                  href={`/editor?device=${d.id}`}
                  className="group flex flex-col overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.02] transition-colors hover:border-white/20"
                >
                  <div className="flex h-40 items-center justify-center overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewDataUri(d)}
                      alt={`${cleanDeviceName(d)} mockup scene`}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="flex items-center justify-between border-t border-white/[0.06] p-3.5">
                    <span className="text-[13.5px] font-semibold text-white">{cleanDeviceName(d)}</span>
                    <ArrowUpRight size={15} className="text-zinc-600 transition-colors group-hover:text-white" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {familyHead.id !== device.id && (
          <p className="pt-10 text-[14px] text-zinc-500">
            This is one of several {base} scenes.{" "}
            <Link href={`/mockups/${familyHead.id}`} className="text-violet-300 underline-offset-2 hover:underline">
              See every {baseDeviceName(familyHead)} mockup
            </Link>
            .
          </p>
        )}

        {/* per-device FAQ (also FAQPage structured data above) */}
        <section className="pt-16">
          <h2 className="text-[24px] font-medium tracking-[-0.02em] sm:text-[28px]">{base} mockup FAQ</h2>
          <dl className="mt-6 max-w-3xl space-y-6">
            {faq.map((f) => (
              <div key={f.q}>
                <dt className="text-[15.5px] font-semibold text-white">{f.q}</dt>
                <dd className="mt-1 text-[14.5px] leading-relaxed text-zinc-400">{f.a}</dd>
              </div>
            ))}
          </dl>
        </section>

        {/* related */}
        {related.length > 0 && (
          <section className="pt-16 pb-20">
            <h2 className="text-[24px] font-medium tracking-[-0.02em] sm:text-[28px]">More device mockups</h2>
            <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {related.map((d) => (
                <Link
                  key={d.id}
                  href={`/mockups/${d.id}`}
                  className="group flex flex-col overflow-hidden rounded-[20px] border border-white/[0.08] bg-white/[0.02] transition-colors hover:border-white/20"
                >
                  <div
                    className="flex h-40 items-center justify-center overflow-hidden p-6"
                    style={{ background: "radial-gradient(120% 90% at 50% 0%, rgba(124,58,237,0.12), transparent 70%)" }}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={previewDataUri(d)}
                      alt={cleanDeviceName(d)}
                      className="drop-shadow-[0_10px_24px_rgba(0,0,0,0.5)]"
                      style={{ maxHeight: "100%", maxWidth: "72%", width: "auto", objectFit: "contain" }}
                    />
                  </div>
                  <div className="flex items-center justify-between border-t border-white/[0.06] p-3.5">
                    <span className="text-[13.5px] font-semibold text-white">{cleanDeviceName(d)}</span>
                    <ArrowUpRight size={15} className="text-zinc-600 transition-colors group-hover:text-white" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}
      </div>

      <MarketingFooter />
    </main>
  );
}
