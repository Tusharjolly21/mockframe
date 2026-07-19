"use client";

import {
  PACK_LAUNCH_SURFACE_IDS,
  PACK_LAUNCH_SURFACES,
  PACK_STYLE_IDS,
  PACK_TARGET_IDS,
  PACK_TARGETS,
  packLaunch,
} from "@/lib/pack/schema";
import { PACK_STYLES, mixHex } from "@/lib/pack/styles";
import { setCaption } from "@/lib/pack/ops";
import { usePackStore } from "@/lib/pack/store";
import { LaunchCopyPanel } from "@/components/ai/LaunchCopyPanel";

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

  return (
    <aside className="w-72 shrink-0 overflow-y-auto border-l border-white/10 bg-[#101014] text-sm text-white/85">
      <Section title="Style">
        <div className="grid grid-cols-2 gap-2">
          {PACK_STYLE_IDS.map((id) => {
            const style = PACK_STYLES[id];
            const bg = style.background(pack.style.accent);
            const swatch =
              bg.type === "solid"
                ? bg.color
                : bg.type === "linear-gradient"
                  ? `linear-gradient(${bg.angle}deg, ${bg.stops.map((s) => `${s.color} ${s.at * 100}%`).join(", ")})`
                  : bg.type === "radial-gradient"
                    ? `radial-gradient(circle at ${bg.cx * 100}% ${bg.cy * 100}%, ${bg.stops.map((s) => `${s.color} ${s.at * 100}%`).join(", ")})`
                    : `linear-gradient(135deg, ${mixHex(pack.style.accent, "#ffffff", 0.3)}, ${mixHex(pack.style.accent, "#000000", 0.5)})`;
            return (
              <button
                key={id}
                onClick={() => update((p) => ({ ...p, styleId: id }))}
                className={`rounded-lg border p-1.5 text-left transition ${
                  pack.styleId === id ? "border-violet-500" : "border-white/10 hover:border-white/25"
                }`}
              >
                <div className="mb-1 h-10 rounded-md" style={{ background: swatch }} />
                <span className="text-[11px] text-white/70">{style.label}</span>
              </button>
            );
          })}
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
