"use client";

import { getDevice } from "@framekit/devices";
import { MockupLayerView, type ResolvedAsset } from "@framekit/renderer";
import { DEFAULT_SHADOW, IDENTITY_TRANSFORM, type MockupLayer } from "@framekit/scene";

/**
 * Renders one of the app's REAL device frames (iPhone/iPad/MacBook/Watch — the
 * same accurate frames on the /mockups pages) with a screenshot composited into
 * the screen, using the app's own pure renderer (MockupLayerView). Fully static:
 * no store, no context, no upload — the screenshot is a plain image URL resolved
 * synchronously. Size it via the `width` prop; the device scales to fit.
 */
export function DeviceShot({
  deviceId,
  src,
  imgW,
  imgH,
  width,
  variant,
  fit = "cover",
  shadow = true,
  className,
}: {
  deviceId: string;
  src: string;
  imgW: number;
  imgH: number;
  width: number;
  variant?: string;
  fit?: "cover" | "contain" | "fill";
  shadow?: boolean;
  className?: string;
}) {
  const device = getDevice(deviceId);
  if (!device) return null;

  const frameW = device.plate?.width ?? device.frame.width;
  const frameH = device.plate?.height ?? device.frame.height;
  const scale = width / frameW;

  const layer: MockupLayer = {
    type: "mockup",
    id: `shot-${deviceId}`,
    deviceId,
    frameVariant: variant,
    media: { assetId: "shot", kind: "image", fit, offsetX: 0, offsetY: 0, scale: 1 },
    transform: { ...IDENTITY_TRANSFORM },
    shadow: shadow ? { ...DEFAULT_SHADOW, opacity: 0.5, softness: 80, distance: 40 } : null,
  };

  const resolveAsset = (id: string): ResolvedAsset | undefined =>
    id === "shot" ? { url: src, width: imgW, height: imgH } : undefined;

  return (
    <div className={className} style={{ width, height: frameH * scale }}>
      <div style={{ transform: `scale(${scale})`, transformOrigin: "0 0", width: frameW }}>
        <MockupLayerView layer={layer} resolveAsset={resolveAsset} />
      </div>
    </div>
  );
}
