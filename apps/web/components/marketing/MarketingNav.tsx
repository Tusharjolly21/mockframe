"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { SITE_NAME } from "@/lib/site";

const LINKS: [string, string][] = [
  ["/mockups", "Mockups"],
  ["/templates", "Templates"],
  ["/guides", "Guides"],
  ["/pricing", "Pricing"],
  ["/editor", "Editor"],
];

/** Fixed, blurred dark nav for the marketing pages — with a mobile menu. */
export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || (href !== "/editor" && pathname.startsWith(href + "/"));
  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-x-0 top-0 z-50 border-b border-white/10 bg-[#09090b]/80 backdrop-blur-md"
    >
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-3.5">
        <Link href="/" className="flex items-center gap-2" onClick={() => setOpen(false)}>
          <BrandMark size={28} />
          <span className="text-[15px] font-semibold tracking-[-0.01em] text-white">{SITE_NAME}</span>
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map(([href, label]) => (
            <Link
              key={label}
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={`text-[13.5px] transition-colors ${isActive(href) ? "font-medium text-white" : "text-zinc-400 hover:text-white"}`}
            >
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
          <button
            type="button"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
            onClick={() => setOpen((v) => !v)}
            className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 text-zinc-300 md:hidden"
          >
            {open ? <X size={17} /> : <Menu size={17} />}
          </button>
        </div>
      </div>

      {/* mobile menu */}
      <AnimatePresence initial={false}>
        {open && (
          <motion.nav
            key="mobile-menu"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
            className="overflow-hidden border-t border-white/10 bg-[#09090b]/95 backdrop-blur-md md:hidden"
          >
            <div className="px-6 py-3">
              {LINKS.map(([href, label]) => (
                <Link
                  key={label}
                  href={href}
                  onClick={() => setOpen(false)}
                  aria-current={isActive(href) ? "page" : undefined}
                  className={`block rounded-lg px-2 py-2.5 text-[15px] font-medium hover:bg-white/5 hover:text-white ${isActive(href) ? "bg-white/5 text-white" : "text-zinc-300"}`}
                >
                  {label}
                </Link>
              ))}
            </div>
          </motion.nav>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
