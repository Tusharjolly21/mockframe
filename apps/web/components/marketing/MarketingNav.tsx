"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, Code2, Figma, LayoutTemplate, Menu, Rocket, Smartphone, Sparkles, Store, Video, Wrench, X, type LucideIcon } from "lucide-react";
import { BrandMark } from "./BrandMark";
import { useAuth } from "@/lib/auth";
import { SITE_NAME } from "@/lib/site";

type NavItem = [href: string, label: string, blurb: string, Icon: LucideIcon];

/** Product surfaces, grouped so the menu reads in two short columns instead of one long list. */
const PRODUCT_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: "Create",
    items: [
      ["/mockups", "Mockups", "Device and browser frames", Smartphone],
      ["/app-store-screenshots", "Store screenshots", "App Store and Google Play packs", Store],
      ["/ai", "AI generator", "Describe your app, get the pack", Sparkles],
      ["/templates", "Templates", "Scenes to start from", LayoutTemplate],
    ],
  },
  {
    title: "More",
    items: [
      ["/screen-recorder", "Screen recorder", "Recordings that zoom in", Video],
      ["/launch-kit", "Launch kit", "Every launch asset at once", Rocket],
      ["/tools", "Tools", "Chat, capture and social", Wrench],
      ["/figma-plugin", "Figma plugin", "Frames straight into mockups", Figma],
      ["/developers/api", "API and MCP", "Mockups from code or Claude", Code2],
    ],
  },
];
const PRODUCT_LINKS = PRODUCT_GROUPS.flatMap((g) => g.items);

const FLAT_LINKS: [href: string, label: string][] = [
  ["/guides", "Guides"],
  ["/pricing", "Pricing"],
];

/** Signed in: your avatar, linking to /account. Signed out: a quiet "Sign in". */
function NavAccount() {
  const { account, loading, configured } = useAuth();
  if (!configured || loading) return null;
  if (!account) {
    return (
      <Link href="/account" className="hidden text-[13.5px] text-zinc-400 transition-colors hover:text-white sm:block">
        Sign in
      </Link>
    );
  }
  const initial = (account.name || account.email || "?").trim().charAt(0).toUpperCase();
  return (
    <Link
      href="/account"
      aria-label="Your account"
      title={account.name || account.email || "Your account"}
      className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-violet-600 to-cyan-500 text-[13px] font-semibold text-white ring-1 ring-white/20 hover:ring-white/50"
    >
      {account.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={account.photo} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        initial
      )}
    </Link>
  );
}

/** Fixed, blurred dark nav for the marketing pages — with a mobile menu. */
export function MarketingNav() {
  const [open, setOpen] = useState(false);
  const [productOpen, setProductOpen] = useState(false);
  const productRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");
  const productActive = PRODUCT_LINKS.some(([href]) => isActive(href));

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
                  className="absolute left-1/2 top-full mt-3 w-[600px] -translate-x-1/2 overflow-hidden rounded-2xl border border-white/10 bg-[#101014] shadow-2xl"
                >
                  <div className="grid grid-cols-2 gap-x-2 p-3">
                    {PRODUCT_GROUPS.map((group) => (
                      <div key={group.title}>
                        <p className="px-3 pb-1.5 pt-1 text-[12px] font-medium text-zinc-500">{group.title}</p>
                        {group.items.map(([href, label, blurb, Icon]) => (
                          <Link
                            key={href}
                            href={href}
                            role="menuitem"
                            onClick={() => setProductOpen(false)}
                            aria-current={isActive(href) ? "page" : undefined}
                            className={`group flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors hover:bg-white/5 ${isActive(href) ? "bg-white/5" : ""}`}
                          >
                            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-white/[0.06] text-zinc-300 transition-colors group-hover:bg-white/10 group-hover:text-white">
                              <Icon size={16} strokeWidth={1.8} />
                            </span>
                            <span className="min-w-0">
                              <span className={`block text-[13.5px] font-medium ${isActive(href) ? "text-white" : "text-zinc-100"}`}>{label}</span>
                              <span className="block truncate text-[12px] text-zinc-500">{blurb}</span>
                            </span>
                          </Link>
                        ))}
                      </div>
                    ))}
                  </div>
                  <Link
                    href="/editor"
                    role="menuitem"
                    onClick={() => setProductOpen(false)}
                    className="flex items-center justify-between border-t border-white/10 bg-white/[0.03] px-6 py-3 text-[13px] text-zinc-300 transition-colors hover:text-white"
                  >
                    <span>Open the editor and start free</span>
                    <span aria-hidden>→</span>
                  </Link>
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
          <NavAccount />
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
              {PRODUCT_GROUPS.map((group) => (
                <div key={group.title}>
                  <p className="px-2 pb-1 pt-3 text-[12px] font-medium text-zinc-500">{group.title}</p>
                  {group.items.map(([href, label]) => (
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
              ))}
              <p className="px-2 pb-1 pt-3 text-[12px] font-medium text-zinc-500">Learn more</p>
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
