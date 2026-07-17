import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { RealDeviceFrame, usePreloadScreenshots } from "../kit/RealDeviceFrame";
import { Chip, Eyebrow } from "../kit/AnimatedText";
import { CutFlash, Glow, LightSweep, PromoAudio, Watermark } from "../kit/Overlay";
import { ContactShadow, FloorGlow, Particles } from "../kit/Stage";
import { cutsPassed, EASE_CINE, EASE_OUT, punchAt, screenAt, velBlur } from "../kit/theme";

/** Feature Burst — every feature beat is a new camera setup: the phone re-poses
 *  (center → drift left with a turn → drift right), the screen cuts, a chip
 *  slides in from an alternating side, and a light sweep sells the beat. */
export const FeaturePop: FC<PromoInputProps> = ({ deviceId, screenshots, texts, accent, background, pattern, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  usePreloadScreenshots(screenshots.map((s) => s.url));
  const features = [texts[0] ?? "", texts[1] ?? "", texts[2] ?? ""];

  const phoneW = Math.min(width * 0.54, (height * 0.56) / 2.03);
  const cues = [44, 128, 212]; // feature entrances = screen cuts = pose changes
  const shot = screenAt(screenshots, cutsPassed(frame, cues));

  // ── per-beat pose (pure fns of frame so velocity can drive motion blur)
  const poseXfn = (f: number) =>
    interpolate(f, [cues[1] - 16, cues[1] + 4, cues[2] - 16, cues[2] + 4], [0, -width * 0.055, -width * 0.055, width * 0.055], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_CINE });
  const poseRfn = (f: number) =>
    interpolate(f, [cues[1] - 16, cues[1] + 4, cues[2] - 16, cues[2] + 4], [0, 11, 11, -11], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_CINE });
  const poseX = poseXfn(frame);
  const rotY = poseRfn(frame) + Math.sin((frame / fps) * 0.8) * 4;

  const enter = spring({ frame, fps, config: { damping: 17, mass: 0.8, stiffness: 160 } });
  const float = Math.sin((frame / fps) * 1.5) * (height * 0.006);
  const scaleFn = (f: number) => interpolate(spring({ frame: f, fps, config: { damping: 17, mass: 0.8, stiffness: 160 } }), [0, 1], [0.82, 1]) + punchAt(f, cues, 0.06);
  const deviceScale = scaleFn(frame) * interpolate(frame, [0, dur], [1.02, 1.07], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const blur = velBlur(scaleFn(frame) * 100 + poseXfn(frame), scaleFn(frame - 1) * 100 + poseXfn(frame - 1), 0.7, 8);

  const outro = interpolate(frame, [dur - 18, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const groupO = interpolate(outro, [0, 1], [1, 0.3]);

  return (
    <AbsoluteFill style={{ opacity: groupO }}>
      {/* backdrop counter-drifts against the pose for depth */}
      <AbsoluteFill style={{ transform: `translateX(${poseX * -0.5}px) scale(1.05)` }}>
        <Background background={background} accent={accent} pattern={pattern} />
      </AbsoluteFill>
      <FloorGlow accent={accent} strength={0.13} />
      <Particles accent={accent} seed={19} />
      <PromoAudio musicUrl={musicUrl} />
      <Glow accent={accent} strength={0.2} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * 0.075 }}>
        <Eyebrow text="Why teams choose us" enterAt={6} size={width * 0.02} accent={accent} />
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", marginTop: -height * 0.05 }}>
        <div style={{ transform: `translate(${poseX}px, ${float}px)`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
          <div style={{ position: "relative" }}>
            <RealDeviceFrame deviceId={deviceId} width={phoneW} screenshot={shot} rotateY={rotY} scale={deviceScale} glare={0.12} />
            <ContactShadow width={phoneW} opacity={0.4 * interpolate(enter, [0, 1], [0, 1])} />
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: height * 0.08 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: height * 0.018, alignItems: "center" }}>
          {features.map((f, i) => {
            const start = cues[i];
            const end = cues[i + 1] ?? dur;
            const o = interpolate(frame, [start, start + 12, end - 14, end - 2], [0, 1, 1, 0.15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            // slide in from alternating sides
            const slideP = interpolate(frame, [start, start + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_CINE });
            const slideX = (i % 2 === 0 ? -1 : 1) * (1 - slideP) * width * 0.06;
            return (
              <div key={i} style={{ opacity: o, transform: `translateX(${slideX}px)` }}>
                <Chip text={f} enterAt={start} size={width * 0.032} accent={accent} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      {cues.map((c) => (
        <LightSweep key={c} startAt={c + 2} durationInFrames={20} />
      ))}
      <CutFlash cues={cues} />
      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
