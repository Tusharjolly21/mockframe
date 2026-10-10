"use client";

import { useEffect, useRef, useState } from "react";
import { getDevice } from "@framekit/devices";
import type { MockupLayer, SceneDocument } from "@framekit/scene";
import { resolveAsset } from "@/lib/assets";
import { backgroundStyle } from "./StaticScenePreview";

/**
 * A clean schematic of a layout: the scene's own backdrop with a plain device
 * silhouette per screen, placed, turned and tilted exactly as the layout does.
 * Once a screenshot is set it shows that screenshot on each screen; until then
 * the screens stay blank instead of faking content at odd angles.
 */
export function LayoutSketch({ scene, base, className = "" }: { scene: SceneDocument; /** the scene before the layout, so empty frameless screens keep their relative size */ base?: SceneDocument; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [k, setK] = useState(0.1);
  const { width: W, height: H } = scene.canvas;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => setK(el.clientWidth / W || 0.1);
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [W]);

  const mockups = scene.layers.filter((l): l is MockupLayer => l.type === "mockup");
  return (
    <div ref={ref} className={`relative overflow-hidden ${className}`} style={{ ...backgroundStyle(scene), aspectRatio: `${W} / ${H}` }} aria-hidden>
      {/* zoom, not transform: scale — the tilted silhouettes would otherwise be composited at full canvas size */}
      <div style={{ position: "absolute", left: 0, top: 0, width: W, height: H, zoom: k }}>
        {mockups.map((layer) => (
          <Silhouette key={layer.id} layer={layer} canvasH={H} refScale={(base?.layers.find((l) => l.id === layer.id) ?? base?.layers.find((l) => l.type === "mockup"))?.transform.scale} />
        ))}
      </div>
    </div>
  );
}

function Silhouette({ layer, canvasH, refScale }: { layer: MockupLayer; canvasH: number; refScale?: number }) {
  const device = layer.deviceId ? getDevice(layer.deviceId) : undefined;
  const t = layer.transform;
  const shot = layer.media ? resolveAsset(layer.media.assetId) : undefined;
  const turned = layer.orientation === "landscape" && !!device && device.frame.height > device.frame.width;
  // a frameless layer with nothing in it has no size of its own: draw a phone-shaped
  // panel at 78% of the canvas height and let the layout's relative scale act on that
  const blank = !device && !shot;
  const fh = device ? (turned ? device.frame.width : device.frame.height) : shot?.height ?? canvasH * 0.78;
  const fw = device ? (turned ? device.frame.height : device.frame.width) : shot?.width ?? fh * 0.46;
  const effScale = blank ? (refScale ? t.scale / refScale : 1) : t.scale;
  const screen = device && !turned ? device.frame.screenRect : { x: 0, y: 0, width: fw, height: fh };
  const phone = device?.category === "phone" || device?.category === "tablet" || (!device && fh >= fw);
  const radius = Math.min(fw, fh) * (phone ? 0.12 : 0.03);
  const inset = (n: number, whole: number) => `${(n / whole) * 100}%`;
  // photo scenes and bodies we can't draw faithfully read as a plain panel
  const plain = !device || !!device.plate;
  const transform = `translate(-50%, -50%) translate(${t.x}px, ${t.y}px) perspective(${t.perspective || 2000}px) rotate(${t.rotate}deg) rotateX(${t.tiltX}deg) rotateY(${t.tiltY}deg) scale(${effScale})`;
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        width: fw,
        height: fh,
        transform,
        borderRadius: radius,
        background: plain ? "rgba(255,255,255,0.18)" : "linear-gradient(145deg,#3a3a42,#17171c 55%)",
        boxShadow: plain ? "0 0 0 6px rgba(255,255,255,0.35)" : "0 40px 60px -20px rgba(10,10,30,0.45), inset 0 0 0 4px rgba(255,255,255,0.12)",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: inset(screen.x, fw),
          top: inset(screen.y, fh),
          width: inset(screen.width, fw),
          height: inset(screen.height, fh),
          borderRadius: radius * 0.8,
          overflow: "hidden",
          background: shot ? "#000" : "linear-gradient(160deg,#ffffff,#eceef5)",
        }}
      >
        {shot && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={shot.url} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: "top" }} />
        )}
        {!shot && phone && !plain && <span style={{ position: "absolute", left: "50%", top: "2.4%", width: "28%", height: "2.6%", transform: "translateX(-50%)", borderRadius: 999, background: "#17171c" }} />}
      </div>
    </div>
  );
}
