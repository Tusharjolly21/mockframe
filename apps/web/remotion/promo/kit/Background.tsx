import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { getPromoBackground } from "./backgrounds";
import { rgba } from "./theme";

/** Fine film grain as an inline SVG turbulence data URI (no external asset). */
const GRAIN_URI =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='140' height='140'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E\")";

/**
 * Premium animated backdrop: a base colour, drifting radial "mesh" blobs, a
 * soft vignette and a whisper of film grain. Driven by the composition frame so
 * the light keeps moving under the product.
 */
export const Background: FC<{ background: string; accent: string }> = ({ background, accent }) => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const bg = getPromoBackground(background);
  const t = frame / fps; // seconds
  const maxDim = Math.max(width, height);

  return (
    <AbsoluteFill style={{ backgroundColor: bg.base, overflow: "hidden" }}>
      {/* drifting mesh blobs */}
      {bg.blobs.map((blob, i) => {
        const phase = i * 1.7;
        const dx = Math.sin(t * 0.35 + phase) * blob.drift * width;
        const dy = Math.cos(t * 0.28 + phase) * blob.drift * height;
        const size = blob.r * maxDim;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: blob.x * width - size / 2 + dx,
              top: blob.y * height - size / 2 + dy,
              width: size,
              height: size,
              borderRadius: "50%",
              background: `radial-gradient(circle, ${blob.color} 0%, transparent 68%)`,
              filter: "blur(8px)",
            }}
          />
        );
      })}

      {/* accent haze behind the subject */}
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: "52%",
          width: maxDim * 0.9,
          height: maxDim * 0.9,
          transform: "translate(-50%, -50%)",
          borderRadius: "50%",
          background: `radial-gradient(circle, ${rgba(accent, 0.16)} 0%, transparent 60%)`,
          filter: "blur(14px)",
        }}
      />

      {/* vignette */}
      <AbsoluteFill
        style={{
          background: `radial-gradient(120% 90% at 50% 45%, transparent 40%, rgba(0,0,0,${bg.vignette}) 100%)`,
        }}
      />

      {/* grain */}
      <AbsoluteFill
        style={{ backgroundImage: GRAIN_URI, backgroundSize: "180px 180px", opacity: 0.06, mixBlendMode: "overlay" }}
      />
    </AbsoluteFill>
  );
};
