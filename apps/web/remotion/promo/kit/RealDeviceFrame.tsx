import { useCallback, useEffect, useMemo, useState } from "react";
import { continueRender, delayRender, getRemotionEnvironment, OffthreadVideo, Video } from "remotion";
import { getDevice, getVariant } from "@framekit/devices";
import { MockupLayerView, type ResolvedAsset } from "@framekit/renderer";
import { DEFAULT_SHADOW, IDENTITY_TRANSFORM, type MockupLayer } from "@framekit/scene";
import type { PromoScreenshot } from "../../../lib/promo/inputProps";

/**
 * Preload the screenshots so the server render never captures a frame before an
 * image has decoded. MockupLayerView uses a plain SVG <image>, which (unlike
 * Remotion's <Img>) doesn't participate in delayRender — so we gate here.
 */
export function usePreloadScreenshots(urls: string[], kinds?: ("image" | "video" | undefined)[]) {
  // videos participate in Remotion delayRender via <OffthreadVideo>/<Video>
  urls = urls.filter((_, i) => (kinds?.[i] ?? "image") === "image");
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
  /** glass-glare strength (0..~0.16). The glare band slides across the screen as
   *  rotateY changes, so turns read as light interaction, not a CSS transform. */
  glare?: number;
  /** extra CSS (e.g. a drop-shadow filter) on the 3D wrapper */
  style?: React.CSSProperties;
}> = ({ deviceId, width, screenshot, variant, rotateX = 0, rotateY = 0, rotateZ = 0, scale = 1, perspective = 2600, zoom = 1, panY = 0, glare = 0, style }) => {
  const device = getDevice(deviceId) ?? getDevice("iphone-16-pro");

  const frameW = device ? device.plate?.width ?? device.frame.width : 1;
  const frameH = device ? device.plate?.height ?? device.frame.height : 1;
  const s = width / frameW;
  const offsetY = device ? panY * device.frame.screenRect.height : 0;

  // Memoize the layer + resolver by VALUE so MockupLayerView's `memo` holds while
  // the composition only tweaks the (cheap) CSS wrapper transform. Without this
  // the heavy device SVG re-rasterizes every frame → the jank the user saw.
  const layer = useMemo<MockupLayer>(
    () => ({
      type: "mockup",
      id: `promo-${device?.id ?? deviceId}`,
      deviceId: device?.id ?? deviceId,
      frameVariant: variant,
      media: { assetId: "shot", kind: "image", fit: "cover", offsetX: 0, offsetY, scale: zoom },
      transform: { ...IDENTITY_TRANSFORM },
      shadow: { ...DEFAULT_SHADOW, opacity: 0.5, softness: 90, distance: 46 },
    }),
    [device?.id, deviceId, variant, offsetY, zoom],
  );

  const BLACK_PIXEL = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
  const isVideoShot = screenshot.kind === "video";
  const resolveAsset = useCallback(
    (id: string): ResolvedAsset | undefined =>
      id === "shot"
        ? isVideoShot
          ? { url: BLACK_PIXEL, width: screenshot.width, height: screenshot.height }
          : { url: screenshot.url, width: screenshot.width, height: screenshot.height }
        : undefined,
    [screenshot.url, screenshot.width, screenshot.height, isVideoShot],
  );

  const isVideo = screenshot.kind === "video";
  // In video mode the SVG screen shows this black pixel; the recording plays in
  // an absolutely-positioned layer clipped to the screen rect above it.
  const videoVariant = device ? getVariant(device, variant) : undefined;
  const overlayMarkup = isVideo ? videoVariant?.overlay : undefined;
  const Vid = getRemotionEnvironment().isRendering ? OffthreadVideo : Video;

  if (!device) return null;

  return (
    <div style={{ perspective, ...style }}>
      <div style={{ transform: `rotateX(${rotateX}deg) rotateY(${rotateY}deg) rotateZ(${rotateZ}deg) scale(${scale})`, transformStyle: "preserve-3d" }}>
        <div style={{ width, height: frameH * s, position: "relative" }}>
          <div style={{ transform: `scale(${s})`, transformOrigin: "0 0", width: frameW }}>
            <MockupLayerView layer={layer} resolveAsset={resolveAsset} />
          </div>
          {isVideo && (
            <>
              {/* the recording, clipped to the screen glass */}
              <div
                style={{
                  position: "absolute",
                  left: device.frame.screenRect.x * s,
                  top: device.frame.screenRect.y * s,
                  width: device.frame.screenRect.width * s,
                  height: device.frame.screenRect.height * s,
                  borderRadius: device.screen.cornerRadius * s,
                  overflow: "hidden",
                  background: "#000",
                }}
              >
                <Vid src={screenshot.url} muted loop style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
              {/* re-draw the notch/island above the video */}
              {overlayMarkup && (
                <svg viewBox={`0 0 ${frameW} ${frameH}`} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none" }}>
                  <g dangerouslySetInnerHTML={{ __html: overlayMarkup }} />
                </svg>
              )}
            </>
          )}
          {glare > 0 && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                borderRadius: width * 0.16,
                overflow: "hidden",
                pointerEvents: "none",
                background: `linear-gradient(105deg, transparent 42%, rgba(255,255,255,${glare}) 50%, transparent 58%)`,
                backgroundSize: "280% 100%",
                backgroundPosition: `${50 - rotateY * 2.2}% 0%`,
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
};
