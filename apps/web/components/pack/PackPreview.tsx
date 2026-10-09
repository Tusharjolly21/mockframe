"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SceneRenderer } from "@framekit/renderer";
import { resolveAsset } from "@/lib/assets";
import { ensureGoogleFont, loadCustomFonts } from "@/lib/fonts";
import { compileFeatureGraphic, compileLaunchScene, compilePackScene } from "@/lib/pack/compile";
import {
  PACK_LAUNCH_SURFACE_IDS,
  PACK_LAUNCH_SURFACES,
  PACK_TARGET_IDS,
  PACK_TARGETS,
  packLaunch,
  type LaunchSurfaceId,
  type PackTargetId,
} from "@/lib/pack/schema";
import { SOURCE_LOCALE, storeLocale } from "@/lib/pack/locales";
import { usePackStore } from "@/lib/pack/store";

/** Center pane: live render of the active screen at the active store size. */
export function PackPreview() {
  const { pack, activeScreenId, activeTarget, setActiveTarget, activeLocale, setActiveLocale } = usePackStore();
  const paneRef = useRef<HTMLDivElement>(null);
  const [pane, setPane] = useState({ w: 800, h: 600 });

  // the pack's brand font may be a catalog or uploaded family
  useEffect(() => {
    void loadCustomFonts();
  }, []);
  useEffect(() => {
    void ensureGoogleFont(pack.style.fontFamily);
  }, [pack.style.fontFamily]);

  useEffect(() => {
    const el = paneRef.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setPane({ w: e.contentRect.width, h: e.contentRect.height }));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // if the active tab's target gets disabled (or the store restored one that
  // no longer exists), fall back to the first enabled target instead of
  // rendering a scene for a size the user can't export
  useEffect(() => {
    if (activeTarget.startsWith("launch:")) {
      const surfaceId = activeTarget.slice("launch:".length) as LaunchSurfaceId;
      if (packLaunch(pack).surfaces[surfaceId]) return; // still enabled — leave it alone
    } else if (pack.targets[activeTarget as PackTargetId]) {
      return;
    }
    const anyStoreEnabled = PACK_TARGET_IDS.some((id) => pack.targets[id]);
    if (anyStoreEnabled) {
      setActiveTarget(PACK_TARGET_IDS.find((id) => pack.targets[id]) ?? "appstore-69");
      return;
    }
    // no store target enabled — don't dwell on a disabled launch surface
    // either; hop to the first enabled one if any exists.
    if (activeTarget.startsWith("launch:")) {
      const firstEnabledLaunch = PACK_LAUNCH_SURFACE_IDS.find((id) => packLaunch(pack).surfaces[id]);
      if (firstEnabledLaunch && activeTarget !== `launch:${firstEnabledLaunch}`) {
        setActiveTarget(`launch:${firstEnabledLaunch}`);
      }
      return;
    }
    // nothing enabled at all — don't loop trying to switch
  }, [pack.targets, pack.launch, activeTarget, setActiveTarget]);

  const screenIndex = Math.max(0, pack.screens.findIndex((s) => s.id === activeScreenId));
  const scene = useMemo(() => {
    if (activeTarget.startsWith("launch:")) {
      return compileLaunchScene(pack, activeTarget.slice("launch:".length) as LaunchSurfaceId);
    }
    return activeTarget === "play-feature"
      ? compileFeatureGraphic(pack)
      : compilePackScene(pack, screenIndex, activeTarget as PackTargetId, activeLocale);
  }, [pack, screenIndex, activeTarget, activeLocale]);
  const isLaunch = activeTarget.startsWith("launch:");
  const fit = Math.min(pane.w / scene.canvas.width, pane.h / scene.canvas.height, 1) * 0.92;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex gap-1 overflow-x-auto border-b border-white/10 bg-[#101014] px-4 py-2 [scrollbar-width:none]">
        {PACK_TARGET_IDS.map((id) =>
          pack.targets[id] ? (
            <button
              key={id}
              onClick={() => setActiveTarget(id)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs transition ${
                activeTarget === id ? "bg-violet-600 text-white" : "text-white/60 hover:bg-white/10"
              }`}
            >
              {PACK_TARGETS[id].label}
            </button>
          ) : null
        )}
        {PACK_LAUNCH_SURFACE_IDS.map((id) =>
          packLaunch(pack).surfaces[id] ? (
            <button
              key={`launch:${id}`}
              onClick={() => setActiveTarget(`launch:${id}`)}
              className={`shrink-0 whitespace-nowrap rounded-full px-3 py-1 text-xs transition ${
                activeTarget === `launch:${id}` ? "bg-violet-600 text-white" : "text-white/60 hover:bg-white/10"
              }`}
            >
              {PACK_LAUNCH_SURFACES[id].label}
            </button>
          ) : null
        )}
        {(pack.locales?.length ?? 0) > 0 && (
          <select
            value={activeLocale}
            onChange={(e) => setActiveLocale(e.target.value)}
            aria-label="Preview language"
            className="ml-auto rounded-full border border-white/10 bg-black/30 px-2.5 py-1 text-xs text-white/80 outline-none"
          >
            <option value={SOURCE_LOCALE}>Original</option>
            {(pack.locales ?? []).map((id) => (
              <option key={id} value={id}>{storeLocale(id)?.label ?? id}</option>
            ))}
          </select>
        )}
      </div>
      <div ref={paneRef} className="flex min-h-[56vh] flex-1 items-center justify-center overflow-hidden bg-[#17171c] p-4 md:min-h-0 md:p-6">
        <div
          style={{
            width: scene.canvas.width * fit,
            height: scene.canvas.height * fit,
          }}
        >
          <div style={{ transform: `scale(${fit})`, transformOrigin: "top left" }}>
            <SceneRenderer
              scene={scene}
              resolveAsset={resolveAsset}
              panoramaIdx={isLaunch ? undefined : screenIndex}
              panoramaTotal={isLaunch ? undefined : pack.screens.length}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
