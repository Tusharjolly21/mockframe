import { FORMAT_DIMENSIONS, type PromoProject } from "./types";

/** A resolved app screen: the image URL (data URI on render) plus its pixel size
 *  (needed to place it into the device screen at the right aspect). */
export type PromoScreenshot = { url: string; width: number; height: number };

/** The props every promo composition receives. Kept flat and serialisable so it
 *  can be passed to <Player> (preview) and to Remotion Lambda / the local
 *  renderer (export) unchanged. */
export type PromoInputProps = {
  deviceId: string;
  /** One or more app screens; templates cut/cycle between them. */
  screenshots: PromoScreenshot[];
  texts: string[];
  accent: string;
  background: string;
  pattern: string | null;
  watermark: boolean;
  /** Absolute/fetchable URL of the music track, or null for a silent render. */
  musicUrl: string | null;
  width: number;
  height: number;
};

export function buildPromoInputProps(
  project: PromoProject,
  opts: { screenshots: PromoScreenshot[]; watermark: boolean; musicUrl?: string | null },
): PromoInputProps {
  const { width, height } = FORMAT_DIMENSIONS[project.format];
  return {
    deviceId: project.deviceId,
    screenshots: opts.screenshots,
    texts: project.texts,
    accent: project.accent,
    background: project.background,
    pattern: project.pattern,
    watermark: opts.watermark,
    musicUrl: opts.musicUrl ?? null,
    width,
    height,
  };
}
