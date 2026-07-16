import type { FC } from "react";
import { Img } from "remotion";
import { rgba } from "./theme";

/**
 * High-fidelity CSS iPhone-16-Pro-style frame: titanium rim, thin uniform
 * bezel, Dynamic Island, screen gloss and side buttons. Fully transform-able
 * (the templates rotate/scale it in 3D), which a frame PNG can't do cleanly.
 *
 * `scrollProgress` (0..1) pans a tall screenshot from top to bottom inside the
 * screen via object-position, so the Scroll Story template can reveal a whole
 * app without knowing the image's pixel height.
 */
export const DeviceFrame: FC<{
  width: number;
  screenshotUrl: string;
  accent: string;
  scrollProgress?: number;
  /** subtle diagonal glass reflection strength, 0..1 */
  gloss?: number;
}> = ({ width: w, screenshotUrl, accent, scrollProgress = 0, gloss = 0.12 }) => {
  const h = w * 2.03;
  const bezel = w * 0.03;
  const bodyRadius = w * 0.225;
  const screenRadius = w * 0.19;
  const islandW = w * 0.3;
  const islandH = w * 0.085;
  const buttonW = w * 0.012;

  return (
    <div
      style={{
        position: "relative",
        width: w,
        height: h,
        borderRadius: bodyRadius,
        background: "linear-gradient(150deg, #46474b 0%, #202024 26%, #0b0b0d 55%, #303034 100%)",
        boxShadow: `0 2px 2px rgba(255,255,255,0.12) inset, 0 0 0 ${w * 0.004}px rgba(0,0,0,0.6), 0 60px 140px rgba(0,0,0,0.6), 0 0 90px ${rgba(accent, 0.22)}`,
        padding: bezel,
      }}
    >
      {/* side buttons */}
      <div style={{ position: "absolute", left: -buttonW, top: h * 0.2, width: buttonW, height: h * 0.045, borderRadius: buttonW, background: "#2a2a2d" }} />
      <div style={{ position: "absolute", left: -buttonW, top: h * 0.3, width: buttonW, height: h * 0.09, borderRadius: buttonW, background: "#2a2a2d" }} />
      <div style={{ position: "absolute", left: -buttonW, top: h * 0.42, width: buttonW, height: h * 0.09, borderRadius: buttonW, background: "#2a2a2d" }} />
      <div style={{ position: "absolute", right: -buttonW, top: h * 0.32, width: buttonW, height: h * 0.13, borderRadius: buttonW, background: "#2a2a2d" }} />

      {/* screen */}
      <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: screenRadius, overflow: "hidden", background: "#000" }}>
        <Img
          src={screenshotUrl}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            objectPosition: `50% ${scrollProgress * 100}%`,
            display: "block",
          }}
        />

        {/* Dynamic Island */}
        <div
          style={{
            position: "absolute",
            top: bezel * 1.1,
            left: "50%",
            transform: "translateX(-50%)",
            width: islandW,
            height: islandH,
            borderRadius: islandH,
            background: "#000",
            boxShadow: "0 0 0 1px rgba(255,255,255,0.04)",
          }}
        />

        {/* glass gloss */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: `linear-gradient(125deg, rgba(255,255,255,${gloss}) 0%, rgba(255,255,255,0) 30%, rgba(255,255,255,0) 70%, rgba(255,255,255,${gloss * 0.5}) 100%)`,
            pointerEvents: "none",
          }}
        />
      </div>
    </div>
  );
};
