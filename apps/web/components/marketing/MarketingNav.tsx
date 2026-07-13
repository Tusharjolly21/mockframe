import Link from "next/link";
import { Frame } from "lucide-react";
import { SITE_NAME } from "@/lib/site";

/** Fixed, blurred dark nav for the marketing pages (Linear-style). */
export function MarketingNav() {
  return (
    <header className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#09090b]/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2">
          <span className="grid h-7 w-7 place-items-center rounded-lg bg-gradient-to-br from-violet-500 to-cyan-400 text-white">
            <Frame size={15} strokeWidth={2.4} />
          </span>
          <span className="text-[15px] font-semibold tracking-tight text-white">{SITE_NAME}</span>
        </Link>
        <nav className="hidden items-center gap-8 md:flex">
          {[
            ["/mockups", "Mockups"],
            ["/templates", "Templates"],
            ["/mockups", "Devices"],
          ].map(([href, label], i) => (
            <Link key={i} href={href} className="text-[13.5px] text-zinc-400 transition-colors hover:text-white">
              {label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Link href="/editor" className="hidden text-[13.5px] text-zinc-400 transition-colors hover:text-white sm:block">
            Open editor
          </Link>
          <Link
            href="/editor"
            className="rounded-lg bg-white px-3.5 py-1.5 text-[13.5px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
          >
            Start free
          </Link>
        </div>
      </div>
    </header>
  );
}
