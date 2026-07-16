import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { DeviceFrame } from "../kit/DeviceFrame";
import { Caption, Eyebrow, Headline } from "../kit/AnimatedText";
import { LightSweep, PromoAudio, Watermark } from "../kit/Overlay";
import { EASE_OUT } from "../kit/theme";

/** Tilt Parallax — a calm, brand-forward hero. The phone floats with a live 3D
 *  tilt over the drifting backdrop under a bold headline. Responsive: side-by-
 *  side in landscape, stacked in portrait. */
export const TiltParallax: FC<PromoInputProps> = ({ screenshotUrl, texts, accent, background, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [headline = "", subhead = ""] = texts;
  const landscape = width > height;

  const phoneW = landscape ? Math.min(width * 0.3, (height * 0.72) / 2.03) : Math.min(width * 0.56, (height * 0.5) / 2.03);
  const enter = spring({ frame, fps, config: { damping: 22, mass: 1.1, stiffness: 100 } });
  const t = frame / fps;
  const rotY = Math.sin(t * 0.6) * 10;
  const rotX = Math.cos(t * 0.45) * 6;
  const floatY = Math.sin(t * 0.9) * (height * 0.01);
  const breathe = 1 + Math.sin(t * 0.7) * 0.012;

  const outro = interpolate(frame, [durationInFrames - 16, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const groupOpacity = interpolate(outro, [0, 1], [1, 0.4]);

  const textBlock = (
    <div style={{ display: "flex", flexDirection: "column", alignItems: landscape ? "flex-start" : "center", gap: height * 0.03, maxWidth: landscape ? width * 0.42 : width * 0.86 }}>
      <Eyebrow text="MockFrame" enterAt={4} size={width * 0.018} accent={accent} />
      <Headline text={headline} enterAt={12} size={landscape ? width * 0.05 : width * 0.066} align={landscape ? "left" : "center"} maxWidth={landscape ? width * 0.42 : width * 0.86} />
      <Caption text={subhead} enterAt={30} size={width * 0.026} maxWidth={landscape ? width * 0.4 : width * 0.78} />
    </div>
  );

  const device = (
    <div style={{ perspective: width * 2.4, opacity: interpolate(enter, [0, 1], [0, 1]) }}>
      <div style={{ transform: `translateY(${floatY}px) scale(${interpolate(enter, [0, 1], [0.86, 1]) * breathe}) rotateX(${rotX}deg) rotateY(${rotY}deg)`, transformStyle: "preserve-3d" }}>
        <DeviceFrame width={phoneW} screenshotUrl={screenshotUrl} accent={accent} gloss={0.16} />
      </div>
    </div>
  );

  return (
    <AbsoluteFill style={{ opacity: groupOpacity }}>
      <Background background={background} accent={accent} />
      <PromoAudio musicUrl={musicUrl} />
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
      <LightSweep startAt={Math.round(durationInFrames * 0.4)} durationInFrames={34} />
      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
