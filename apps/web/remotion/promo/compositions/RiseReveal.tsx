import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { DeviceFrame } from "../kit/DeviceFrame";
import { Caption, Eyebrow, Headline } from "../kit/AnimatedText";
import { LightSweep, PromoAudio, Watermark } from "../kit/Overlay";
import { EASE_OUT } from "../kit/theme";

/** Rise & Reveal — title in, phone springs up from below, settles and floats,
 *  caption slides in, then a gentle outro lift. */
export const RiseReveal: FC<PromoInputProps> = ({ screenshotUrl, texts, accent, background, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [headline = "", caption = ""] = texts;

  const phoneW = Math.min(width * 0.56, (height * 0.62) / 2.03);

  const rise = spring({ frame: frame - 14, fps, config: { damping: 18, mass: 0.95, stiffness: 120 } });
  const phoneY = interpolate(rise, [0, 1], [height * 0.6, 0]);
  const float = Math.sin((frame / fps) * 1.5) * (height * 0.008);
  const phoneScale = interpolate(rise, [0, 1], [0.92, 1]);

  const outro = interpolate(frame, [durationInFrames - 20, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const groupY = interpolate(outro, [0, 1], [0, -height * 0.03]);
  const groupOpacity = interpolate(outro, [0, 1], [1, 0.3]);

  return (
    <AbsoluteFill>
      <Background background={background} accent={accent} />
      <PromoAudio musicUrl={musicUrl} />
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", transform: `translateY(${groupY}px)`, opacity: groupOpacity }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: height * 0.028 }}>
          <Eyebrow text="Introducing" enterAt={4} size={width * 0.022} accent={accent} />
          <Headline text={headline} enterAt={12} size={width * 0.062} maxWidth={width * 0.84} />
          <div style={{ transform: `translateY(${phoneY + float}px) scale(${phoneScale})`, marginTop: height * 0.012 }}>
            <DeviceFrame width={phoneW} screenshotUrl={screenshotUrl} accent={accent} />
          </div>
          <Caption text={caption} enterAt={62} size={width * 0.03} maxWidth={width * 0.78} />
        </div>
      </AbsoluteFill>
      <LightSweep startAt={70} />
      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
