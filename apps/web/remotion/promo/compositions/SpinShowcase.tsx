import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { RealDeviceFrame, usePreloadScreenshots } from "../kit/RealDeviceFrame";
import { Caption, Eyebrow, MaskHeadline } from "../kit/AnimatedText";
import { CutFlash, Glow, LightSweep, PromoAudio, Watermark } from "../kit/Overlay";
import { cutsPassed, EASE_OUT, screenAt, velBlur } from "../kit/theme";

/** Fast turntable — the phone whips in and snaps between app screens on quick
 *  whip-turns, motion-blurred at the turn so the swap reads clean. */
export const SpinShowcase: FC<PromoInputProps> = ({ deviceId, screenshots, texts, accent, background, pattern, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  usePreloadScreenshots(screenshots.map((s) => s.url));
  const [headline = "", caption = ""] = texts;

  const phoneW = Math.min(width * 0.58, (height * 0.6) / 2.03);
  const cuts = [78, 146, 210];
  const shot = screenAt(screenshots, cutsPassed(frame, cuts));

  // rotation as a pure fn of frame → derive velocity for motion blur
  const rotYfn = (f: number) => {
    const enter = spring({ frame: f, fps, config: { damping: 16, mass: 0.7, stiffness: 190 } });
    const enterRotY = interpolate(enter, [0, 1], [-84, 0]);
    let whip = 0;
    for (const c of cuts) whip += interpolate(f, [c - 8, c, c + 8], [0, -76, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
    const sway = Math.sin((f / fps) * 1.3) * 8;
    return enterRotY + whip + sway;
  };
  const rotY = rotYfn(frame);
  const blur = velBlur(rotYfn(frame), rotYfn(frame - 1), 0.5, 9);

  const enter = spring({ frame, fps, config: { damping: 16, mass: 0.7, stiffness: 190 } });
  const enterScale = interpolate(enter, [0, 1], [0.78, 1]);
  const dolly = interpolate(frame, [0, dur], [1.02, 1.08], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const rotX = Math.cos((frame / fps) * 0.9) * 4;

  const half = dur * 0.5;
  const headlineO = interpolate(frame, [8, 26, half - 8, half + 6], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const captionO = interpolate(frame, [half, half + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outro = interpolate(frame, [dur - 16, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const groupO = interpolate(outro, [0, 1], [1, 0.3]);

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ transform: `translateX(${rotY * 0.8}px) scale(1.06)` }}>
        <Background background={background} accent={accent} pattern={pattern} />
      </AbsoluteFill>
      <PromoAudio musicUrl={musicUrl} />
      <Glow accent={accent} strength={0.22} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * 0.09, opacity: groupO }}>
        <Eyebrow text="Take a closer look" enterAt={5} size={width * 0.02} accent={accent} />
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: groupO }}>
        <div style={{ filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
          <RealDeviceFrame deviceId={deviceId} width={phoneW} screenshot={shot} rotateX={rotX} rotateY={rotY} scale={enterScale * dolly} perspective={width * 2.2} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: height * 0.1, opacity: groupO }}>
        <div style={{ position: "relative", height: width * 0.16, width: width * 0.84 }}>
          <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", opacity: headlineO }}>
            <MaskHeadline text={headline} enterAt={8} size={width * 0.052} maxWidth={width * 0.84} accent={accent} />
          </div>
          <div style={{ position: "absolute", inset: 0, display: "flex", justifyContent: "center", opacity: captionO }}>
            <Caption text={caption} enterAt={half} size={width * 0.032} maxWidth={width * 0.8} />
          </div>
        </div>
      </AbsoluteFill>

      <LightSweep startAt={34} />
      <CutFlash cues={cuts} />
      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
