import { useEffect, useState } from "react";
import { continueRender, delayRender } from "remotion";
import { getDevice } from "@framekit/devices";
import { MockupLayerView, type ResolvedAsset } from "@framekit/renderer";
import { DEFAULT_SHADOW, IDENTITY_TRANSFORM, type MockupLayer } from "@framekit/scene";
import type { PromoScreenshot } from "../../../lib/promo/inputProps";

/**
 * Preload the screenshots so the server render never captures a frame before an
 * image has decoded. MockupLayerView uses a plain SVG <image>, which (unlike
 * Remotion's <Img>) doesn't participate in delayRender — so we gate here.
 */
export function usePreloadScreenshots(urls: string[]) {
  const [handle] = useState(() => delayRender(`promo: load ${urls.length} screenshot(s)`));
  useEffect(() => {
    if (urls.length === 0) {
      continueRender(handle);
      return;
    }
    let done = 0;
    const bump = () => {
      done += 1;
      if (done >= urls.length) continueRender(handle);
    };
    const imgs = urls.map((u) => {
      const img = new Image();
      img.onload = bump;
      img.onerror = bump;
      img.src = u;
      return img;
    });
    return () => imgs.forEach((i) => (i.onload = i.onerror = null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/**
 * Renders one of the app's REAL device frames (the same accurate SVG frames the
 * /mockups pages use) with a screenshot composited into the screen, wrapped in a
 * 3D transform so a composition can tilt/turn/scale the whole framed device as a
 * rigid unit. This replaces the old hand-drawn CSS phone.
 */
export const RealDeviceFrame: React.FC<{
  deviceId: string;
  width: number;
  screenshot: PromoScreenshot;
  variant?: string;
  rotateX?: number;
  rotateY?: number;
  rotateZ?: number;
  scale?: number;
  perspective?: number;
  /** zoom the screenshot inside the screen (media scale), e.g. 1.15 for scroll room */
  zoom?: number;
  /** pan the screenshot vertically, as a ratio of screen height (−0.5..0.5) — a scroll */
  panY?: number;
  /** extra CSS (e.g. a drop-shadow filter) on the 3D wrapper */
  style?: React.CSSProperties;
}> = ({ deviceId, width, screenshot, variant, rotateX = 0, rotateY = 0, rotateZ = 0, scale = 1, perspective = 2600, zoom = 1, panY = 0, style }) => {
  const device = getDevice(deviceId) ?? getDevice("iphone-16-pro");
  if (!device) return null;

  const frameW = device.plate?.width ?? device.frame.width;
  const frameH = device.plate?.height ?? device.frame.height;
  const s = width / frameW;
  const offsetY = panY * device.frame.screenRect.height;

  const layer: MockupLayer = {
    type: "mockup",
    id: `promo-${deviceId}`,
    deviceId: device.id,
    frameVariant: variant,
    media: { assetId: "shot", kind: "image", fit: "cover", offsetX: 0, offsetY, scale: zoom },
    transform: { ...IDENTITY_TRANSFORM },
    shadow: { ...DEFAULT_SHADOW, opacity: 0.55, softness: 90, distance: 46 },
  };

  const resolveAsset = (id: string): ResolvedAsset | undefined =>
    id === "shot" ? { url: screenshot.url, width: screenshot.width, height: screenshot.height } : undefined;

  return (
    <div style={{ perspective, ...style }}>
      <div style={{ transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`, transformStyle: "preserve-3d" }}>
        <div style={{ width, height: frameH * s }}>
          <div style={{ transform: `scale(${s})`, transformOrigin: "0 0", width: frameW }}>
            <MockupLayerView layer={layer} resolveAsset={resolveAsset} />
          </div>
        </div>
      </div>
    </div>
  );
};
