"use client";

import { useMemo } from "react";
import { SceneRenderer } from "@framekit/renderer";
import { resolveAsset } from "@/lib/assets";
import { compilePackScene } from "@/lib/pack/compile";
import type { PackDocument, PackStyleId } from "@/lib/pack/schema";
import { PACK_STYLES, mixHex } from "@/lib/pack/styles";

/** Fixed thumbnail box width in px; the scene is rendered at its native
 *  target width and scaled down to fit, so eight of these can render at
 *  once without eight full-resolution layouts. */
const BOX_WIDTH = 120;

/** One style option in the gallery: a live scaled-down render of the pack's
 *  first screen in that style (or the old flat swatch when there's no
 *  screenshot yet, so the frame isn't empty). */
export function StyleThumb({
  pack,
  styleId,
  active,
  onClick,
}: {
  pack: PackDocument;
  styleId: PackStyleId;
  active: boolean;
  onClick: () => void;
}) {
  const style = PACK_STYLES[styleId];
  const hasScreenshot = !!pack.screens[0]?.assetId;

  const scene = useMemo(() => {
    if (!hasScreenshot) return null;
    return compilePackScene({ ...pack, styleId }, 0, "appstore-69");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    styleId,
    pack.style.accent,
    pack.screens[0]?.assetId,
    pack.style.captionPosition,
    pack.style.fontFamily,
  ]);

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
      onClick={onClick}
      className={`rounded-lg border p-1.5 text-left transition ${
        active ? "border-violet-500" : "border-white/10 hover:border-white/25"
      }`}
    >
      {scene ? (
        <div
          className="mb-1 aspect-[9/19] w-full overflow-hidden rounded-md"
          style={{ width: BOX_WIDTH }}
        >
          <div
            style={{
              width: scene.canvas.width,
              height: scene.canvas.height,
              transform: `scale(${BOX_WIDTH / scene.canvas.width})`,
              transformOrigin: "top left",
            }}
          >
            <SceneRenderer scene={scene} resolveAsset={resolveAsset} />
          </div>
        </div>
      ) : (
        <div className="mb-1 h-10 rounded-md" style={{ background: swatch }} />
      )}
      <span className="text-[11px] text-white/70">{style.label}</span>
    </button>
  );
}
