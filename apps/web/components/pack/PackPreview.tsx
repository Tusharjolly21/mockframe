"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SceneRenderer } from "@framekit/renderer";
import { resolveAsset } from "@/lib/assets";
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
import { usePackStore } from "@/lib/pack/store";

/** Center pane: live render of the active screen at the active store size. */
export function PackPreview() {
  const { pack, activeScreenId, activeTarget, setActiveTarget } = usePackStore();
  const paneRef = useRef<HTMLDivElement>(null);
  const [pane, setPane] = useState({ w: 800, h: 600 });

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
    const anyEnabled = PACK_TARGET_IDS.some((id) => pack.targets[id]);
    if (!anyEnabled) return; // nothing enabled — don't loop trying to switch
    setActiveTarget(PACK_TARGET_IDS.find((id) => pack.targets[id]) ?? "appstore-69");
  }, [pack.targets, pack.launch, activeTarget, setActiveTarget]);

  const screenIndex = Math.max(0, pack.screens.findIndex((s) => s.id === activeScreenId));
  const scene = useMemo(() => {
    if (activeTarget.startsWith("launch:")) {
      return compileLaunchScene(pack, activeTarget.slice("launch:".length) as LaunchSurfaceId);
    }
    return activeTarget === "play-feature"
      ? compileFeatureGraphic(pack)
      : compilePackScene(pack, screenIndex, activeTarget as PackTargetId);
  }, [pack, screenIndex, activeTarget]);
  const isLaunch = activeTarget.startsWith("launch:");
  const fit = Math.min(pane.w / scene.canvas.width, pane.h / scene.canvas.height, 1) * 0.92;

  return (
    <div className="flex min-w-0 flex-1 flex-col">
      <div className="flex gap-1 border-b border-white/10 bg-[#101014] px-4 py-2">
        {PACK_TARGET_IDS.map((id) =>
          pack.targets[id] ? (
            <button
              key={id}
              onClick={() => setActiveTarget(id)}
              className={`rounded-full px-3 py-1 text-xs transition ${
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
              className={`rounded-full px-3 py-1 text-xs transition ${
                activeTarget === `launch:${id}` ? "bg-violet-600 text-white" : "text-white/60 hover:bg-white/10"
              }`}
            >
              {PACK_LAUNCH_SURFACES[id].label}
            </button>
          ) : null
        )}
      </div>
      <div ref={paneRef} className="flex flex-1 items-center justify-center overflow-hidden bg-[#17171c] p-6">
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
