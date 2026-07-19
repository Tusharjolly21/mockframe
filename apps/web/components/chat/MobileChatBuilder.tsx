"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeftRight, Download, Loader2, Monitor, Plus, Trash2 } from "lucide-react";
import { SceneRenderer } from "@framekit/renderer";
import type { MockupLayer, SceneDocument } from "@framekit/scene";
import { resolveAsset } from "@/lib/assets";
import { buildScreenScene } from "@/lib/deviceScene";
import { encodeScreenAsset } from "@/lib/screens";
import { defaultScreenDoc, type ChatMessage, type ScreenApp } from "@/lib/screens/types";
import { BrandMark } from "@/components/marketing/BrandMark";

const APPS: { id: ScreenApp; label: string }[] = [
  { id: "whatsapp", label: "WhatsApp" },
  { id: "imessage", label: "iMessage" },
];

const STARTER: ChatMessage[] = [
  { from: "them", text: "hey, did you see this? 👀" },
  { from: "me", text: "no?? send it" },
  { from: "them", text: "made this chat in my browser 😂" },
];

/** Phone-friendly single-column chat maker: type → live preview → download.
 *  WhatsApp + iMessage only (the free apps), so the download is truly free. */
export function MobileChatBuilder() {
  const [app, setApp] = useState<ScreenApp>("whatsapp");
  const [contact, setContact] = useState("Alex");
  const [messages, setMessages] = useState<ChatMessage[]>(STARTER);
  const [saving, setSaving] = useState(false);
  const previewRef = useRef<HTMLDivElement>(null);

  const scene: SceneDocument | null = useMemo(() => {
    const s = buildScreenScene(app);
    if (!s) return null;
    const layer = s.layers.find((l): l is MockupLayer => l.type === "mockup");
    if (layer?.media) {
      const doc = { ...defaultScreenDoc(app), contact, messages } as Parameters<typeof encodeScreenAsset>[0];
      layer.media.assetId = encodeScreenAsset(doc);
    }
    return s;
  }, [app, contact, messages]);

  const download = async () => {
    const node = previewRef.current;
    if (!node || !scene) return;
    setSaving(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(node, { pixelRatio: Math.min(3, 1600 / node.clientWidth) });
      const a = document.createElement("a");
      a.href = dataUrl;
      a.download = `mockframe-${app}-chat.png`;
      a.click();
      window.dispatchEvent(new CustomEvent("framekit:export-done"));
    } finally {
      setSaving(false);
    }
  };

  const scale = 0.28; // 1080-wide canvas → ~300px preview column

  return (
    <main className="min-h-dvh bg-[#0b0b0e] pb-28 text-white">
      <header className="flex items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2">
          <BrandMark size={24} />
          <span className="text-[14px] font-semibold">MockFrame</span>
        </Link>
        <Link href="/editor" className="hidden items-center gap-1.5 text-[12px] text-zinc-400 sm:inline-flex">
          <Monitor size={13} /> Full editor (desktop)
        </Link>
      </header>

      {/* app switcher */}
      <div className="flex gap-2 px-4 pt-1">
        {APPS.map((a) => (
          <button
            key={a.id}
            onClick={() => setApp(a.id)}
            className={`rounded-full px-4 py-1.5 text-[12.5px] font-semibold ${app === a.id ? "bg-white text-zinc-900" : "bg-white/10 text-zinc-300"}`}
          >
            {a.label}
          </button>
        ))}
      </div>

      {/* live preview */}
      <div className="mt-4 flex justify-center px-4">
        {scene && (
          <div style={{ width: scene.canvas.width * scale, height: scene.canvas.height * scale, overflow: "hidden", borderRadius: 18 }} className="shadow-[0_24px_70px_rgba(0,0,0,0.55)]">
            <div ref={previewRef} style={{ transform: `scale(${scale})`, transformOrigin: "0 0", width: scene.canvas.width, height: scene.canvas.height }}>
              <SceneRenderer scene={scene} resolveAsset={resolveAsset} />
            </div>
          </div>
        )}
      </div>

      {/* composer */}
      <section className="mx-auto mt-5 max-w-md space-y-3 px-4">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Contact name</span>
          <input
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            maxLength={30}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-3.5 py-2.5 text-[14px] outline-none focus:border-violet-400"
          />
        </label>

        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wide text-zinc-500">Messages</span>
        {messages.map((m, i) => (
          <div key={i} className="flex items-start gap-2">
            <button
              onClick={() => setMessages((list) => list.map((x, j) => (j === i ? { ...x, from: x.from === "me" ? "them" : "me" } : x)))}
              title="Switch side"
              className={`mt-1 grid h-9 w-14 shrink-0 place-items-center gap-0.5 rounded-lg text-[9px] font-bold uppercase ${m.from === "me" ? "bg-emerald-500/20 text-emerald-300" : "bg-white/10 text-zinc-400"}`}
            >
              <ArrowLeftRight size={11} />
              {m.from === "me" ? "You" : contact.split(" ")[0] || "Them"}
            </button>
            <textarea
              value={m.text}
              rows={1}
              onChange={(e) => setMessages((list) => list.map((x, j) => (j === i ? { ...x, text: e.target.value } : x)))}
              className="min-h-10 flex-1 resize-y rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-[14px] leading-5 outline-none focus:border-violet-400"
            />
            <button onClick={() => setMessages((list) => list.filter((_, j) => j !== i))} title="Delete" className="mt-1.5 p-1.5 text-zinc-600 hover:text-rose-400">
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        <button
          onClick={() => setMessages((list) => [...list, { from: list.at(-1)?.from === "me" ? "them" : "me", text: "" }])}
          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-white/20 px-3 py-2 text-[12.5px] font-semibold text-zinc-300"
        >
          <Plus size={14} /> Add message
        </button>

        <p className="pt-1 text-center text-[11px] leading-5 text-zinc-600">
          Free download, no watermark, no sign-up. Want more apps, video export and devices?{" "}
          <Link href="/editor" className="text-violet-300">Open the full editor</Link> on desktop.
        </p>
      </section>

      {/* sticky download */}
      <div className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-[#0b0b0e]/95 p-3 backdrop-blur">
        <button
          onClick={download}
          disabled={saving || !messages.some((m) => m.text.trim())}
          className="mx-auto flex w-full max-w-md items-center justify-center gap-2 rounded-xl bg-white py-3 text-[14px] font-semibold text-zinc-900 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
          Download image
        </button>
      </div>
    </main>
  );
}
