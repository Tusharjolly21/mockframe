import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight, Download, Mail } from "lucide-react";
import { BrandMark } from "@/components/marketing/BrandMark";
import { firestoreDb } from "@/lib/server/firebaseAdmin";
import { PRESS_SLUG_RE } from "@/lib/launchkit/types";
import { SITE_URL } from "@/lib/site";

export const runtime = "nodejs";
export const revalidate = 300;

type PressDoc = {
  appName: string;
  tagline: string;
  boilerplate: string;
  category: string;
  accent: string;
  icon: string | null;
  screenshots: string[];
  links: { site: string; appstore: string; play: string };
  contact: string;
  publishedAt: number;
};

async function loadPress(slug: string): Promise<PressDoc | null> {
  if (!PRESS_SLUG_RE.test(slug)) return null;
  try {
    const doc = await firestoreDb().collection("pressPages").doc(slug).get();
    return doc.exists ? (doc.data() as PressDoc) : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const doc = await loadPress(slug);
  if (!doc) return { title: "Press kit not found" };
  return {
    title: `${doc.appName} — Press Kit`,
    description: doc.tagline || `Press kit and media assets for ${doc.appName}.`,
    alternates: { canonical: `/press/${slug}` },
    openGraph: {
      title: `${doc.appName} — Press Kit`,
      description: doc.tagline,
      url: `/press/${slug}`,
      ...(doc.screenshots[0] ? { images: [doc.screenshots[0]] } : {}),
    },
  };
}

export default async function PressPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = await loadPress(slug);
  if (!doc) notFound();

  const accent = doc.accent;
  const links = [
    { href: doc.links.site, label: "Website" },
    { href: doc.links.appstore, label: "App Store" },
    { href: doc.links.play, label: "Google Play" },
  ].filter((l) => l.href);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: doc.appName,
    description: doc.boilerplate || doc.tagline,
    applicationCategory: doc.category || "Application",
    ...(doc.links.site ? { url: doc.links.site } : {}),
    ...(doc.icon ? { image: doc.icon } : {}),
  };

  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      {/* hero */}
      <header className="relative overflow-hidden border-b border-white/10">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: `radial-gradient(80% 70% at 50% -10%, ${accent}33, transparent 70%)` }} />
        <div className="relative mx-auto max-w-4xl px-6 pb-14 pt-16">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Press kit</p>
          <div className="mt-6 flex items-center gap-5">
            {doc.icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={doc.icon} alt={`${doc.appName} icon`} className="h-20 w-20 rounded-[22px] border border-white/10 object-cover shadow-[0_20px_50px_rgba(0,0,0,0.5)]" />
            ) : (
              <span className="grid h-20 w-20 place-items-center rounded-[22px] text-[32px] font-bold" style={{ background: accent }}>
                {doc.appName.slice(0, 1).toUpperCase()}
              </span>
            )}
            <div>
              <h1 className="text-[34px] font-semibold tracking-[-0.02em] sm:text-[42px]">{doc.appName}</h1>
              {doc.tagline && <p className="mt-1 text-[16px] text-zinc-400">{doc.tagline}</p>}
            </div>
          </div>
          <div className="mt-7 flex flex-wrap gap-3">
            {links.map((l) => (
              <a key={l.label} href={l.href} target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-[13px] font-semibold hover:bg-white/10">
                {l.label} <ArrowUpRight size={13} />
              </a>
            ))}
            {doc.contact && (
              <a href={`mailto:${doc.contact}`} className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold text-zinc-900" style={{ background: accent }}>
                <Mail size={13} /> Press contact
              </a>
            )}
          </div>
        </div>
      </header>

      {/* boilerplate */}
      {doc.boilerplate && (
        <section className="mx-auto max-w-4xl px-6 py-12">
          <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-zinc-500">About</h2>
          <p className="mt-3 max-w-2xl text-[16px] leading-8 text-zinc-300">{doc.boilerplate}</p>
          {doc.category && <p className="mt-4 text-[12.5px] text-zinc-500">Category: {doc.category}</p>}
        </section>
      )}

      {/* assets */}
      {(doc.icon || doc.screenshots.length > 0) && (
        <section className="mx-auto max-w-4xl border-t border-white/10 px-6 py-12">
          <div className="flex items-center justify-between">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.16em] text-zinc-500">Media assets</h2>
            <span className="text-[11.5px] text-zinc-600">Right-click any asset to save</span>
          </div>
          {doc.icon && (
            <div className="mt-5 flex items-center gap-4 rounded-xl border border-white/10 bg-white/[0.03] p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={doc.icon} alt={`${doc.appName} app icon`} className="h-14 w-14 rounded-2xl object-cover" />
              <div className="flex-1">
                <p className="text-[13.5px] font-semibold">App icon</p>
                <p className="text-[11.5px] text-zinc-500">High-resolution PNG</p>
              </div>
              <a href={doc.icon} download target="_blank" rel="noopener" className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 px-3 py-2 text-[12px] font-semibold hover:bg-white/10">
                <Download size={13} /> Download
              </a>
            </div>
          )}
          {doc.screenshots.length > 0 && (
            <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3">
              {doc.screenshots.map((url, i) => (
                <a key={i} href={url} target="_blank" rel="noopener" className="group overflow-hidden rounded-xl border border-white/10 bg-[#101014]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={url} alt={`${doc.appName} screenshot ${i + 1}`} loading="lazy" className="aspect-[9/16] w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]" />
                </a>
              ))}
            </div>
          )}
        </section>
      )}

      <footer className="border-t border-white/10">
        <div className="mx-auto flex max-w-4xl flex-col items-center gap-2 px-6 py-10 text-center">
          <Link href="/launch-kit" className="flex items-center gap-2 text-[13px] text-zinc-400 hover:text-white">
            <BrandMark size={20} /> Press kit made with MockFrame — create yours free
          </Link>
          <p className="text-[11px] text-zinc-600">Report a problem: hello@mockframe.app</p>
        </div>
      </footer>
    </main>
  );
}
