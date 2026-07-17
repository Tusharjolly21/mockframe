import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { RealDeviceFrame, usePreloadScreenshots } from "../kit/RealDeviceFrame";
import { Caption, Eyebrow, MaskHeadline } from "../kit/AnimatedText";
import { LightSweep, PromoAudio, Watermark } from "../kit/Overlay";
import { cutsPassed, EASE_CINE, EASE_OUT, rgba, screenAt } from "../kit/theme";

/**
 * Hero Launch — a cinematic app-launch spot:
 *   hook (mask-reveal type) → weighted device arrival with motion blur →
 *   camera dolly + banking with zoom-blur-through screen transitions →
 *   a glow payoff and settle.
 */
export const RiseReveal: FC<PromoInputProps> = ({ deviceId, screenshots, texts, accent, background, pattern, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  usePreloadScreenshots(screenshots.map((s) => s.url));
  const [headline = "", caption = ""] = texts;

  const phoneW = Math.min(width * 0.6, (height * 0.58) / 2.03);
  const cuts = [138, 214];
  const shot = screenAt(screenshots, cutsPassed(frame, cuts));

  // ── device entrance (weighted, slight overshoot) — as a pure fn of frame so
  //    we can derive velocity for motion blur.
  const enterAt = 28;
  const enter = (f: number) => spring({ frame: f - enterAt, fps, config: { damping: 14, mass: 0.85, stiffness: 130 } });
  const yPct = (f: number) => interpolate(enter(f), [0, 1], [82, 0]);
  const e = enter(frame);
  const enterScale = interpolate(e, [0, 1], [0.82, 1]);
  const enterRotX = interpolate(e, [0, 1], [15, 0]);

  // ── zoom-blur-through transitions on cuts (a designed screen swap, not a cut)
  const throughScale = cuts.reduce((s, c) => s + interpolate(frame, [c - 10, c, c + 12], [0, 0.16, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), 0);
  const throughBlur = cuts.reduce((b, c) => b + interpolate(frame, [c - 8, c - 1, c + 1, c + 10], [0, 9, 9, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), 0);

  // ── motion blur from device velocity (entrance) + transition blur
  const entranceBlur = Math.min(10, Math.abs(yPct(frame) - yPct(frame - 1)) * 0.6);
  const blur = entranceBlur + throughBlur;

  // ── camera: slow dolly push-in + banking through the beats + idle float
  const dolly = interpolate(frame, [0, dur], [1.03, 1.09], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const bank = interpolate(frame, [72, 150, 224, 276], [-2, -9, 8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_CINE });
  const floatY = Math.sin((frame / fps) * 1.4) * (height * 0.004);
  const deviceScale = enterScale * dolly * (1 + throughScale);

  // ── glow payoff behind the device (blooms toward the CTA)
  const glow = interpolate(frame, [150, 240, dur], [0.1, 0.42, 0.3], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // ── copy
  const headlineO = interpolate(frame, [0, 20, dur - 20, dur], [1, 1, 1, 0.25], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const outro = interpolate(frame, [dur - 18, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const outroLift = interpolate(outro, [0, 1], [0, -height * 0.025]);

  return (
    <AbsoluteFill>
      {/* parallax backdrop — drifts opposite the bank for depth */}
      <AbsoluteFill style={{ transform: `translateX(${bank * -1.6}px) scale(1.06)` }}>
        <Background background={background} accent={accent} pattern={pattern} />
      </AbsoluteFill>
      <PromoAudio musicUrl={musicUrl} />

      {/* glow bloom behind the device */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center" }}>
        <div style={{ width: width * 0.9, height: width * 0.9, borderRadius: "50%", background: `radial-gradient(circle, ${rgba(accent, glow)} 0%, transparent 62%)`, filter: "blur(20px)" }} />
      </AbsoluteFill>

      {/* copy — top */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * 0.075, transform: `translateY(${outroLift}px)`, opacity: headlineO }}>
        <Eyebrow text="Introducing" enterAt={4} size={width * 0.021} accent={accent} />
        <div style={{ marginTop: height * 0.022 }}>
          <MaskHeadline text={headline} enterAt={12} size={width * 0.066} maxWidth={width * 0.86} accent={accent} />
        </div>
      </AbsoluteFill>

      {/* device — the star */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", marginTop: height * 0.055, transform: `translateY(${outroLift}px)` }}>
        <div style={{ transform: `translateY(${yPct(frame) * (height / 100) + floatY}px)`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
          <RealDeviceFrame deviceId={deviceId} width={phoneW} screenshot={shot} rotateX={enterRotX} rotateY={bank} scale={deviceScale} perspective={width * 2.4} />
        </div>
      </AbsoluteFill>

      {/* tagline — bottom */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: height * 0.07, transform: `translateY(${outroLift}px)`, opacity: interpolate(outro, [0, 1], [1, 0.3]) }}>
        <Caption text={caption} enterAt={72} size={width * 0.032} maxWidth={width * 0.82} />
      </AbsoluteFill>

      <LightSweep startAt={60} />
      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
