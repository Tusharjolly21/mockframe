import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { RealDeviceFrame, usePreloadScreenshots } from "../kit/RealDeviceFrame";
import { CharHeadline, Chip } from "../kit/AnimatedText";
import { CutFlash, Glow, LightSweep, PromoAudio, Watermark } from "../kit/Overlay";
import { ContactShadow, FloorGlow, Particles } from "../kit/Stage";
import { cutsPassed, FONT_STACK, punchAt, rgba, screenAt, velBlur } from "../kit/theme";

/** Quick Cut Ad — energetic beat cut: char-slam title → phone slam-in
 *  (motion-blurred) cutting across app screens with feature callouts → a CTA
 *  card with a pulsing, shining button. The background punch-zooms on every cut. */
export const QuickCut: FC<PromoInputProps> = ({ deviceId, screenshots, texts, accent, background, pattern, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  usePreloadScreenshots(screenshots.map((s) => s.url));
  const [title = "", feature1 = "", feature2 = "", cta = ""] = texts;

  const seg = (start: number, end: number, fadeIn = 6, fadeOut = 6) =>
    interpolate(frame, [start, start + fadeIn, end - fadeOut, end], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const phoneW = Math.min(width * 0.54, (height * 0.54) / 2.03);
  const deviceCuts = [112, 168];
  const allCuts = [46, ...deviceCuts, 202];
  const shot = screenAt(screenshots, cutsPassed(frame, deviceCuts));

  // background punch-zooms on every beat
  const bgPunch = 1 + punchAt(frame, allCuts, 0.035, 6);

  // TITLE 0..46
  const titleSpring = spring({ frame, fps, config: { damping: 13, mass: 0.5, stiffness: 220 } });
  const titleScale = interpolate(titleSpring, [0, 1], [0.68, 1]);

  // DEVICE 46..200 — slam-in + reframe, motion-blurred while moving
  const deviceO = seg(46, 202, 8, 12);
  const scaleFn = (f: number) => interpolate(spring({ frame: f - 46, fps, config: { damping: 12, mass: 0.5, stiffness: 240 } }), [0, 1], [1.3, 1]);
  const reframeFn = (f: number) => interpolate(f, [130, 150], [0, -width * 0.08], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const deviceScale = scaleFn(frame);
  const reframe = reframeFn(frame);
  const rotY = Math.sin((frame / fps) * 1.4) * 7;
  const blur =
    velBlur(scaleFn(frame) * 220 + reframeFn(frame), scaleFn(frame - 1) * 220 + reframeFn(frame - 1), 0.5, 10) +
    deviceCuts.reduce((b, c) => b + interpolate(frame, [c - 5, c, c + 6], [0, 6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), 0);

  // CTA 200..end — pulsing button with a looping shine
  const ctaSpring = spring({ frame: frame - 202, fps, config: { damping: 14, mass: 0.6, stiffness: 200 } });
  const ctaScale = interpolate(ctaSpring, [0, 1], [0.78, 1]);
  const ctaO = seg(202, dur + 6, 8, 4);
  const btnPulse = 1 + Math.sin(frame * 0.18) * 0.02;
  const btnShine = ((frame * 2.4) % 170) - 35;

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `scale(${bgPunch})` }}>
        <Background background={background} accent={accent} pattern={pattern} />
      </AbsoluteFill>
      <FloorGlow accent={accent} strength={0.12} />
      <Particles accent={accent} seed={41} />
      <PromoAudio musicUrl={musicUrl} />
      <Glow accent={accent} strength={ctaO * 0.28} />

      {/* TITLE — char slam */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: seg(0, 46, 4, 8) }}>
        <div style={{ transform: `scale(${titleScale})` }}>
          <CharHeadline text={title} enterAt={2} size={width * 0.09} maxWidth={width * 0.86} stagger={0.9} />
        </div>
      </AbsoluteFill>

      {/* DEVICE + FEATURE CUTS */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: deviceO }}>
        <div style={{ transform: `translateX(${reframe}px) scale(${deviceScale})`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
          <div style={{ position: "relative" }}>
            <RealDeviceFrame deviceId={deviceId} width={phoneW} screenshot={shot} rotateY={rotY} glare={0.13} />
            <ContactShadow width={phoneW} opacity={0.4 * Math.min(1, Math.max(0, (frame - 52) / 14))} />
          </div>
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
          <CharHeadline text={cta} enterAt={204} size={width * 0.08} maxWidth={width * 0.84} accent={accent} stagger={1} />
          <div
            style={{
              position: "relative",
              overflow: "hidden",
              transform: `scale(${btnPulse})`,
              padding: `${width * 0.022}px ${width * 0.06}px`,
              borderRadius: 999,
              background: accent,
              color: "#0b0817",
              fontFamily: FONT_STACK,
              fontWeight: 800,
              fontSize: width * 0.03,
              boxShadow: `0 20px 60px ${rgba(accent, 0.5)}`,
            }}
          >
            Get started →
            <span style={{ position: "absolute", top: 0, bottom: 0, left: `${btnShine}%`, width: "28%", transform: "skewX(-18deg)", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.35), transparent)", pointerEvents: "none" }} />
          </div>
        </div>
      </AbsoluteFill>

      <LightSweep startAt={48} durationInFrames={18} />
      <CutFlash cues={allCuts} />
      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
