import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { RealDeviceFrame, usePreloadScreenshots } from "../kit/RealDeviceFrame";
import { Caption, Eyebrow, Headline } from "../kit/AnimatedText";
import { CutFlash, LightSweep, PromoAudio, Watermark } from "../kit/Overlay";
import { cutsPassed, EASE_OUT, rgba, screenAt } from "../kit/theme";

/** Fast turntable — the phone whips in with a quick spin, then snaps between app
 *  screens with fast whip-turns (screen swaps hidden at the turn). Ad energy. */
export const SpinShowcase: FC<PromoInputProps> = ({ deviceId, screenshots, texts, accent, background, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  usePreloadScreenshots(screenshots.map((s) => s.url));
  const [headline = "", caption = ""] = texts;

  const phoneW = Math.min(width * 0.58, (height * 0.6) / 2.03);
  const cuts = [78, 146, 210];
  const shot = screenAt(screenshots, cutsPassed(frame, cuts));

  // quick whip entrance
  const enter = spring({ frame, fps, config: { damping: 16, mass: 0.7, stiffness: 190 } });
  const enterRotY = interpolate(enter, [0, 1], [-82, 0]);
  const enterScale = interpolate(enter, [0, 1], [0.78, 1]);

  // a fast whip at each cut (swap hidden near the turn peak) + a little idle sway
  let whip = 0;
  for (const c of cuts) whip += interpolate(frame, [c - 8, c, c + 8], [0, -74, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const sway = Math.sin((frame / fps) * 1.3) * 9;
  const rotY = enterRotY + whip + sway;
  const rotX = Math.cos((frame / fps) * 0.9) * 4;

  const half = durationInFrames * 0.5;
  const headlineO = interpolate(frame, [8, 26, half - 8, half + 6], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const captionO = interpolate(frame, [half, half + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const outro = interpolate(frame, [durationInFrames - 16, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const groupO = interpolate(outro, [0, 1], [1, 0.3]);

  return (
    <AbsoluteFill>
      <Background background={background} accent={accent} />
      <PromoAudio musicUrl={musicUrl} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * 0.09, opacity: groupO }}>
        <Eyebrow text="Take a closer look" enterAt={5} size={width * 0.02} accent={accent} />
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: groupO }}>
        <div style={{ }}>
          <RealDeviceFrame deviceId={deviceId} width={phoneW} screenshot={shot} rotateX={rotX} rotateY={rotY} scale={enterScale} perspective={width * 2.2} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: height * 0.1, opacity: groupO }}>
        <div style={{ position: "relative", height: width * 0.14, width: width * 0.84 }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", opacity: headlineO }}>
            <Headline text={headline} enterAt={0} size={width * 0.052} maxWidth={width * 0.84} />
          </div>
          <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", opacity: captionO }}>
            <Caption text={caption} enterAt={0} size={width * 0.032} maxWidth={width * 0.8} />
          </div>
        </div>
      </AbsoluteFill>

      <LightSweep startAt={34} />
      <CutFlash cues={cuts} />
      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
