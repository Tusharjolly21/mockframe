"use client";

import { useState } from "react";
import {
  PACK_LAUNCH_SURFACE_IDS,
  PACK_LAUNCH_SURFACES,
  PACK_STYLE_IDS,
  PACK_TARGET_IDS,
  PACK_TARGETS,
  packLaunch,
} from "@/lib/pack/schema";
import { setCaption, applyCaptions } from "@/lib/pack/ops";
import { usePackStore } from "@/lib/pack/store";
import { firebaseFetch } from "@/lib/firebaseClient";
import { LaunchCopyPanel } from "@/components/ai/LaunchCopyPanel";
import { StyleThumb } from "@/components/pack/StyleThumb";

const FONTS = ["Inter", "Georgia", "system-ui"] as const;

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="border-b border-white/10 px-4 py-4">
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-wider text-white/40">{title}</h3>
      {children}
    </section>
  );
}

/** Right rail: style gallery, captions for the active screen, brand + targets. */
export function PackInspector() {
  const { pack, activeScreenId, update } = usePackStore();
  const screen = pack.screens.find((s) => s.id === activeScreenId) ?? pack.screens[0];
  const cap = screen.captions.en ?? { title: "" };
  const [recaptionBusy, setRecaptionBusy] = useState(false);
  const [recaptionError, setRecaptionError] = useState<string | null>(null);

  async function regenerateCaptions() {
    if (!pack.source || recaptionBusy) return;
    setRecaptionBusy(true);
    setRecaptionError(null);
    try {
      const res = await firebaseFetch("/api/ai-pack", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "recaption",
          appName: pack.appName,
          description: pack.source.description,
          tone: pack.source.tone,
          audience: pack.source.audience,
          screens: pack.screens.map((s) => ({ currentTitle: s.captions.en?.title?.slice(0, 120) })),
        }),
      });
      if (res.status === 401) {
        setRecaptionError("Sign in to regenerate");
        return;
      }
      if (res.status === 429) {
        setRecaptionError("Daily limit reached");
        return;
      }
      if (!res.ok) {
        setRecaptionError("Couldn't regenerate — try again");
        return;
      }
      const { captions } = await res.json();
      update((p) => applyCaptions(p, captions));
    } catch {
      setRecaptionError("Couldn't regenerate — try again");
    } finally {
      setRecaptionBusy(false);
    }
  }

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-l border-white/10 bg-[#101014] text-sm text-white/85">
      <Section title="Style">
        <div className="grid grid-cols-2 gap-2">
          {PACK_STYLE_IDS.map((id) => (
            <StyleThumb
              key={id}
              pack={pack}
              styleId={id}
              active={pack.styleId === id}
              onClick={() => update((p) => ({ ...p, styleId: id }))}
            />
          ))}
        </div>
      </Section>

      <Section title={`Caption · screen ${String(pack.screens.indexOf(screen) + 1).padStart(2, "0")}`}>
        <input
          value={cap.title}
          onChange={(e) => update((p) => setCaption(p, screen.id, e.target.value, cap.subtitle ?? ""))}
          placeholder="Headline, e.g. Plan your day"
          className="mb-2 w-full rounded-md border border-white/10 bg-black/30 px-2.5 py-1.5 outline-none focus:border-violet-500"
        />
        <input
          value={cap.subtitle ?? ""}
          onChange={(e) => update((p) => setCaption(p, screen.id, cap.title, e.target.value))}
          placeholder="Optional subtitle"
          className="w-full rounded-md border border-white/10 bg-black/30 px-2.5 py-1.5 outline-none focus:border-violet-500"
        />
        <div className="mt-3 flex gap-4 text-[12px] text-white/60">
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={!!screen.overrides.hideDevice}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  screens: p.screens.map((s) =>
                    s.id === screen.id ? { ...s, overrides: { ...s.overrides, hideDevice: e.target.checked } } : s
                  ),
                }))
              }
            />
            Hide device
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="checkbox"
              checked={!!screen.overrides.flipTilt}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  screens: p.screens.map((s) =>
                    s.id === screen.id ? { ...s, overrides: { ...s.overrides, flipTilt: e.target.checked } } : s
                  ),
                }))
              }
            />
            Flip tilt
          </label>
        </div>
        {pack.source && (
          <div className="mt-3">
            <button
              onClick={regenerateCaptions}
              disabled={recaptionBusy}
              className="w-full rounded-md border border-white/10 bg-black/30 px-2.5 py-1.5 text-[12px] text-white/70 transition hover:border-white/25 disabled:opacity-50"
            >
              {recaptionBusy ? "Regenerating…" : "Regenerate captions"}
            </button>
            {recaptionError && <p className="mt-1.5 text-[11px] text-red-400">{recaptionError}</p>}
          </div>
        )}
      </Section>

      <Section title="Brand">
        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-[12px] text-white/60">
            Accent
            <input
              type="color"
              value={pack.style.accent}
              onChange={(e) => update((p) => ({ ...p, style: { ...p.style, accent: e.target.value } }))}
              className="h-7 w-9 cursor-pointer rounded border border-white/10 bg-transparent"
            />
          </label>
          <select
            value={pack.style.fontFamily}
            onChange={(e) => update((p) => ({ ...p, style: { ...p.style, fontFamily: e.target.value } }))}
            className="flex-1 rounded-md border border-white/10 bg-black/30 px-2 py-1.5 text-[12px]"
          >
            {FONTS.map((f) => (
              <option key={f} value={f}>{f}</option>
            ))}
          </select>
        </div>
        <div className="mt-3 flex gap-1 rounded-lg bg-black/30 p-1 text-[12px]">
          {(["top", "bottom"] as const).map((pos) => (
            <button
              key={pos}
              onClick={() => update((p) => ({ ...p, style: { ...p.style, captionPosition: pos } }))}
              className={`flex-1 rounded-md py-1 capitalize transition ${
                pack.style.captionPosition === pos ? "bg-violet-600 text-white" : "text-white/60"
              }`}
            >
              Caption {pos}
            </button>
          ))}
        </div>
      </Section>

      <Section title="Export sizes">
        {PACK_TARGET_IDS.map((id) => (
          <label key={id} className="mb-1.5 flex items-center gap-2 text-[12px] text-white/70">
            <input
              type="checkbox"
              checked={pack.targets[id]}
              onChange={(e) => update((p) => ({ ...p, targets: { ...p.targets, [id]: e.target.checked } }))}
            />
            {PACK_TARGETS[id].label}
            <span className="text-white/35">{PACK_TARGETS[id].width}×{PACK_TARGETS[id].height}</span>
          </label>
        ))}
      </Section>

      <Section title="Launch Kit">
        <input
          value={packLaunch(pack).tagline}
          onChange={(e) =>
            update((p) => ({ ...p, launch: { ...packLaunch(p), tagline: e.target.value.slice(0, 120) } }))
          }
          placeholder="One-line pitch for your launch graphics"
          className="mb-2 w-full rounded-md border border-white/10 bg-black/30 px-2.5 py-1.5 outline-none focus:border-violet-500"
        />
        {PACK_LAUNCH_SURFACE_IDS.map((id) => (
          <label key={id} className="mb-1.5 flex items-center gap-2 text-[12px] text-white/70">
            <input
              type="checkbox"
              checked={packLaunch(pack).surfaces[id]}
              onChange={(e) =>
                update((p) => ({
                  ...p,
                  launch: {
                    ...packLaunch(p),
                    surfaces: { ...packLaunch(p).surfaces, [id]: e.target.checked },
                  },
                }))
              }
            />
            {PACK_LAUNCH_SURFACES[id].label}
            <span className="text-white/35">
              {PACK_LAUNCH_SURFACES[id].width}×{PACK_LAUNCH_SURFACES[id].height}
            </span>
          </label>
        ))}
      </Section>

      {pack.marketing && (
        <Section title="Launch copy">
          <LaunchCopyPanel marketing={pack.marketing} />
        </Section>
      )}
    </aside>
  );
}
