import Link from "next/link";
import { SITE_NAME } from "@/lib/site";
import { BrandMark } from "./BrandMark";
import { FeedbackButton } from "./FeedbackButton";

const COLS: { title: string; links: [string, string][] }[] = [
  {
    title: "Product",
    links: [
      ["/editor", "Editor"],
      ["/mockups", "Device mockups"],
      ["/templates", "Templates"],
      ["/pricing", "Pricing"],
      ["/developers/api", "Render API alpha"],
      ["/developers/embed", "Embed editor alpha"],
      ["/extensions", "Extensions alpha"],
    ],
  },
  {
    title: "Popular devices",
    links: [
      ["/mockups/iphone-16-pro", "iPhone 16 Pro"],
      ["/mockups/macbook-pro-16", "MacBook Pro 16"],
      ["/mockups/ipad-pro-13", "iPad Pro 13"],
      ["/mockups/apple-watch-ultra-psd-midnight-1", "Apple Watch Ultra"],
    ],
  },
  {
    title: "Chat mockups",
    links: [
      ["/tools/fake-whatsapp-chat-generator", "WhatsApp chat"],
      ["/tools/fake-imessage-generator", "iMessage / texts"],
      ["/tools/fake-instagram-dm-generator", "Instagram DM"],
      ["/tools/fake-telegram-chat-generator", "Telegram chat"],
      ["/tools/fake-snapchat-generator", "Snapchat"],
      ["/tools/fake-messenger-chat-generator", "Messenger"],
    ],
  },
  {
    title: "Tools",
    links: [
      ["/tools", "All tools"],
      ["/tools/website-screenshot", "Website screenshots"],
      ["/tools/code-screenshot", "Code screenshots"],
      ["/tools/tweet-screenshot", "X post images"],
      ["/tools/app-store-screenshot", "App Store images"],
      ["/guides", "Guides"],
      ["/changelog", "Changelog"],
      ["/developers/automations", "Automations"],
      ["/privacy", "Privacy policy"],
    ],
  },
];

/** Dark multi-column marketing footer (Linear-style). */
export function MarketingFooter() {
  return (
    <footer className="border-t border-white/10 bg-[#09090b] px-6 py-16">
      {/* brand block spans 2 cols; with 4 link columns that's 6 total (was 5,
          which wrapped "Tools" onto a second row when "Chat mockups" was added) */}
      <div className="mx-auto grid max-w-6xl grid-cols-2 gap-10 md:grid-cols-6">
        <div className="col-span-2 md:col-span-2">
          <Link href="/" className="flex items-center gap-2">
            <BrandMark size={28} />
            <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">{SITE_NAME}</span>
          </Link>
          <p className="mt-3 max-w-xs text-[13px] leading-relaxed text-zinc-500">
            The free screenshot mockup studio. Pixel-accurate device frames, gorgeous scenes, one-click export.
          </p>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <div className="text-[13px] font-semibold text-white">{col.title}</div>
            <ul className="mt-4 space-y-2.5">
              {col.links.map(([href, label]) => (
                <li key={href + label}>
                  <Link href={href} className="text-[13px] text-zinc-500 transition-colors hover:text-white">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="mx-auto mt-14 flex max-w-6xl items-center justify-between border-t border-white/10 pt-6 text-[12.5px] text-zinc-600">
        <span>© {SITE_NAME}</span>
        <div className="flex items-center gap-5"><FeedbackButton /><span>Start free · online · Pro exports available</span></div>
      </div>
    </footer>
  );
}
