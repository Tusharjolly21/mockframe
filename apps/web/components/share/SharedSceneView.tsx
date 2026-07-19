"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SceneRenderer } from "@framekit/renderer";
import type { SceneDocument } from "@framekit/scene";
import { resolveAsset, restoreAssets, type GuestAsset } from "@/lib/assets";

/** Read-only, scaled-to-fit render of a shared scene. Hydrates the asset
 *  registry from the share doc's hosted URLs, then uses the app's normal
 *  resolver (which also handles builtin: and screen: assets). */
export function SharedSceneView({ scene, assets }: { scene: SceneDocument; assets: GuestAsset[] }) {
  const [ready, setReady] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    restoreAssets(assets);
    setReady(true);
  }, [assets]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const fit = () => setScale(Math.min(el.clientWidth / scene.canvas.width, el.clientHeight / scene.canvas.height, 1));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, [scene.canvas.width, scene.canvas.height]);

  const dims = useMemo(
    () => ({ width: scene.canvas.width * scale, height: scene.canvas.height * scale }),
    [scene.canvas.width, scene.canvas.height, scale],
  );

  return (
    <div ref={wrapRef} className="flex h-full w-full items-center justify-center">
      {ready && (
        <div style={{ width: dims.width, height: dims.height, overflow: "hidden", borderRadius: 12 }} className="shadow-[0_30px_90px_rgba(0,0,0,0.45)]">
          <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0", width: scene.canvas.width, height: scene.canvas.height }}>
            <SceneRenderer scene={scene} resolveAsset={resolveAsset} />
          </div>
        </div>
      )}
    </div>
  );
}
