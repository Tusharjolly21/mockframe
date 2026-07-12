"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { SceneDocument } from "@framekit/scene";
import { useSceneStore, useViewStore } from "@/lib/store";
import { applyVariation, VARIATIONS } from "@/lib/variations";
import { StaticScenePreview } from "./StaticScenePreview";

/**
 * Left thumbnail rail (PostSpark's device-mockup editor): every variation is a
 * LIVE preview of the current scene re-staged — counts, angles, blank-frame
 * pairs. One click restages; your media and styling stay.
 */

function Thumb({ scene }: { scene: SceneDocument }) {
  const ref = useRef<HTMLDivElement>(null);
  const [w, setW] = useState(0);
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ro = new ResizeObserver((e) => setW(e[0].contentRect.width));
    ro.observe(el);
    const io = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      root: el.closest(".panel-scroll"),
      rootMargin: "120px",
    });
    io.observe(el);
    return () => {
      ro.disconnect();
      io.disconnect();
    };
  }, []);
  const s = w / scene.canvas.width;
  return (
    <div ref={ref} className="pointer-events-none w-full overflow-hidden rounded-xl" style={{ height: w ? scene.canvas.height * s : 56 }}>
      {w > 0 && visible && (
        <div style={{ transform: `scale(${s})`, transformOrigin: "0 0", width: scene.canvas.width }}>
          <StaticScenePreview scene={scene} />
        </div>
      )}
    </div>
  );
}

export function VariationsRail() {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const select = useViewStore((s) => s.select);
  const setActiveLayout = useViewStore((s) => s.setActiveLayout);

  const hasMockup = scene.layers.some((l) => l.type === "mockup");
  const previews = useMemo(() => hasMockup ? VARIATIONS.map((v) => ({ variation: v, scene: applyVariation(scene, v) })) : [], [scene, hasMockup]);
  if (!hasMockup) return null;

  return (
    <div className="fk-card panel-scroll pointer-events-auto flex max-h-full w-[118px] flex-col gap-2 overflow-y-auto rounded-2xl p-2">
      {previews.map(({ variation: v, scene: preview }) => {
        return (
          <button
            key={v.id}
            title={v.label}
            onClick={() => {
              setScene((s) => applyVariation(s, v));
              setActiveLayout(v.presetId);
              select(null);
            }}
            className="fk-tile shrink-0 cursor-pointer rounded-xl border border-[#ececf2] bg-white p-1 hover:border-[#17171c]"
          >
            <Thumb scene={preview} />
          </button>
        );
      })}
    </div>
  );
}
