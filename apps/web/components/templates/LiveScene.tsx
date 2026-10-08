"use client";

import { useEffect, useRef, useState } from "react";
import { SceneRenderer } from "@framekit/renderer";
import type { SceneDocument } from "@framekit/scene";
import { resolveAsset } from "@/lib/assets";
import { ensureGoogleFont } from "@/lib/fonts";

/**
 * A template rendered live (instead of its stored preview image), scaled to
 * fit its box. It mounts once it's near the viewport, so a long gallery
 * doesn't render every scene up front.
 */
export function LiveScene({
  scene,
  label,
  className = "",
  frameClassName = "",
}: {
  scene: SceneDocument;
  label: string;
  className?: string;
  /** classes for the scaled scene box (rounding, shadow) */
  frameClassName?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [near, setNear] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const size = () => setBox({ w: el.clientWidth, h: el.clientHeight });
    size();
    const ro = new ResizeObserver(size);
    ro.observe(el);
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNear(true);
          io.disconnect();
        }
      },
      { rootMargin: "600px 0px" }
    );
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);

  useEffect(() => {
    for (const layer of scene.layers) if (layer.type === "text") void ensureGoogleFont(layer.font.family);
  }, [scene]);

  const { width: W, height: H } = scene.canvas;
  const s = box ? Math.min(box.w / W, box.h / H) : 0;
  return (
    <div ref={ref} role="img" aria-label={label} className={`pointer-events-none relative ${className}`}>
      {near && s > 0 && (
        <div
          className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 overflow-hidden ${frameClassName}`}
          style={{ width: Math.round(W * s), height: Math.round(H * s) }}
        >
          <div style={{ width: W, height: H, transform: `scale(${s})`, transformOrigin: "0 0" }}>
            <SceneRenderer scene={scene} resolveAsset={resolveAsset} />
          </div>
        </div>
      )}
    </div>
  );
}
