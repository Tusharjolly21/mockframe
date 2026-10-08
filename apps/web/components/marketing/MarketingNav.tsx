"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, GalleryHorizontal, LayoutTemplate, Menu, Puzzle, Rocket, Smartphone, Sparkles, Video, Wrench, X, type LucideIcon } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { SITE_NAME } from "@/lib/site";

/** Product surfaces live in one dropdown so the bar stays uncluttered as
 *  features ship. The three core tools get a line of description; everything
 *  else is a plain, scannable row. */
type Feature = { href: string; label: string; blurb: string; Icon: LucideIcon };
type Shortcut = { href: string; label: string; Icon: LucideIcon };

const FEATURED: Feature[] = [
  { href: "/mockups", label: "Mockups", blurb: "Device and browser frames", Icon: Smartphone },
  { href: "/app-store-screenshots", label: "App Store Screenshots", blurb: "Packs for both stores", Icon: GalleryHorizontal },
  { href: "/screen-recorder", label: "Screen Recorder", blurb: "Recordings that zoom on clicks", Icon: Video },
];

const MORE: Shortcut[] = [
  { href: "/ai", label: "AI Generator", Icon: Sparkles },
  { href: "/launch-kit", label: "Launch Kit", Icon: Rocket },
  { href: "/templates", label: "Templates", Icon: LayoutTemplate },
  { href: "/figma-plugin", label: "Figma Plugin", Icon: Puzzle },
  { href: "/tools", label: "Tools", Icon: Wrench },
];

const PRODUCT_LINKS = [...FEATURED, ...MORE];

const FLAT_LINKS: [href: string, label: string][] = [
  ["/guides", "Guides"],
  ["/pricing", "Pricing"],
];

/** Fixed, blurred dark nav for the marketing pages — with a mobile menu. */
export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const productRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const productActive = PRODUCT_LINKS.some((l) => isActive(l.href));

  // close the dropdown on outside click / Escape
  useEffect(() => {
    if (!productOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!productRef.current?.contains(e.target as Node)) setProductOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setProductOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [productOpen]);

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
          <div ref={productRef} className="relative">
            <button
              type="button"
              aria-expanded={productOpen}
              aria-haspopup="menu"
              onClick={() => setProductOpen((v) => !v)}
              className={`flex items-center gap-1 text-[13.5px] transition-colors ${
                productActive || productOpen ? "font-medium text-white" : "text-zinc-400 hover:text-white"
              }`}
            >
              Product
              <ChevronDown size={13} className={`transition-transform ${productOpen ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {productOpen && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.16, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute left-1/2 top-full mt-3 grid w-[min(35rem,calc(100vw-2rem))] -translate-x-1/2 grid-cols-[1.25fr_1fr] overflow-hidden rounded-2xl border border-white/10 bg-[#101014]/95 shadow-2xl backdrop-blur-md"
                >
                  <div className="p-2">
                    {FEATURED.map(({ href, label, blurb, Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        role="menuitem"
                        onClick={() => setProductOpen(false)}
                        aria-current={isActive(href) ? "page" : undefined}
                        className={`group flex items-center gap-3 rounded-xl px-2.5 py-2.5 outline-none transition-colors hover:bg-white/5 focus-visible:bg-white/5 focus-visible:ring-2 focus-visible:ring-violet-400/60 ${
                          isActive(href) ? "bg-white/5" : ""
                        }`}
                      >
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-white/10 bg-white/[0.04] text-zinc-300 transition-colors group-hover:border-violet-400/40 group-hover:text-violet-300">
                          <Icon size={17} strokeWidth={1.7} />
                        </span>
                        <span className="min-w-0">
                          <span className={`block text-[13.5px] font-medium ${isActive(href) ? "text-white" : "text-zinc-100"}`}>{label}</span>
                          <span className="block truncate text-[12px] text-zinc-500">{blurb}</span>
                        </span>
                      </Link>
                    ))}
                  </div>
                  <div className="border-l border-white/10 bg-white/[0.025] p-2">
                    <p className="px-2.5 pb-1 pt-1.5 text-[12px] text-zinc-500">Speed up your launch</p>
                    {MORE.map(({ href, label, Icon }) => (
                      <Link
                        key={href}
                        href={href}
                        role="menuitem"
                        onClick={() => setProductOpen(false)}
                        aria-current={isActive(href) ? "page" : undefined}
                        className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] outline-none transition-colors hover:bg-white/5 hover:text-white focus-visible:bg-white/5 focus-visible:ring-2 focus-visible:ring-violet-400/60 ${
                          isActive(href) ? "bg-white/5 text-white" : "text-zinc-300"
                        }`}
                      >
                        <Icon size={15} strokeWidth={1.7} className="text-zinc-500" />
                        {label}
                      </Link>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {FLAT_LINKS.map(([href, label]) => (
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
              <p className="px-2 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">Product</p>
              {PRODUCT_LINKS.map(({ href, label }) => (
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
              <p className="px-2 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wider text-zinc-500">More</p>
              {FLAT_LINKS.map(([href, label]) => (
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
