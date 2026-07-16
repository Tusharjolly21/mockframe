import type { FC } from "react";
import { Audio, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { FONT_STACK, rgba } from "./theme";

/** Free-tier watermark, burned into non-Pro renders and previews. */
export const Watermark: FC<{ width: number }> = ({ width }) => (
  <div
    style={{
      position: "absolute",
      bottom: width * 0.03,
      right: width * 0.035,
      display: "flex",
      alignItems: "center",
      gap: width * 0.012,
      fontFamily: FONT_STACK,
      fontWeight: 700,
      fontSize: width * 0.024,
      color: rgba("#ffffff", 0.55),
      textShadow: "0 1px 6px rgba(0,0,0,0.5)",
    }}
  >
    <span style={{ width: width * 0.03, height: width * 0.03, borderRadius: width * 0.008, background: "linear-gradient(135deg,#a78bfa,#22d3ee)" }} />
    Made with MockFrame
  </div>
);

/** Optional music with a short fade-in/out. Renders nothing when silent. */
export const PromoAudio: FC<{ musicUrl: string | null }> = ({ musicUrl }) => {
  if (!musicUrl) return null;
  return <Audio src={musicUrl} volume={(f) => interpolate(f, [0, 20], [0, 0.8], { extrapolateRight: "clamp" })} />;
};

/** A diagonal specular light sweep that crosses the frame once, on cue. */
export const LightSweep: FC<{ startAt: number; durationInFrames?: number }> = ({ startAt, durationInFrames = 26 }) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const p = interpolate(frame, [startAt, startAt + durationInFrames], [-0.4, 1.4], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const opacity = interpolate(frame, [startAt, startAt + 6, startAt + durationInFrames - 6, startAt + durationInFrames], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: `${p * 100}%`,
        width: width * 0.35,
        height,
        transform: "skewX(-14deg)",
        background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.14), transparent)",
        opacity,
        pointerEvents: "none",
        filter: "blur(6px)",
      }}
    />
  );
};
