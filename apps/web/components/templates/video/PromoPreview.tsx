"use client";

import { useMemo } from "react";
import { Player, Thumbnail } from "@remotion/player";
import { getPromoTemplate } from "@/lib/promo/registry";
import { FORMAT_DIMENSIONS, PROMO_FPS, type PromoFormat } from "@/lib/promo/types";
import type { PromoInputProps } from "@/lib/promo/inputProps";
import { demoScreensFor } from "@/lib/promo/demoScreens";
import { PROMO_COMPONENTS } from "@/remotion/promo/templates";

/**
 * A promo template rendered with the demo app screens: a live looping
 * <Player> or a single still <Thumbnail>. Client-only (loaded via
 * next/dynamic) — the compositions pull in Remotion and three.js.
 */
export default function PromoPreview({
  templateId,
  format,
  accent,
  playing,
  className,
}: {
  templateId: string;
  format: PromoFormat;
  /** override the template's default accent */
  accent?: string | null;
  playing: boolean;
  className?: string;
}) {
  const t = getPromoTemplate(templateId);
  const { width, height } = FORMAT_DIMENSIONS[format];
  const color = accent ?? t?.defaultAccent ?? "#8b5cf6";
  const inputProps = useMemo<PromoInputProps | null>(
    () =>
      t
        ? {
            deviceId: "iphone-16-pro",
            screenshots: demoScreensFor(t.id, color),
            texts: t.textSlots.map((s) => s.placeholder),
            accent: color,
            background: t.defaultBackground,
            pattern: null,
            watermark: false,
            musicUrl: null,
            width,
            height,
          }
        : null,
    [t, color, width, height],
  );
  if (!t || !inputProps) return null;
  const Component = PROMO_COMPONENTS[t.id];
  const shared = {
    component: Component,
    inputProps,
    compositionWidth: width,
    compositionHeight: height,
    durationInFrames: t.defaultDurationInFrames,
    fps: PROMO_FPS,
    style: { width: "100%", height: "100%" },
  };
  return (
    <div className={className}>
      {playing ? (
        <Player {...shared} autoPlay loop initiallyMuted clickToPlay={false} spaceKeyToPlayOrPause={false} doubleClickToFullscreen={false} />
      ) : (
        <Thumbnail {...shared} frameToDisplay={Math.round(t.defaultDurationInFrames * 0.55)} />
      )}
    </div>
  );
}
