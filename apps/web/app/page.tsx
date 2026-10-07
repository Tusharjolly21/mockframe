import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Clapperboard,
  Code,
  Globe,
  Images,
  MessagesSquare,
  Plus,
  Rocket,
  Sparkles,
  Video,
  type LucideIcon,
} from "lucide-react";
import { getDevice, listDevices } from "@framekit/devices";
import { ChatStoriesSection } from "@/components/marketing/ChatStoriesSection";
import { HeroSection } from "@/components/marketing/HeroSection";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { FormatsRow } from "@/components/marketing/home/FormatsRow";
import { GalleryWall } from "@/components/marketing/home/GalleryWall";
import { StyleSwitcher } from "@/components/marketing/home/StyleSwitcher";
import { SITE_NAME, SITE_URL, socialMeta } from "@/lib/site";

const DEVICE_COUNT = listDevices().length;

export const metadata: Metadata = {
  title: { absolute: "MockFrame — Free Screenshot Mockup Studio" },
  description:
    "Drop your screenshot into a photoreal iPhone, MacBook, iPad or Apple Watch, style the scene and export a production-ready image. Free, online, no sign-up.",
  alternates: { canonical: "/" },
  ...socialMeta({
    path: "/",
    title: "MockFrame — Free Screenshot Mockup Studio",
    description: `Turn any screenshot into a stunning device mockup in seconds. ${DEVICE_COUNT} pixel-accurate frames, photoreal scenes, one-click export.`,
  }),
};

/** Photoreal devices on the homepage shelf, each linking to its mockup page. */
type ShelfItem = {
  id: string;
  img: string;
  name: string;
  variant: string;
  /** caps the render inside its tile so a watch never looks bigger than a laptop */
  fit: { maxWidth?: string; maxHeight?: string };
};

const LIBRARY: ShelfItem[] = [
  { id: "macbook-pro-16", img: "/hero/lib-macbook.webp", name: "MacBook Pro 16″", variant: "Front", fit: { maxWidth: "100%" } },
  { id: "iphone-16-pro-psd-black-2", img: "/hero/hero-iphone.webp", name: "iPhone 16 Pro", variant: "Black Titanium, leaning", fit: { maxHeight: "86%" } },
  { id: "ipad-pro-2024-psd-space-black-1", img: "/hero/lib-ipad.webp", name: "iPad Pro", variant: "Space Black, angled", fit: { maxWidth: "84%" } },
  { id: "apple-watch-ultra-psd-midnight-3", img: "/hero/lib-watch.webp", name: "Apple Watch Ultra", variant: "Midnight Ocean, side", fit: { maxHeight: "58%" } },
  { id: "samsung-s24-ultra-psd-gray", img: "/hero/lib-samsung.webp", name: "Galaxy S24 Ultra", variant: "Titanium Gray, lying flat", fit: { maxWidth: "74%" } },
  { id: "ipad-pro-2024-psd-silver-2", img: "/hero/lib-ipad-flat.webp", name: "iPad Pro", variant: "Silver, flat", fit: { maxWidth: "88%" } },
  { id: "iphone-16-pro-psd-desert-2", img: "/hero/lib-iphone-desert.webp", name: "iPhone 16 Pro", variant: "Desert Titanium, leaning", fit: { maxHeight: "86%" } },
  { id: "apple-watch-ultra-psd-midnight-1", img: "/hero/lib-watch-front.webp", name: "Apple Watch Ultra", variant: "Midnight Ocean, front", fit: { maxHeight: "58%" } },
];

/** How each device category reads in a sentence, singular and plural. */
const CATEGORY_WORDS: Record<string, [string, string]> = {
  phone: ["phone", "phones"],
  watch: ["watch", "watches"],
  tablet: ["tablet", "tablets"],
  laptop: ["laptop", "laptops"],
  desktop: ["desktop", "desktops"],
  browser: ["browser window", "browser windows"],
  scene: ["photoreal scene", "photoreal scenes"],
};

const TOOLS: { href: string; icon: LucideIcon; name: string; body: string }[] = [
  {
    href: "/app-store-screenshots",
    icon: Images,
    name: "App Store screenshots",
    body: "Drop 3 to 10 screenshots, pick a style, and download a submission-ready set for both stores.",
  },
  {
    href: "/ai",
    icon: Sparkles,
    name: "AI screenshot pack",
    body: "Describe your app and get a complete store screenshot pack back.",
  },
  {
    href: "/launch-kit",
    icon: Rocket,
    name: "Launch kit",
    body: "Every launch-day asset, designed, sized and written from one form. Your first kit is free.",
  },
  {
    href: "/tools/app-promo-video-maker",
    icon: Clapperboard,
    name: "App promo video",
    body: "A short animated ad built around one app screen, exported as MP4 for Reels and Stories.",
  },
  {
    href: "/tools/fake-text-video",
    icon: MessagesSquare,
    name: "Text message video",
    body: "A chat that plays message by message, with typing dots and sound, sized for vertical feeds.",
  },
  {
    href: "/tools/website-screenshot",
    icon: Globe,
    name: "Website screenshots",
    body: "Capture any page on desktop or mobile and place it in a browser window or device.",
  },
  {
    href: "/tools/code-screenshot",
    icon: Code,
    name: "Code screenshots",
    body: "Syntax-highlighted code and diffs as clean cards, with your own background and ratio.",
  },
  {
    href: "/screen-recorder",
    icon: Video,
    name: "Screen recorder",
    body: "Record your screen and get smooth zooms wherever something happens, framed on a background.",
  },
];

