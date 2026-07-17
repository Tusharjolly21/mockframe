import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { RealDeviceFrame, usePreloadScreenshots } from "../kit/RealDeviceFrame";
import { Chip, Eyebrow } from "../kit/AnimatedText";
import { CutFlash, PromoAudio, Watermark } from "../kit/Overlay";
import { cutsPassed, EASE_OUT, punchAt, rgba, screenAt } from "../kit/theme";

/** Feature Burst — the phone holds centre while three feature chips slam in one
 *  after another, each firing a zoom-punch and cutting to the next app screen. */
export const FeaturePop: FC<PromoInputProps> = ({ deviceId, screenshots, texts, accent, background, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  usePreloadScreenshots(screenshots.map((s) => s.url));
  const features = [texts[0] ?? "", texts[1] ?? "", texts[2] ?? ""];

  const phoneW = Math.min(width * 0.54, (height * 0.56) / 2.03);
  const cues = [44, 128, 212]; // feature entrances = screen cuts
  const shot = screenAt(screenshots, cutsPassed(frame, cues));

  const enter = spring({ frame, fps, config: { damping: 17, mass: 0.8, stiffness: 160 } });
  const float = Math.sin((frame / fps) * 1.5) * (height * 0.006);
  const rotY = Math.sin((frame / fps) * 0.8) * 6;
  const deviceScale = interpolate(enter, [0, 1], [0.82, 1]) + punchAt(frame, cues, 0.05);

  const outro = interpolate(frame, [durationInFrames - 18, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const groupO = interpolate(outro, [0, 1], [1, 0.3]);

  return (
    <AbsoluteFill style={{ opacity: groupO }}>
      <Background background={background} accent={accent} />
      <PromoAudio musicUrl={musicUrl} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * 0.075 }}>
        <Eyebrow text="Why teams choose us" enterAt={6} size={width * 0.02} accent={accent} />
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", marginTop: -height * 0.05 }}>
        <div style={{ transform: `translateY(${float}px)` }}>
          <RealDeviceFrame deviceId={deviceId} width={phoneW} screenshot={shot} rotateY={rotY} scale={deviceScale} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: height * 0.08 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: height * 0.018, alignItems: "center" }}>
          {features.map((f, i) => {
            // each chip is visible from its cue and gently lifts away just before the next
            const start = cues[i];
            const end = cues[i + 1] ?? durationInFrames;
            const o = interpolate(frame, [start, start + 12, end - 14, end - 2], [0, 1, 1, 0.15], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
            return (
              <div key={i} style={{ opacity: o }}>
                <Chip text={f} enterAt={start} size={width * 0.032} accent={accent} />
              </div>
            );
          })}
        </div>
      </AbsoluteFill>

      <CutFlash cues={cues} />
      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
