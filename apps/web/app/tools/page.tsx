import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Wand2 } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";
import { Reveal } from "@/components/marketing/Reveal";
import { SITE_NAME, SITE_URL } from "@/lib/site";
import { TOOL_PAGES, type ToolPage } from "@/lib/toolPages";

export const metadata: Metadata = {
  title: "Tools",
  description:
    "Every MockFrame generator in one place — website, code, X and Bluesky screenshots, App Store sets, and realistic WhatsApp, iMessage, Instagram, Telegram, Snapchat and Messenger chat mockups.",
  alternates: { canonical: "/tools" },
  openGraph: {
    title: `Tools — ${SITE_NAME}`,
    description: "Screenshot, capture and chat-mockup generators — free to start, no sign-up.",
    url: "/tools",
  },
};

// Two clear buckets so the page reads as a browseable hierarchy (the anti-doorway
// signal), not a flat list of near-duplicate pages.
const CHAT_SLUGS = new Set([
  "fake-whatsapp-chat-generator",
  "fake-imessage-generator",
  "fake-instagram-dm-generator",
  "fake-telegram-chat-generator",
  "fake-snapchat-generator",
  "fake-messenger-chat-generator",
  "fake-discord-chat-generator",
  "fake-slack-conversation-generator",
  "fake-signal-chat-generator",
  "fake-line-chat-generator",
  "fake-teams-chat-generator",
]);

const VIDEO_SLUGS = new Set(["app-promo-video-maker"]);

const SECTIONS: { heading: string; blurb: string; tools: ToolPage[] }[] = [
  {
    heading: "Video & motion",
    blurb: "Turn a screenshot into an animated promo video, ready for Instagram and Facebook.",
    tools: TOOL_PAGES.filter((t) => VIDEO_SLUGS.has(t.slug)),
  },
  {
    heading: "Screenshot & capture tools",
    blurb: "Turn a URL, a code snippet, a post or an app screen into a finished, framed image.",
    tools: TOOL_PAGES.filter((t) => !CHAT_SLUGS.has(t.slug) && !VIDEO_SLUGS.has(t.slug)),
  },
  {
    heading: "Chat & DM mockups",
    blurb: "Realistic, clearly-fictional chat screens for demos, tutorials, UI design and marketing.",
    tools: TOOL_PAGES.filter((t) => CHAT_SLUGS.has(t.slug)),
  },
];

export default function ToolsIndexPage() {
  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "CollectionPage",
        name: `${SITE_NAME} tools`,
        url: `${SITE_URL}/tools`,
        description: metadata.description,
        hasPart: TOOL_PAGES.map((t) => ({
          "@type": "WebApplication",
          name: t.name,
          url: `${SITE_URL}/tools/${t.slug}`,
          applicationCategory: "DesignApplication",
          operatingSystem: "Web",
        })),
      },
      {
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: SITE_NAME, item: SITE_URL },
          { "@type": "ListItem", position: 2, name: "Tools", item: `${SITE_URL}/tools` },
        ],
      },
    ],
  };

  return (
    <main className="min-h-dvh bg-[#09090b] text-white">
      <MarketingNav />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />

      <section className="mx-auto max-w-6xl px-6 pb-14 pt-32">
        <Reveal className="max-w-2xl">
          <p className="flex items-center gap-2 text-[13px] font-semibold text-violet-300"><Wand2 size={16} /> All tools</p>
          <h1 className="mt-4 text-[42px] font-medium leading-[1.03] tracking-[-0.03em] sm:text-[58px]">Every MockFrame generator, in one place.</h1>
          <p className="mt-5 text-[16px] leading-7 text-zinc-400">Free to start, no sign-up. Each tool opens the same editor, so you can keep styling and export at the size you need.</p>
        </Reveal>
      </section>

      <div className="mx-auto max-w-6xl space-y-20 px-6 pb-24">
        {SECTIONS.map((section) => (
          <section key={section.heading}>
            <div className="max-w-2xl">
              <h2 className="text-[26px] font-medium tracking-[-0.02em]">{section.heading}</h2>
              <p className="mt-2 text-[14.5px] leading-7 text-zinc-500">{section.blurb}</p>
            </div>
            <div className="mt-8 grid gap-px overflow-hidden rounded-lg border border-white/10 bg-white/10 sm:grid-cols-2 lg:grid-cols-3">
              {section.tools.map((tool) => (
                <Link key={tool.slug} href={`/tools/${tool.slug}`} className="group bg-[#101014] p-7 transition-colors hover:bg-[#15151b]">
                  <span className="inline-block h-1 w-8 rounded-full" style={{ background: tool.accent }} />
                  <h3 className="mt-5 text-[18px] font-semibold leading-tight">{tool.name}</h3>
                  <p className="mt-2.5 text-[13px] leading-6 text-zinc-400">{tool.eyebrow}</p>
                  <span className="mt-6 inline-flex items-center gap-2 text-[12.5px] font-semibold text-white">Open tool <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
                </Link>
              ))}
            </div>
          </section>
        ))}
      </div>
      <MarketingFooter />
    </main>
  );
}
