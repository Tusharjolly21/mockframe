import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { DeviceFrame } from "../kit/DeviceFrame";
import { Caption, Eyebrow, Headline } from "../kit/AnimatedText";
import { LightSweep, PromoAudio, Watermark } from "../kit/Overlay";
import { EASE_IN_OUT, EASE_OUT, rgba } from "../kit/theme";

/** Scroll Story — the phone rises, then the screenshot auto-scrolls top to
 *  bottom to reveal the whole app, with a thin progress rail and pinned copy. */
export const ScrollStory: FC<PromoInputProps> = ({ screenshotUrl, texts, accent, background, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  const [headline = "", subhead = ""] = texts;

  const phoneW = Math.min(width * 0.52, (height * 0.58) / 2.03);
  const rise = spring({ frame: frame - 8, fps, config: { damping: 19, mass: 0.95, stiffness: 120 } });
  const phoneY = interpolate(rise, [0, 1], [height * 0.5, 0]);
  const phoneScale = interpolate(rise, [0, 1], [0.9, 1]);

  const scrollStart = 40;
  const scrollEnd = Math.round(durationInFrames * 0.82);
  const scroll = interpolate(frame, [scrollStart, scrollEnd], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_IN_OUT });

  const outro = interpolate(frame, [durationInFrames - 18, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const groupOpacity = interpolate(outro, [0, 1], [1, 0.35]);

  return (
    <AbsoluteFill style={{ opacity: groupOpacity }}>
      <Background background={background} accent={accent} />
      <PromoAudio musicUrl={musicUrl} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * 0.07 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: height * 0.02 }}>
          <Eyebrow text="See it in action" enterAt={4} size={width * 0.02} accent={accent} />
          <Headline text={headline} enterAt={12} size={width * 0.05} maxWidth={width * 0.86} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", marginTop: height * 0.03 }}>
        <div style={{ display: "flex", alignItems: "center", gap: width * 0.03, transform: `translateY(${phoneY}px) scale(${phoneScale})` }}>
          <DeviceFrame width={phoneW} screenshotUrl={screenshotUrl} accent={accent} scrollProgress={scroll} />
          {/* scroll progress rail */}
          <div style={{ width: width * 0.008, height: phoneW * 1.5, borderRadius: 999, background: "rgba(255,255,255,0.12)", overflow: "hidden", opacity: interpolate(frame, [scrollStart - 8, scrollStart + 6], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }) }}>
            <div style={{ width: "100%", height: `${Math.max(8, scroll * 100)}%`, background: `linear-gradient(${accent}, ${rgba(accent, 0.4)})`, borderRadius: 999 }} />
          </div>
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: height * 0.075 }}>
        <Caption text={subhead} enterAt={30} size={width * 0.03} maxWidth={width * 0.8} />
      </AbsoluteFill>

      <LightSweep startAt={scrollEnd} />
      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