const FAQ: { q: string; a: string }[] = [
  {
    q: "Is it really free?",
    a: "Yes. The full editor, every device frame and image export are free, and free exports never carry a watermark. Pro adds video and GIF export, 4K and 6K output, the premium background collections and more chat screens.",
  },
  {
    q: "Do I need an account?",
    a: "No. Open the editor and start; your work is kept in your browser, so a reload doesn't lose anything. Sign in when you want drafts synced across devices.",
  },
  {
    q: "Where do my screenshots go?",
    a: "They stay in your browser. Images are processed on your device and only reach our servers when you use a cloud feature such as draft sync, share links or realistic renders.",
  },
  {
    q: "What sizes and formats can I export?",
    a: "Presets for Instagram, X, YouTube, Pinterest, Dribbble and the App Store, or any custom size. Files download as PNG, JPG or WebP. HD is free; 4K and 6K are on Pro.",
  },
  {
    q: "Which devices are included?",
    a: `${DEVICE_COUNT} frames: iPhone 15 to 17, Galaxy S24 and S25 Ultra, Pixel, OnePlus and Nothing phones, iPad Air, mini and Pro, MacBook Air and Pro, Apple Watch, and Safari, Chrome and Arc browser windows.`,
  },
  {
    q: "Can I make videos?",
    a: "Yes. Chat stories and animated app promos export as MP4 for Reels, TikTok and Shorts. Video and GIF export are part of Pro.",
  },
];

