import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { RealDeviceFrame, usePreloadScreenshots } from "../kit/RealDeviceFrame";
import { Chip, Headline } from "../kit/AnimatedText";
import { CutFlash, LightSweep, PromoAudio, Watermark } from "../kit/Overlay";
import { cutsPassed, FONT_STACK, rgba, screenAt } from "../kit/theme";

/** Quick Cut Ad — energetic beat cut: title card → phone slam-in cutting across
 *  app screens with feature callouts → closing CTA card. Real frame, fast. */
export const QuickCut: FC<PromoInputProps> = ({ deviceId, screenshots, texts, accent, background, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  usePreloadScreenshots(screenshots.map((s) => s.url));
  const [title = "", feature1 = "", feature2 = "", cta = ""] = texts;

  const seg = (start: number, end: number, fadeIn = 6, fadeOut = 6) =>
    interpolate(frame, [start, start + fadeIn, end - fadeOut, end], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const phoneW = Math.min(width * 0.54, (height * 0.54) / 2.03);
  const deviceCuts = [112, 168];
  const shot = screenAt(screenshots, cutsPassed(frame, deviceCuts));

  // TITLE 0..46
  const titleSpring = spring({ frame, fps, config: { damping: 13, mass: 0.5, stiffness: 220 } });
  const titleScale = interpolate(titleSpring, [0, 1], [0.68, 1]);

  // DEVICE 46..200
  const deviceO = seg(46, 202, 8, 12);
  const slam = spring({ frame: frame - 46, fps, config: { damping: 12, mass: 0.5, stiffness: 240 } });
  const deviceScale = interpolate(slam, [0, 1], [1.3, 1]);
  const reframe = interpolate(frame, [130, 150], [0, -width * 0.08], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rotY = Math.sin((frame / fps) * 1.4) * 7;

  // CTA 200..end
  const ctaSpring = spring({ frame: frame - 202, fps, config: { damping: 14, mass: 0.6, stiffness: 200 } });
  const ctaScale = interpolate(ctaSpring, [0, 1], [0.78, 1]);
  const ctaO = seg(202, durationInFrames + 6, 8, 4);

  return (
    <AbsoluteFill>
      <Background background={background} accent={accent} />
      <PromoAudio musicUrl={musicUrl} />

      {/* TITLE */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: seg(0, 46, 4, 8) }}>
        <div style={{ transform: `scale(${titleScale})`, textAlign: "center" }}>
          <div style={{ fontFamily: FONT_STACK, fontWeight: 900, fontSize: width * 0.092, letterSpacing: -width * 0.003, color: "#fff", maxWidth: width * 0.86, lineHeight: 0.98 }}>{title}</div>
        </div>
      </AbsoluteFill>

      {/* DEVICE + FEATURE CUTS */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: deviceO }}>
        <div style={{ transform: `translateX(${reframe}px) scale(${deviceScale})` }}>
          <RealDeviceFrame deviceId={deviceId} width={phoneW} screenshot={shot} rotateY={rotY} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: height * 0.12 }}>
        <div style={{ opacity: seg(54, 116, 6, 8) }}>
          <Chip text={feature1} enterAt={54} size={width * 0.034} accent={accent} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * 0.12 }}>
        <div style={{ opacity: seg(118, 198, 6, 8) }}>
          <Chip text={feature2} enterAt={118} size={width * 0.034} accent={accent} />
        </div>
      </AbsoluteFill>

      {/* CTA */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: ctaO }}>
        <div style={{ transform: `scale(${ctaScale})`, display: "flex", flexDirection: "column", alignItems: "center", gap: height * 0.04 }}>
          <Headline text={cta} enterAt={202} size={width * 0.08} maxWidth={width * 0.84} />
          <div style={{ padding: `${width * 0.022}px ${width * 0.06}px`, borderRadius: 999, background: accent, color: "#0b0817", fontFamily: FONT_STACK, fontWeight: 800, fontSize: width * 0.03, boxShadow: `0 20px 60px ${rgba(accent, 0.5)}` }}>
            Get started →
          </div>
        </div>
      </AbsoluteFill>

      <LightSweep startAt={48} durationInFrames={18} />
      <CutFlash cues={[46, ...deviceCuts, 202]} />
      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
