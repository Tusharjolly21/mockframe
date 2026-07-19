"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { Clapperboard, Layers, MessageSquare, Smartphone, Sparkles, Wand2, X } from "lucide-react";
import { ingestFile } from "@/lib/assets";
import { buildScreenScene } from "@/lib/deviceScene";
import type { ScreenApp } from "@/lib/screens/types";
import { placeAsset } from "@/lib/sceneOps";
import { useSceneStore, useViewStore } from "@/lib/store";

const SEEN_KEY = "fk-starter-seen";

/**
 * First-run "What do you want to make?" chooser. The editor hides ~10 products
 * behind icons; this routes new users to the right flow in one click. Shows
 * once (localStorage), never on deep-linked visits, and can be reopened via the
 * `framekit:starter-open` event (LogoChip → Create).
 */
export function StarterModal({ deepLinked, embedded }: { deepLinked: boolean; embedded: boolean }) {
  const [open, setOpen] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const setScene = useSceneStore((s) => s.setScene);
  const select = useViewStore((s) => s.select);
  const bumpAssets = useViewStore((s) => s.bumpAssets);

  useEffect(() => {
    if (embedded || deepLinked) return;
    try {
      if (!localStorage.getItem(SEEN_KEY)) setOpen(true);
    } catch {
      /* storage unavailable */
    }
  }, [embedded, deepLinked]);

  useEffect(() => {
    const openIt = () => setOpen(true);
    window.addEventListener("framekit:starter-open", openIt);
    return () => window.removeEventListener("framekit:starter-open", openIt);
  }, []);

  function dismiss() {
    try {
      localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
  }

  function chooseChat(app: ScreenApp, replay = false) {
    const scene = buildScreenScene(app);
    if (scene) {
      setScene(() => scene);
      select(null);
    }
    dismiss();
    if (replay) setTimeout(() => window.dispatchEvent(new CustomEvent("framekit:animate-open")), 600);
  }

  const TILES: { icon: React.ReactNode; title: string; text: string; badge?: string; onClick: () => void }[] = [
    {
      icon: <Smartphone size={22} />,
      title: "Device mockup",
      text: "Put a screenshot in a real iPhone, Android, iPad or Mac frame.",
      onClick: dismiss, // default scene is already a device
    },
    {
      icon: <Layers size={22} />,
      title: "Beautify a screenshot",
      text: "Backgrounds, gradients, shadows — make any screenshot post-ready.",
      onClick: () => fileRef.current?.click(),
    },
    {
      icon: <MessageSquare size={22} />,
      title: "Chat screen",
      text: "Fake WhatsApp, iMessage, Discord and 12+ more, pixel-accurate.",
      onClick: () => chooseChat("whatsapp"),
    },
    {
      icon: <Clapperboard size={22} />,
      title: "Text message video",
      text: "A conversation that plays out message by message — TikTok-ready.",
      onClick: () => chooseChat("imessage", true),
    },
    {
      icon: <Wand2 size={22} />,
      title: "App promo video",
      badge: "Pro",
      text: "Animated ad from your screenshots for Reels & Facebook.",
      onClick: () => {
        dismiss();
        setTimeout(() => window.dispatchEvent(new CustomEvent("framekit:promo-open")), 250);
      },
    },
    {
      icon: <Sparkles size={22} />,
      title: "App Store screenshots",
      text: "A full store-ready screenshot pack — by hand or from AI.",
      onClick: () => {
        dismiss();
        window.open("/app-store-screenshots", "_blank", "noopener");
      },
    },
  ];

  const ui = (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[75] flex items-center justify-center bg-[#0b0b0e]/70 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) dismiss();
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 6 }}
            transition={{ type: "spring", stiffness: 380, damping: 32 }}
            className="relative w-[min(720px,94vw)] rounded-2xl border border-black/10 bg-white p-7 shadow-[0_40px_120px_rgba(0,0,0,0.35)]"
          >
            <button onClick={dismiss} title="Skip" className="fk-press absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-lg text-[#9a9aa4] hover:bg-black/5 hover:text-[#17171c]">
              <X size={16} />
            </button>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-violet-600">Welcome to MockFrame</p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.02em] text-[#17171c]">What do you want to make?</h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {TILES.map((t) => (
                <button
                  key={t.title}
                  onClick={t.onClick}
                  className="fk-press group flex items-start gap-3 rounded-xl border border-black/10 bg-[#fafafc] p-4 text-left transition-colors hover:border-violet-400 hover:bg-white"
                >
                  <span className="mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#17171c] text-white">{t.icon}</span>
                  <span>
                    <span className="flex items-center gap-2 text-[14px] font-semibold text-[#17171c]">
                      {t.title}
                      {t.badge && <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-violet-700">{t.badge}</span>}
                    </span>
                    <span className="mt-0.5 block text-[12px] leading-5 text-[#6b6b76]">{t.text}</span>
                  </span>
                </button>
              ))}
            </div>
            <p className="mt-4 text-center text-[11.5px] text-[#9a9aa4]">
              Everything is free to try — no sign-up needed. You can switch any time.
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (!f) return;
          const asset = await ingestFile(f);
          bumpAssets();
          const r = placeAsset(useSceneStore.getState().scene, asset, {});
          setScene(() => r.scene);
          select(r.layerId);
          dismiss();
        }}
      />
      {typeof document !== "undefined" ? createPortal(ui, document.body) : null}
    </>
  );
}
