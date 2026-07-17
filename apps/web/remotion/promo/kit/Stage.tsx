import type { FC } from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";
import { rgba } from "./theme";

/** Deterministic 0..1 pseudo-random (Math.random is banned in Remotion). */
const prand = (n: number) => {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

/**
 * Ambient bokeh dust — slow-rising, twinkling motes in front of the backdrop
 * but behind the device. This is the depth layer that makes the parallax read.
 */
export const Particles: FC<{ accent: string; count?: number; seed?: number }> = ({ accent, count = 14, seed = 7 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {Array.from({ length: count }, (_, i) => {
        const r1 = prand(i * 3.1 + seed);
        const r2 = prand(i * 7.7 + seed);
        const r3 = prand(i * 13.3 + seed);
        const size = 2 + r3 * 6;
        const speed = 0.02 + r2 * 0.05; // % of frame height per frame, drifting up
        const y = ((r2 * 120 - frame * speed) % 120 + 120) % 120 - 10;
        const twinkle = 0.6 + 0.4 * Math.sin(frame * (0.05 + r3 * 0.06) + i * 2.2);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: `${r1 * 100}%`,
              top: `${y}%`,
              width: size,
              height: size,
              borderRadius: "50%",
              background: i % 3 === 0 ? accent : "#ffffff",
              opacity: (0.05 + r1 * 0.16) * twinkle,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Soft elliptical contact shadow that grounds the device. Attach as a sibling
 *  of RealDeviceFrame inside a `position: relative` wrapper. */
export const ContactShadow: FC<{ width: number; opacity?: number }> = ({ width, opacity = 0.45 }) => (
  <div
    style={{
      position: "absolute",
      left: "50%",
      bottom: -width * 0.07,
      transform: "translateX(-50%)",
      width: width * 1.15,
      height: width * 0.15,
      borderRadius: "50%",
      background: `radial-gradient(ellipse, rgba(0,0,0,${opacity}) 0%, transparent 65%)`,
      filter: "blur(6px)",
      pointerEvents: "none",
    }}
  />
);

/** An accent-tinted light pool rising from the bottom of frame — the "stage". */
export const FloorGlow: FC<{ accent: string; strength?: number }> = ({ accent, strength = 0.14 }) => (
  <div
    style={{
      position: "absolute",
      left: "50%",
      bottom: "-12%",
      transform: "translateX(-50%)",
      width: "130%",
      height: "36%",
      background: `radial-gradient(ellipse at 50% 100%, ${rgba(accent, strength)} 0%, transparent 65%)`,
      pointerEvents: "none",
    }}
  />
);
