import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { RealDeviceFrame, usePreloadScreenshots } from "../kit/RealDeviceFrame";
import { Caption, Eyebrow, MaskHeadline } from "../kit/AnimatedText";
import { CutFlash, Glow, LightSweep, PromoAudio, Watermark } from "../kit/Overlay";
import { ContactShadow, FloorGlow, Particles } from "../kit/Stage";
import { cutsPassed, EASE_CINE, EASE_OUT, screenAt, velBlur } from "../kit/theme";

/** Kinetic Hero — a brand-forward hero. Instead of an endless idle loop, the
 *  phone travels a keyframed pose journey (with breathing on top), the glare
 *  tracks each turn, and screens cut on the pose changes. */
export const TiltParallax: FC<PromoInputProps> = ({ deviceId, screenshots, texts, accent, background, pattern, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  usePreloadScreenshots(screenshots.map((s) => s.url), screenshots.map((s) => s.kind));
  const [headline = "", subhead = ""] = texts;
  const landscape = width > height;

  const phoneW = landscape ? Math.min(width * 0.32, (height * 0.74) / 2.03) : Math.min(width * 0.6, (height * 0.5) / 2.03);
  const cuts = [72, 152];
  const shot = screenAt(screenshots, cutsPassed(frame, cuts));

  const enter = spring({ frame, fps, config: { damping: 18, mass: 0.9, stiffness: 140 } });
  const t = frame / fps;

  // keyframed pose journey through the beats + gentle life on top
  const rotYfn = (f: number) =>
    interpolate(f, [0, cuts[0], cuts[1], dur], [-16, 12, -10, 6], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_CINE }) + Math.sin((f / fps) * 0.9) * 4;
  const rotXfn = (f: number) =>
    interpolate(f, [0, cuts[0], cuts[1], dur], [6, -4, 7, 2], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_CINE }) + Math.cos((f / fps) * 0.7) * 2.5;
  const rotY = rotYfn(frame);
  const rotX = rotXfn(frame);
  const blur = velBlur(rotYfn(frame), rotYfn(frame - 1), 0.6, 6);

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
    <div style={{ transform: `translateY(${floatY}px)`, opacity: interpolate(enter, [0, 1], [0, 1]), filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
      <div style={{ position: "relative" }}>
        <RealDeviceFrame deviceId={deviceId} width={phoneW} screenshot={shot} rotateX={rotX} rotateY={rotY} scale={interpolate(enter, [0, 1], [0.86, 1]) * breathe * dolly} perspective={width * 2.2} glare={0.13} />
        <ContactShadow width={phoneW} opacity={0.38 * enter} />
      </div>
    </div>
  );

  return (
    <AbsoluteFill style={{ opacity: groupO }}>
      <AbsoluteFill style={{ transform: `translateX(${rotY * -1.4}px) scale(1.05)` }}>
        <Background background={background} accent={accent} pattern={pattern} />
      </AbsoluteFill>
      <FloorGlow accent={accent} strength={0.14} />
      <Particles accent={accent} seed={31} />
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
