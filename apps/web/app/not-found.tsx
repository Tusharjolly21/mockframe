import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { MarketingFooter } from "@/components/marketing/MarketingFooter";
import { MarketingNav } from "@/components/marketing/MarketingNav";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col bg-[#09090b] text-white">
      <MarketingNav />
      <div className="relative flex flex-1 flex-col items-center justify-center overflow-hidden px-6 pt-20 text-center">
        <div
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-1/3 h-[420px] w-[820px] -translate-x-1/2 -translate-y-1/2"
          style={{ background: "radial-gradient(ellipse at center, rgba(124,58,237,0.16), transparent 70%)" }}
        />
        <p className="relative bg-gradient-to-r from-violet-400 via-fuchsia-400 to-cyan-300 bg-clip-text text-[72px] font-semibold leading-none tracking-tight text-transparent sm:text-[96px]">
          404
        </p>
        <h1 className="relative mt-4 text-[24px] font-medium tracking-[-0.02em] sm:text-[30px]">
          This page doesn&apos;t exist.
        </h1>
        <p className="relative mt-3 max-w-md text-[14.5px] leading-relaxed text-zinc-400">
          The mockup you&apos;re after might have moved — but there are 63 device frames waiting in the library.
        </p>
        <div className="relative mt-7 flex items-center gap-4">
          <Link
            href="/mockups"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-5 py-2.5 text-[14px] font-semibold text-zinc-900 transition-colors hover:bg-zinc-200"
          >
            Browse mockups
            <ArrowRight size={16} />
          </Link>
          <Link href="/" className="text-[14px] font-medium text-zinc-400 transition-colors hover:text-white">
            Go home →
          </Link>
        </div>
      </div>
      <MarketingFooter />
    </main>
  );
}
