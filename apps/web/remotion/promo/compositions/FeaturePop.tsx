import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { DeviceFrame } from "../kit/DeviceFrame";
import { Chip, Eyebrow } from "../kit/AnimatedText";
import { PromoAudio, Watermark } from "../kit/Overlay";
import { EASE_OUT } from "../kit/theme";

/** Feature Pop — the phone holds centre while three feature chips pop in one by
 *  one, each accompanied by a subtle zoom-to-device pulse. */
export const FeaturePop: FC<PromoInputProps> = ({ screenshotUrl, texts, accent, background, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const features = [texts[0] ?? "", texts[1] ?? "", texts[2] ?? ""];

  const phoneW = Math.min(width * 0.5, (height * 0.56) / 2.03);
  const enter = spring({ frame, fps, config: { damping: 20, mass: 1, stiffness: 120 } });
  const float = Math.sin((frame / fps) * 1.3) * (height * 0.006);

  // each feature enters at these frames; the device gives a tiny zoom pulse on each
  const cues = [42, 100, 158];
  const pulse = cues.reduce((acc, c) => acc + Math.max(0, 1 - Math.abs(frame - c) / 12) * 0.03, 0);
  const deviceScale = interpolate(enter, [0, 1], [0.85, 1]) + pulse;

  const outro = interpolate(frame, [durationInFrames - 20, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const groupOpacity = interpolate(outro, [0, 1], [1, 0.3]);

  return (
    <AbsoluteFill style={{ opacity: groupOpacity }}>
      <Background background={background} accent={accent} />
      <PromoAudio musicUrl={musicUrl} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * 0.075 }}>
        <Eyebrow text="Why teams choose us" enterAt={6} size={width * 0.02} accent={accent} />
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", marginTop: -height * 0.06 }}>
        <div style={{ transform: `translateY(${float}px) scale(${deviceScale})`, opacity: interpolate(enter, [0, 1], [0, 1]) }}>
          <DeviceFrame width={phoneW} screenshotUrl={screenshotUrl} accent={accent} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: height * 0.08 }}>
        <div style={{ display: "flex", flexDirection: "column", gap: height * 0.018, alignItems: "center" }}>
          {features.map((f, i) => (
            <Chip key={i} text={f} enterAt={cues[i]} size={width * 0.03} accent={accent} />
          ))}
        </div>
      </AbsoluteFill>

      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
