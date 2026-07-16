import { FORMAT_DIMENSIONS, type PromoProject } from "./types";

/** The props every promo composition receives. Kept flat and serialisable so it
 *  can be passed to <Player> (preview) and to Remotion Lambda / the local
 *  renderer (export) unchanged. */
export type PromoInputProps = {
  screenshotUrl: string;
  texts: string[];
  accent: string;
  background: string;
  watermark: boolean;
  /** Absolute/fetchable URL of the music track, or null for a silent render. */
  musicUrl: string | null;
  width: number;
  height: number;
};

export function buildPromoInputProps(
  project: PromoProject,
  opts: { screenshotUrl: string; watermark: boolean; musicUrl?: string | null },
): PromoInputProps {
  const { width, height } = FORMAT_DIMENSIONS[project.format];
  return {
    screenshotUrl: opts.screenshotUrl,
    texts: project.texts,
    accent: project.accent,
    background: project.background,
    watermark: opts.watermark,
    musicUrl: opts.musicUrl ?? null,
    width,
    height,
  };
}
