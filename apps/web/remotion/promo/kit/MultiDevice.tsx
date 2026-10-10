import type { FC } from "react";
import { getDevice } from "@framekit/devices";
import type { PromoScreenshot } from "../../../lib/promo/inputProps";
import { interpolate } from "remotion";
import { rgba, screenAt } from "./theme";

/** Fixed companion devices for the multi-device spots. The user's chosen
 *  device stays the phone; these fill the desktop and tablet roles. */
export const LAPTOP_ID = "macbook-pro-14";
export const TABLET_ID = "ipad-pro-13-landscape";

/** Frame height ÷ width for a device (falls back to a phone ratio). */
export function deviceAspect(id: string): number {
  const d = getDevice(id);
  if (!d) return 2.03;
  const w = d.plate?.width ?? d.frame.width;
  const h = d.plate?.height ?? d.frame.height;
  return h / w;
}

/** Screen width ÷ height, used to match screenshots to devices. */
function screenRatio(id: string): number {
  const d = getDevice(id);
  if (!d) return 0.46;
  return d.frame.screenRect.width / d.frame.screenRect.height;
}

/**
 * Pick the screenshot that best fits a device's screen shape, rotating through
 * close matches by `index`. Phones get the tallest shots, laptops the widest,
 * so a mixed upload lands each screen on the device it was captured for. With
 * a single upload every device simply shows that screen (cropped by `cover`).
 */
export function shotFor(screens: PromoScreenshot[], deviceId: string, index = 0): PromoScreenshot {
  const target = screenRatio(deviceId);
  const ranked = [...screens].sort(
    (a, b) => Math.abs(Math.log(a.width / a.height / target)) - Math.abs(Math.log(b.width / b.height / target)),
  );
  // keep only shots in the same orientation family as the best match
  const best = ranked[0];
  const bestLandscape = best.width >= best.height;
  const family = ranked.filter((s) => s.width >= s.height === bestLandscape);
  return screenAt(family, index);
}

/**
 * A soft floor reflection of a device's screen. Instead of re-drawing the whole
 * framed device upside down (a second heavy SVG + photo plate every frame), it
 * mirrors just the screenshot as one image layer — the part of a real
 * reflection the eye actually reads, at a fraction of the cost.
 */
export const ScreenReflection: FC<{
  deviceId: string;
  width: number;
  shot: PromoScreenshot;
  opacity?: number;
  /** how much of the screen height the reflection shows before fading out */
  fade?: number;
  rotateY?: number;
  rotateX?: number;
  scale?: number;
  perspective?: number;
}> = ({ deviceId, width, shot, opacity = 0.2, fade = 0.4, rotateY = 0, rotateX = 0, scale = 1, perspective = 2600 }) => {
  const d = getDevice(deviceId);
  if (!d || opacity <= 0.001 || shot.kind === "video") return null;
  const frameW = d.plate?.width ?? d.frame.width;
  const frameH = d.plate?.height ?? d.frame.height;
  const s = width / frameW;
  const r = d.frame.screenRect;
  const h = r.height * s;
  // the gap between the screen's bottom edge and the frame's bottom edge
  const below = (frameH - r.y - r.height) * s;
  // the mask is applied before the flip, so it fades toward the screen's top
  // edge — which lands farthest from the device once mirrored
  const mask = `linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) ${fade * 100}%)`;
  return (
    <div style={{ position: "absolute", left: 0, top: "100%", width, perspective, pointerEvents: "none" }}>
      <div style={{ transform: `rotateX(${-rotateX}deg) rotateY(${rotateY}deg) scale(${scale})`, transformOrigin: "50% 0%" }}>
        <div
          style={{
            marginLeft: r.x * s,
            marginTop: below,
            width: r.width * s,
            height: h,
            opacity,
            backgroundImage: `url("${shot.url}")`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            transform: "scaleY(-1)",
            borderRadius: d.screen.cornerRadius * s,
            WebkitMaskImage: mask,
            maskImage: mask,
          }}
        />
      </div>
    </div>
  );
};

/** A magnified crop of the screenshot in a floating glass card — the "look
 *  closer" UI callout that pops out of the laptop screen. */
export const ZoomCallout: FC<{ shot: PromoScreenshot; fx: number; fy: number; w: number; h: number; zoom: number; p: number; accent: string }> = ({ shot, fx, fy, w, h, zoom, p, accent }) => {
  if (p <= 0.001 || shot.kind === "video") return null;
  return (
    <div
      style={{
        width: w,
        height: h,
        borderRadius: w * 0.05,
        overflow: "hidden",
        opacity: Math.min(1, p * 1.6),
        transform: `scale(${interpolate(p, [0, 1], [0.6, 1])}) translateY(${interpolate(p, [0, 1], [h * 0.3, 0])}px)`,
        backgroundImage: `url("${shot.url}")`,
        backgroundSize: `${zoom * 100}% auto`,
        backgroundPosition: `${fx * 100}% ${fy * 100}%`,
        backgroundColor: "#111",
        border: "1px solid rgba(255,255,255,0.22)",
        boxShadow: `0 ${w * 0.06}px ${w * 0.16}px rgba(0,0,0,0.55), 0 0 0 ${w * 0.008}px ${rgba(accent, 0.5)}, 0 0 ${w * 0.12}px ${rgba(accent, 0.35)}`,
      }}
    />
  );
};
