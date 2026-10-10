import type { FC, ReactNode } from "react";
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

/** Mirror its children into a soft floor reflection that fades out downward. */
export const Reflection: FC<{ children: ReactNode; opacity?: number; fade?: number; gap?: number }> = ({ children, opacity = 0.22, fade = 0.45, gap = 0 }) => (
  <div
    style={{
      position: "absolute",
      left: 0,
      right: 0,
      top: `calc(100% + ${gap}px)`,
      transform: "scaleY(-1)",
      transformOrigin: "center",
      opacity,
      pointerEvents: "none",
      WebkitMaskImage: `linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) ${fade * 100}%)`,
      maskImage: `linear-gradient(to top, rgba(0,0,0,1) 0%, rgba(0,0,0,0) ${fade * 100}%)`,
    }}
  >
    {children}
  </div>
);

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
        backgroundImage: `url(${shot.url})`,
        backgroundSize: `${zoom * 100}% auto`,
        backgroundPosition: `${fx * 100}% ${fy * 100}%`,
        backgroundColor: "#111",
        border: "1px solid rgba(255,255,255,0.22)",
        boxShadow: `0 ${w * 0.06}px ${w * 0.16}px rgba(0,0,0,0.55), 0 0 0 ${w * 0.008}px ${rgba(accent, 0.5)}, 0 0 ${w * 0.12}px ${rgba(accent, 0.35)}`,
      }}
    />
  );
};
