import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { RealDeviceFrame, usePreloadScreenshots } from "../kit/RealDeviceFrame";
import { Caption, Eyebrow, Headline } from "../kit/AnimatedText";
import { CutFlash, PromoAudio, Watermark } from "../kit/Overlay";
import { EASE_IN_OUT, EASE_OUT, rgba, screenAt } from "../kit/theme";

/** Scroll Story — the phone rises, then each app screen scrolls top-to-bottom
 *  before a hard cut to the next. Adapts its segments to the screenshot count. */
export const ScrollStory: FC<PromoInputProps> = ({ deviceId, screenshots, texts, accent, background, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames } = useVideoConfig();
  usePreloadScreenshots(screenshots.map((s) => s.url));
  const [headline = "", subhead = ""] = texts;

  const phoneW = Math.min(width * 0.56, (height * 0.58) / 2.03);
  const rise = spring({ frame: frame - 6, fps, config: { damping: 16, mass: 0.8, stiffness: 150 } });
  const phoneY = interpolate(rise, [0, 1], [height * 0.55, 0]);
  const enterScale = interpolate(rise, [0, 1], [0.9, 1]);

  // divide the post-intro time evenly across the screens
  const intro = 36;
  const n = screenshots.length;
  const segLen = Math.max(1, (durationInFrames - intro) / n);
  const local = Math.max(0, frame - intro);
  const seg = Math.min(n - 1, Math.floor(local / segLen));
  const inSeg = local - seg * segLen;
  const panY = interpolate(inSeg, [segLen * 0.1, segLen * 0.9], [0.4, -0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_IN_OUT });
  const shot = screenAt(screenshots, seg);
  const cuts = Array.from({ length: n - 1 }, (_, i) => intro + (i + 1) * segLen);

  const rotY = Math.sin((frame / fps) * 0.7) * 5;
  const outro = interpolate(frame, [durationInFrames - 16, durationInFrames], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const groupO = interpolate(outro, [0, 1], [1, 0.3]);

  return (
    <AbsoluteFill style={{ opacity: groupO }}>
      <Background background={background} accent={accent} />
      <PromoAudio musicUrl={musicUrl} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * 0.07 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: height * 0.02 }}>
          <Eyebrow text="See it in action" enterAt={4} size={width * 0.02} accent={accent} />
          <Headline text={headline} enterAt={12} size={width * 0.05} maxWidth={width * 0.86} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", marginTop: height * 0.03 }}>
        <div style={{ transform: `translateY(${phoneY}px)` }}>
          <RealDeviceFrame deviceId={deviceId} width={phoneW} screenshot={shot} rotateY={rotY} scale={enterScale} zoom={1.14} panY={panY} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: height * 0.075 }}>
        <Caption text={subhead} enterAt={26} size={width * 0.03} maxWidth={width * 0.8} />
      </AbsoluteFill>

      <CutFlash cues={cuts} />
      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
