import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { RealDeviceFrame, usePreloadScreenshots } from "../kit/RealDeviceFrame";
import { Caption, Eyebrow, MaskHeadline } from "../kit/AnimatedText";
import { CutFlash, Glow, LightSweep, PromoAudio, Watermark } from "../kit/Overlay";
import { cutsPassed, EASE_OUT, screenAt } from "../kit/theme";

/** Kinetic Hero — a brand-forward hero with mask-reveal type and a phone that
 *  floats with a live 3D parallax tilt over a parallax backdrop, cutting between
 *  screens. Responsive: side-by-side in landscape, stacked in portrait. */
export const TiltParallax: FC<PromoInputProps> = ({ deviceId, screenshots, texts, accent, background, pattern, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  usePreloadScreenshots(screenshots.map((s) => s.url));
  const [headline = "", subhead = ""] = texts;
  const landscape = width > height;

  const phoneW = landscape ? Math.min(width * 0.32, (height * 0.74) / 2.03) : Math.min(width * 0.6, (height * 0.5) / 2.03);
  const cuts = [72, 152];
  const shot = screenAt(screenshots, cutsPassed(frame, cuts));

  const enter = spring({ frame, fps, config: { damping: 18, mass: 0.9, stiffness: 140 } });
  const t = frame / fps;
  const rotY = Math.sin(t * 1.1) * 13;
  const rotX = Math.cos(t * 0.85) * 8;
  const floatY = Math.sin(t * 1.2) * (height * 0.012);
  const breathe = 1 + Math.sin(t * 0.9) * 0.014;
  const dolly = interpolate(frame, [0, dur], [1.02, 1.06], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const outro = interpolate(frame, [dur - 14, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const groupO = interpolate(outro, [0, 1], [1, 0.35]);

  const textBlock = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: landscape ? "flex-start" : "center", gap: height * 0.03, maxWidth: landscape ? width * 0.42 : width * 0.88 }}>
      <Eyebrow text="MockFrame" enterAt={4} size={width * 0.018} accent={accent} />
      <MaskHeadline text={headline} enterAt={10} size={landscape ? width * 0.05 : width * 0.07} align={landscape ? "left" : "center"} maxWidth={landscape ? width * 0.42 : width * 0.88} accent={accent} />
      <Caption text={subhead} enterAt={30} size={width * 0.026} maxWidth={landscape ? width * 0.4 : width * 0.8} />
    </div>
  );

  const device = (
    <div style={{ transform: `translateY(${floatY}px)`, opacity: interpolate(enter, [0, 1], [0, 1]) }}>
      <RealDeviceFrame deviceId={deviceId} width={phoneW} screenshot={shot} rotateX={rotX} rotateY={rotY} scale={interpolate(enter, [0, 1], [0.86, 1]) * breathe * dolly} perspective={width * 2.2} />
    </div>
  );

  return (
    <AbsoluteFill style={{ opacity: groupO }}>
      <AbsoluteFill style={{ transform: `translateX(${rotY * -1.4}px) scale(1.05)` }}>
        <Background background={background} accent={accent} pattern={pattern} />
      </AbsoluteFill>
      <PromoAudio musicUrl={musicUrl} />
      <Glow accent={accent} strength={0.24} />
      {landscape ? (
        <AbsoluteFill style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-around", padding: `0 ${width * 0.07}px` }}>
          {textBlock}
          {device}
        </AbsoluteFill>
      ) : (
        <AbsoluteFill style={{ flexDirection: "column", alignItems: "center", justifyContent: "center", gap: height * 0.05 }}>
          {textBlock}
          {device}
        </AbsoluteFill>
      )}
      <LightSweep startAt={Math.round(dur * 0.42)} durationInFrames={30} />
      <CutFlash cues={cuts} />
      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