export default function HomePage() {
  const devices = listDevices();
  const counts = new Map<string, number>();
  for (const d of devices) counts.set(d.category, (counts.get(d.category) ?? 0) + 1);
  const categories = [...counts.entries()].sort((a, b) => b[1] - a[1]);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: SITE_NAME,
      url: SITE_URL,
      applicationCategory: "DesignApplication",
      operatingSystem: "Web",
      description:
        "Free online screenshot mockup studio. Place screenshots in photoreal device frames, style the scene, and export production-quality images.",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    },
  ];

  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <MarketingNav />

      <HeroSection devicesCount={devices.length} />

      <GalleryWall />

      {/* ============================ DEVICES ============================ */}
      <section aria-labelledby="devices-title" className="py-24 sm:py-32">
        <div className="mx-auto max-w-6xl px-6">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-start lg:gap-16">
            <h2
              id="devices-title"
              className="text-balance text-[32px] font-semibold leading-[1.05] tracking-[-0.04em] sm:text-[44px] lg:col-span-6"
            >
              Every screen your product lives on
            </h2>
            <div className="max-w-md text-[16px] leading-relaxed text-zinc-400 lg:col-span-6">
              <p>
                Each frame is built at its device&apos;s real screen resolution, so a 1206 × 2622 screenshot from an
                iPhone 16 Pro fills it exactly, with no stretching or cropping.
              </p>
              <p className="mt-4">
                {categories.map(([cat, n], i) => {
                  const [one, many] = CATEGORY_WORDS[cat] ?? [cat, cat];
                  const sep = i === 0 ? "" : i === categories.length - 1 ? " and " : ", ";
                  return (
                    <span key={cat}>
                      {sep}
                      <Link
                        href={`/mockups#${cat}`}
                        className="text-zinc-200 underline decoration-white/20 underline-offset-4 transition-colors hover:text-white hover:decoration-white/60"
                      >
                        {n} {n === 1 ? one : many}
                      </Link>
                    </span>
                  );
                })}
                .
              </p>
            </div>
          </div>

          <ul className="mt-16 grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
            {LIBRARY.map((item) => {
              const device = getDevice(item.id);
              if (!device) return null;
              return (
                <li key={item.id}>
                  <Link href={`/mockups/${item.id}`} className="group block rounded-[18px] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-violet-400">
                    <div className="flex h-40 items-center justify-center rounded-[18px] bg-[radial-gradient(55%_45%_at_50%_60%,rgba(255,255,255,0.045),transparent_75%)] p-4 sm:h-56">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.img}
                        alt={`${item.name}, ${item.variant.toLowerCase()}, photoreal mockup`}
                        loading="lazy"
                        decoding="async"
                        style={item.fit}
                        className="h-auto w-auto max-h-full max-w-full object-contain transition-transform duration-300 ease-out group-hover:-translate-y-1.5 motion-reduce:transition-none"
                      />
                    </div>
                    <div className="mt-4 text-[14.5px] font-medium text-white">{item.name}</div>
                    <div className="mt-0.5 text-[13px] text-zinc-500">{item.variant}</div>
                    <div className="mt-0.5 text-[12.5px] tabular-nums text-zinc-600">
                      {device.screen.width} × {device.screen.height}
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>

          <Link
            href="/mockups"
            className="mt-14 inline-flex h-11 items-center rounded-full border border-white/10 px-5 text-[14.5px] font-medium text-zinc-200 transition-colors hover:border-white/25 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400"
          >
            Browse all {devices.length} devices
          </Link>
        </div>
      </section>

      <StyleSwitcher />

      <FormatsRow />

      <ChatStoriesSection />

      {/* ============================ MORE TOOLS ============================ */}
      <section aria-labelledby="tools-title" className="border-t border-white/[0.06] py-24 sm:py-28">
        <div className="mx-auto max-w-6xl px-6">
          <h2 id="tools-title" className="text-[26px] font-semibold tracking-[-0.03em] sm:text-[32px]">
            More in the studio
          </h2>
          <ul className="mt-10 grid gap-x-8 sm:grid-cols-2 lg:grid-cols-4">
            {TOOLS.map((t) => (
              <li key={t.href} className="border-t border-white/[0.08]">
                <Link href={t.href} className="group block py-6 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400">
                  <t.icon size={20} strokeWidth={1.75} className="text-zinc-500 transition-colors group-hover:text-violet-300" aria-hidden />
                  <div className="mt-4 text-[15px] font-medium text-white">{t.name}</div>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed text-zinc-500">{t.body}</p>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* ============================ FAQ ============================ */}
      <section aria-labelledby="faq-title" className="border-t border-white/[0.06] py-24 sm:py-28">
        <div className="mx-auto grid max-w-6xl gap-10 px-6 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <h2 id="faq-title" className="text-[26px] font-semibold tracking-[-0.03em] sm:text-[32px]">
              Before you start
            </h2>
            <p className="mt-4 max-w-xs text-[15px] leading-relaxed text-zinc-400">
              Anything else, see{" "}
              <Link href="/pricing" className="text-zinc-200 underline decoration-white/20 underline-offset-4 hover:decoration-white/60">
                pricing
              </Link>{" "}
              or the{" "}
              <Link href="/guides" className="text-zinc-200 underline decoration-white/20 underline-offset-4 hover:decoration-white/60">
                guides
              </Link>
              .
            </p>
          </div>
          <div className="lg:col-span-8">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-b border-white/[0.08] first:border-t">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-6 py-5 text-[16px] font-medium text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-violet-400 [&::-webkit-details-marker]:hidden">
                  {f.q}
                  <Plus
                    size={18}
                    aria-hidden
                    className="shrink-0 text-zinc-500 transition-transform duration-200 group-open:rotate-45 motion-reduce:transition-none"
                  />
                </summary>
                <p className="max-w-2xl pb-6 text-[15px] leading-relaxed text-zinc-400">{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============================ CLOSING ============================ */}
      <section className="relative overflow-hidden border-t border-white/[0.06]">
        <div
          aria-hidden
          className="pointer-events-none absolute left-[30%] top-[-160px] h-[560px] w-[1000px] -translate-x-1/2"
          style={{
            background:
              "radial-gradient(ellipse 45% 45% at 50% 50%, rgba(124,58,237,0.2), transparent 70%), radial-gradient(ellipse 30% 30% at 64% 60%, rgba(56,189,248,0.08), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-6xl px-6 py-28 sm:py-36">
          <h2 className="max-w-3xl text-balance text-[40px] font-semibold leading-[1.02] tracking-[-0.045em] sm:text-[64px]">
            Start with the screenshot you already have.
          </h2>
          <p className="mt-6 max-w-md text-[16px] leading-relaxed text-zinc-400 sm:text-[17px]">
            Drop it into the editor and download your first mockup free, with no sign-up and no watermark.
          </p>
          <Link
            href="/editor"
            className="group mt-10 inline-flex h-12 items-center gap-2 rounded-full bg-white px-7 text-[15px] font-semibold text-zinc-950 shadow-[0_0_0_1px_rgba(255,255,255,0.1),0_10px_40px_-10px_rgba(255,255,255,0.45)] transition-colors hover:bg-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Start creating, it&apos;s free
            <ArrowRight size={18} className="transition-transform group-hover:translate-x-0.5" />
          </Link>
        </div>
      </section>

      <MarketingFooter />
    </main>
  );
}
