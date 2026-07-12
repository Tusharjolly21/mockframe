"use client";

import type { CSSProperties } from "react";
import { getDevice, previewDataUri } from "@framekit/devices";
import type { MockupLayer, SceneDocument } from "@framekit/scene";

function backgroundStyle(scene: SceneDocument): CSSProperties {
  const bg = scene.canvas.background;
  if (bg.type === "solid") return { background: bg.color };
  if (bg.type === "transparent") return { background: "repeating-conic-gradient(#edf0f5 0 25%, #f8f9fb 0 50%) 0 / 16px 16px" };
  if (bg.type === "linear-gradient") {
    return { background: `linear-gradient(${bg.angle}deg, ${bg.stops.map((s) => `${s.color} ${Math.round(s.at * 100)}%`).join(", ")})` };
  }
  if (bg.type === "radial-gradient") {
    return { background: `radial-gradient(circle at ${bg.cx * 100}% ${bg.cy * 100}%, ${bg.stops.map((s) => `${s.color} ${Math.round(s.at * 100)}%`).join(", ")})` };
  }
  if (bg.type === "mesh-gradient") {
    return { background: `linear-gradient(135deg, ${bg.colors.join(", ")})` };
  }
  return { background: "#e9edf5" };
}

/** Cheap gallery-only scene thumbnail. The full SceneRenderer remains reserved
 * for the main canvas and export path, so galleries cannot block editor startup. */
export function StaticScenePreview({ scene, className }: { scene: SceneDocument; className?: string }) {
  const canvasWidth = scene.canvas.width;
  const canvasHeight = scene.canvas.height;
  const mockups = scene.layers.filter((layer): layer is MockupLayer => layer.type === "mockup");
  return (
    <div className={`relative overflow-hidden ${className ?? ""}`} style={{ ...backgroundStyle(scene), aspectRatio: `${canvasWidth} / ${canvasHeight}` }}>
      <div aria-hidden="true" className="absolute inset-0">
        {mockups.map((layer) => {
          const device = layer.deviceId ? getDevice(layer.deviceId) : undefined;
          if (!device) {
            return <div key={layer.id} className="absolute rounded-xl bg-white/85 shadow-lg" style={{ left: `calc(50% + ${(layer.transform.x / canvasWidth) * 100}%)`, top: `calc(50% + ${(layer.transform.y / canvasHeight) * 100}%)`, width: "24%", aspectRatio: "1.5", transform: `translate(-50%, -50%) rotate(${layer.transform.rotate}deg) scale(${layer.transform.scale})` }} />;
          }
          return (
            <img
              key={layer.id}
              src={previewDataUri(device, layer.frameVariant)}
              alt=""
              draggable={false}
              style={{
                position: "absolute",
                left: `calc(50% + ${(layer.transform.x / canvasWidth) * 100}%)`,
                top: `calc(50% + ${(layer.transform.y / canvasHeight) * 100}%)`,
                width: `${(device.frame.width / canvasWidth) * 100}%`,
                height: "auto",
                maxWidth: "none",
                transform: `translate(-50%, -50%) rotate(${layer.transform.rotate}deg) scale(${layer.transform.scale})`,
                transformOrigin: "center",
                zIndex: Math.round(layer.transform.y),
                filter: layer.shadow ? "drop-shadow(0 24px 22px rgba(20,20,40,0.3))" : undefined,
              }}
            />
          );
        })}
      </div>
    </div>
  );
}
