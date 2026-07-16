import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { DeviceFrame } from "../kit/DeviceFrame";
import { Caption, Eyebrow, Headline } from "../kit/AnimatedText";
import { LightSweep, PromoAudio, Watermark } from "../kit/Overlay";
import { EASE_OUT } from "../kit/theme";

/** 3D Spin Showcase — the phone glides in and turns on its Y-axis; two lines of
 *  copy cross-fade across the turn. The turn stays within one face (±~28°) so it
 *  reads as a premium showcase rotation, never a flip. */
export const SpinShowcase: FC<PromoInputProps> = ({ screenshotUrl, texts, accent, background, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [headline = "", caption = ""] = texts;

  const phoneW = Math.min(width * 0.54, (height * 0.6) / 2.03);

  const enter = spring({ frame, fps, config: { damping: 20, mass: 1, stiffness: 110 } });
  const enterScale = interpolate(enter, [0, 1], [0.8, 1]);
  const enterOpacity = interpolate(enter, [0, 1], [0, 1]);

  const t = frame / fps;
  const baseRotY = interpolate(enter, [0, 1], [-52, -8]);
  const rotY = baseRotY + Math.sin(t * 0.7) * 20; // gentle showcase turn
  const rotX = Math.sin(t * 0.5) * 5;
  const floatY = Math.cos(t * 1.1) * (height * 0.006);

  // cross-fade the two lines across the turn
  const half = durationInFrames * 0.5;
  const headlineOpacity = interpolate(frame, [10, 28, half - 10, half + 6], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const captionOpacity = interpolate(frame, [half, half + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const outro = interpolate(frame, [durationInFrames - 18, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });

  return (
    <AbsoluteFill>
      <Background background={background} accent={accent} />
      <PromoAudio musicUrl={musicUrl} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * 0.1 }}>
        <Eyebrow text="Take a closer look" enterAt={6} size={width * 0.02} accent={accent} />
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", perspective: width * 2.4, opacity: interpolate(outro, [0, 1], [1, 0.35]) }}>
        <div style={{ transform: `translateY(${floatY}px) scale(${enterScale}) rotateX(${rotX}deg) rotateY(${rotY}deg)`, opacity: enterOpacity, transformStyle: "preserve-3d" }}>
          <DeviceFrame width={phoneW} screenshotUrl={screenshotUrl} accent={accent} gloss={0.18} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: height * 0.11 }}>
        <div style={{ position: "relative", height: width * 0.12, width: width * 0.82 }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", opacity: headlineOpacity }}>
            <Headline text={headline} enterAt={0} size={width * 0.05} maxWidth={width * 0.82} />
          </div>
          <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", opacity: captionOpacity }}>
            <Caption text={caption} enterAt={0} size={width * 0.032} maxWidth={width * 0.78} />
          </div>
        </div>
      </AbsoluteFill>

      <LightSweep startAt={Math.round(durationInFrames * 0.5)} />
      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
