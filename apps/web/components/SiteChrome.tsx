import Link from "next/link";
import { Frame } from "lucide-react";
import { SITE_NAME } from "@/lib/site";

type NavKey = "mockups" | "templates" | "editor";

/** Shared marketing/pSEO header — MockFrame logo + top nav. */
export function SiteHeader({ active }: { active?: NavKey }) {
  const link = (href: string, label: string, key: NavKey) =>
    active === key ? (
      <span key={key} className="rounded-lg bg-white px-3 py-1.5 shadow-sm">
        {label}
      </span>
    ) : (
      <Link key={key} href={href} className="rounded-lg px-3 py-1.5 text-[#6b6b76] hover:bg-white/70 hover:text-[#17171c]">
        {label}
      </Link>
    );
  return (
    <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
      <Link href="/editor" className="flex items-center gap-2">
        <span className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-white">
          <Frame size={16} strokeWidth={2.4} />
        </span>
        <span className="text-[16px] font-bold tracking-tight">{SITE_NAME}</span>
      </Link>
      <nav className="flex items-center gap-1 text-[13px] font-semibold">
        {link("/mockups", "Mockups", "mockups")}
        {link("/templates", "Templates", "templates")}
        {link("/editor", "Editor", "editor")}
      </nav>
    </header>
  );
}

/** Shared marketing/pSEO footer with internal links. */
export function SiteFooter() {
  return (
    <footer className="border-t border-black/5">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-[13px] text-[#6b6b76] sm:flex-row">
        <span>© {SITE_NAME} — free screenshot mockup studio.</span>
        <div className="flex items-center gap-4">
          <Link href="/mockups" className="hover:text-[#17171c]">
            All mockups
          </Link>
          <Link href="/templates" className="hover:text-[#17171c]">
            Templates
          </Link>
          <Link href="/editor" className="hover:text-[#17171c]">
            Open editor
          </Link>
        </div>
      </div>
    </footer>
  );
}
