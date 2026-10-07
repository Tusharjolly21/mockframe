/**
 * Video export settings shared by every video exporter (motion presets and
 * chat replay): frame rate, resolution, and the pure math behind them —
 * output size, bitrate and the H.264 level a size/fps needs.
 */

export type VideoFps = 30 | 60;
export type VideoResolution = "720p" | "1080p" | "1440p" | "2160p";

export interface VideoSettings {
  fps: VideoFps;
  resolution: VideoResolution;
}

export const DEFAULT_VIDEO_SETTINGS: VideoSettings = { fps: 60, resolution: "1080p" };

export const VIDEO_FPS: VideoFps[] = [30, 60];

export const VIDEO_RESOLUTIONS: { id: VideoResolution; label: string; short: number }[] = [
  { id: "720p", label: "720p", short: 720 },
  { id: "1080p", label: "1080p", short: 1080 },
  { id: "1440p", label: "1440p", short: 1440 },
  { id: "2160p", label: "4K", short: 2160 },
];

export function isVideoSettings(v: unknown): v is VideoSettings {
  const s = v as Partial<VideoSettings> | null;
  return !!s && VIDEO_FPS.includes(s.fps as VideoFps) && VIDEO_RESOLUTIONS.some((r) => r.id === s.resolution);
}

/** H.264 levels as [codec-string level byte, max macroblocks per frame, max macroblocks per second]. */
const AVC_LEVELS: [number, number, number][] = [
  [0x1f, 3600, 108_000], // 3.1
  [0x20, 5120, 216_000], // 3.2
  [0x28, 8192, 245_760], // 4.0
  [0x2a, 8704, 522_240], // 4.2
  [0x32, 22_080, 589_824], // 5.0
  [0x33, 36_864, 983_040], // 5.1
  [0x34, 36_864, 2_073_600], // 5.2
];

/** Largest frame (in 16×16 macroblocks) every common H.264 decoder accepts — level 5.2. */
export const MAX_MACROBLOCKS = 36_864;

const macroblocks = (w: number, h: number) => Math.ceil(w / 16) * Math.ceil(h / 16);
const even = (n: number) => Math.max(2, Math.round(n / 2) * 2);

/**
 * Output size for a canvas: scaled so its SHORT side matches the resolution
 * (a 1080×1350 post at "1080p" stays 1080×1350; at "4K" it becomes 2160×2700),
 * even dimensions for the encoder, and shrunk if needed so the frame still
 * fits H.264 level 5.2 — very tall canvases at 4K would otherwise play nowhere.
 */
export function videoSize(canvasW: number, canvasH: number, resolution: VideoResolution): { width: number; height: number } {
  const short = VIDEO_RESOLUTIONS.find((r) => r.id === resolution)?.short ?? 1080;
  let scale = short / Math.min(canvasW, canvasH);
  let width = even(canvasW * scale);
  let height = even(canvasH * scale);
  while (macroblocks(width, height) > MAX_MACROBLOCKS) {
    scale *= 0.98;
    width = even(canvasW * scale);
    height = even(canvasH * scale);
  }
  return { width, height };
}

/**
 * Bitrate for crisp UI and gradients: ~0.2 bits per pixel per frame, so 60fps
 * gets twice the budget of 30fps instead of half the quality per frame.
 */
export function videoBitrate(width: number, height: number, fps: number): number {
  return Math.round(Math.min(80_000_000, Math.max(8_000_000, width * height * fps * 0.2)));
}

/** Lowest H.264 level that fits the frame size and rate, as a hex byte ("34" = 5.2); null if none does. */
export function avcLevel(width: number, height: number, fps: number): string | null {
  const fs = macroblocks(width, height);
  const hit = AVC_LEVELS.find(([, maxFs, maxMbps]) => fs <= maxFs && fs * fps <= maxMbps);
  return hit ? hit[0].toString(16).padStart(2, "0") : null;
}

/**
 * H.264 codec strings to try, best first: High, Main, then Constrained
 * Baseline (software encoders often only do Baseline), each at the lowest
 * level that fits and then the higher ones in case a browser is picky.
 */
export function avcCandidates(width: number, height: number, fps: number): string[] {
  const min = avcLevel(width, height, fps);
  if (!min) return [];
  const levels = AVC_LEVELS.map(([l]) => l.toString(16).padStart(2, "0")).filter((l) => parseInt(l, 16) >= parseInt(min, 16));
  const profiles = ["6400", "4d00", "42e0", "4200"];
  return profiles.flatMap((p) => levels.map((l) => `avc1.${p}${l}`));
}

/** Human label for a settings choice on a given canvas, e.g. "1080×1350 · 60 fps". */
export function describeVideo(canvasW: number, canvasH: number, s: VideoSettings): string {
  const { width, height } = videoSize(canvasW, canvasH, s.resolution);
  return `${width}×${height} · ${s.fps} fps`;
}
