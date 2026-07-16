import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { DeviceFrame } from "../kit/DeviceFrame";
import { Chip, Headline } from "../kit/AnimatedText";
import { LightSweep, PromoAudio, Watermark } from "../kit/Overlay";
import { FONT_STACK, rgba } from "../kit/theme";

/** Quick Cut Promo — an energetic, beat-cut ad edit: title card → phone slam-in
 *  with a feature cut → a second feature cut → a closing CTA card. */
export const QuickCut: FC<PromoInputProps> = ({ screenshotUrl, texts, accent, background, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [title = "", feature1 = "", feature2 = "", cta = ""] = texts;

  const seg = (start: number, end: number, fadeIn = 6, fadeOut = 6) =>
    interpolate(frame, [start, start + fadeIn, end - fadeOut, end], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const phoneW = Math.min(width * 0.5, (height * 0.54) / 2.03);

  // TITLE 0..46
  const titleSpring = spring({ frame, fps, config: { damping: 14, mass: 0.6, stiffness: 200 } });
  const titleScale = interpolate(titleSpring, [0, 1], [0.7, 1]);

  // DEVICE present across the two feature cuts 46..196
  const deviceOpacity = seg(46, 196, 8, 12);
  const slam = spring({ frame: frame - 46, fps, config: { damping: 13, mass: 0.5, stiffness: 220 } });
  const deviceScale = interpolate(slam, [0, 1], [1.28, 1]);
  const reframe = interpolate(frame, [120, 142], [0, -width * 0.1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // CTA 196..end
  const ctaSpring = spring({ frame: frame - 196, fps, config: { damping: 15, mass: 0.7, stiffness: 180 } });
  const ctaScale = interpolate(ctaSpring, [0, 1], [0.8, 1]);
  const ctaOpacity = seg(196, durationInFrames + 6, 8, 4);

  return (
    <AbsoluteFill>
      <Background background={background} accent={accent} />
      <PromoAudio musicUrl={musicUrl} />

      {/* TITLE CARD */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: seg(0, 46, 4, 8) }}>
        <div style={{ transform: `scale(${titleScale})`, textAlign: "center" }}>
          <div style={{ fontFamily: FONT_STACK, fontWeight: 900, fontSize: width * 0.09, letterSpacing: -width * 0.003, color: "#fff", maxWidth: width * 0.86, lineHeight: 1 }}>{title}</div>
        </div>
      </AbsoluteFill>

      {/* DEVICE + FEATURE CUTS */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: deviceOpacity }}>
        <div style={{ transform: `translateX(${reframe}px) scale(${deviceScale})` }}>
          <DeviceFrame width={phoneW} screenshotUrl={screenshotUrl} accent={accent} gloss={0.16} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: height * 0.12 }}>
        <div style={{ opacity: seg(52, 118, 6, 8) }}>
          <Chip text={feature1} enterAt={52} size={width * 0.034} accent={accent} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * 0.12 }}>
        <div style={{ opacity: seg(124, 190, 6, 8) }}>
          <Chip text={feature2} enterAt={124} size={width * 0.034} accent={accent} />
        </div>
      </AbsoluteFill>

      {/* CTA CARD */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: ctaOpacity }}>
        <div style={{ transform: `scale(${ctaScale})`, display: "flex", flexDirection: "column", alignItems: "center", gap: height * 0.04 }}>
          <Headline text={cta} enterAt={196} size={width * 0.078} maxWidth={width * 0.84} />
          <div style={{ padding: `${width * 0.022}px ${width * 0.06}px`, borderRadius: 999, background: accent, color: "#0b0817", fontFamily: FONT_STACK, fontWeight: 800, fontSize: width * 0.03, boxShadow: `0 20px 60px ${rgba(accent, 0.5)}` }}>
            Get started →
          </div>
        </div>
      </AbsoluteFill>

      <LightSweep startAt={48} durationInFrames={20} />
      <LightSweep startAt={122} durationInFrames={20} />
      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
