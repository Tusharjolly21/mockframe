import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { RealDeviceFrame, usePreloadScreenshots } from "../kit/RealDeviceFrame";
import { Caption, Eyebrow, Headline } from "../kit/AnimatedText";
import { CutFlash, LightSweep, PromoAudio, Watermark } from "../kit/Overlay";
import { cutsPassed, EASE_OUT, punchAt, rgba, screenAt } from "../kit/theme";

/** Hero Launch — kinetic title, phone rockets up, punch-in, then cuts through
 *  each app screen with a light sweep, and a settle. Multiple beats, real frame. */
export const RiseReveal: FC<PromoInputProps> = ({ deviceId, screenshots, texts, accent, background, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  usePreloadScreenshots(screenshots.map((s) => s.url));
  const [headline = "", caption = ""] = texts;

  const phoneW = Math.min(width * 0.6, (height * 0.6) / 2.03);
  const cuts = [96, 160, 220];
  const shot = screenAt(screenshots, cutsPassed(frame, cuts));

  // rocket entrance
  const rise = spring({ frame: frame - 12, fps, config: { damping: 15, mass: 0.7, stiffness: 150 } });
  const phoneY = interpolate(rise, [0, 1], [height * 0.72, 0]);
  const enterRotZ = interpolate(rise, [0, 1], [-7, 0]);
  const float = Math.sin((frame / fps) * 1.7) * (height * 0.006);

  // life + energy: slow push-in + gentle Y swing + punch on each cut
  const pushIn = interpolate(frame, [20, durationInFrames], [1, 1.06], { extrapolateLeft: "clamp" });
  const rotY = Math.sin((frame / fps) * 0.9) * 7;
  const scale = interpolate(rise, [0, 1], [0.86, 1]) * pushIn + punchAt(frame, cuts, 0.05);

  const outro = interpolate(frame, [durationInFrames - 20, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const groupY = interpolate(outro, [0, 1], [0, -height * 0.03]);
  const groupOpacity = interpolate(outro, [0, 1], [1, 0.25]);

  return (
    <AbsoluteFill>
      <Background background={background} accent={accent} />
      <PromoAudio musicUrl={musicUrl} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * 0.08, transform: `translateY(${groupY}px)`, opacity: groupOpacity }}>
        <Eyebrow text="Introducing" enterAt={4} size={width * 0.021} accent={accent} />
        <div style={{ marginTop: height * 0.02 }}>
          <Headline text={headline} enterAt={10} size={width * 0.064} maxWidth={width * 0.86} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", marginTop: height * 0.06, opacity: groupOpacity }}>
        <div style={{ transform: `translateY(${phoneY + float}px)`, filter: `drop-shadow(0 40px 90px ${rgba(accent, 0.28)})` }}>
          <RealDeviceFrame deviceId={deviceId} width={phoneW} screenshot={shot} rotateY={rotY} rotateZ={enterRotZ} scale={scale} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: height * 0.07, opacity: groupOpacity }}>
        <Caption text={caption} enterAt={58} size={width * 0.03} maxWidth={width * 0.8} />
      </AbsoluteFill>

      <LightSweep startAt={60} />
      <CutFlash cues={cuts} />
      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
