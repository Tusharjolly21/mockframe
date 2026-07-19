import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { RealDeviceFrame, usePreloadScreenshots } from "../kit/RealDeviceFrame";
import { Caption, Eyebrow, MaskHeadline } from "../kit/AnimatedText";
import { CutFlash, Glow, PromoAudio, Watermark } from "../kit/Overlay";
import { ContactShadow, FloorGlow, Particles } from "../kit/Stage";
import { EASE_IN_OUT, EASE_OUT, rgba, screenAt } from "../kit/theme";

/** Scroll Story — the phone rises, then each app screen scrolls top-to-bottom.
 *  The phone leans with scroll inertia (like a hand-held device), a glowing
 *  rail tracks progress, and each screen swap is motion-blurred. */
export const ScrollStory: FC<PromoInputProps> = ({ deviceId, screenshots, texts, accent, background, pattern, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  usePreloadScreenshots(screenshots.map((s) => s.url), screenshots.map((s) => s.kind));
  const [headline = "", subhead = ""] = texts;

  const phoneW = Math.min(width * 0.56, (height * 0.58) / 2.03);
  const rise = spring({ frame: frame - 6, fps, config: { damping: 16, mass: 0.8, stiffness: 150 } });
  const phoneY = interpolate(rise, [0, 1], [height * 0.55, 0]);
  const enterScale = interpolate(rise, [0, 1], [0.9, 1]);
  const dolly = interpolate(frame, [0, dur], [1.02, 1.07], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // divide the post-intro time evenly across the screens
  const intro = 36;
  const n = screenshots.length;
  const segLen = Math.max(1, (dur - intro) / n);
  const local = Math.max(0, frame - intro);
  const seg = Math.min(n - 1, Math.floor(local / segLen));
  const shot = screenAt(screenshots, seg);
  const cuts = Array.from({ length: n - 1 }, (_, i) => intro + (i + 1) * segLen);

  // pan as a pure fn of frame → scroll-velocity tilt (device leans with inertia)
  const panAt = (f: number) => {
    const loc = Math.max(0, f - intro);
    const sg = Math.min(n - 1, Math.floor(loc / segLen));
    const inS = loc - sg * segLen;
    return interpolate(inS, [segLen * 0.1, segLen * 0.9], [0.4, -0.4], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_IN_OUT });
  };
  const panY = panAt(frame);
  const scrollVel = panAt(frame) - panAt(frame - 1);
  const leanX = Math.max(-6, Math.min(6, scrollVel * -240));

  // overall progress for the rail
  const progress = interpolate(local, [0, n * segLen], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const railO = interpolate(frame, [intro - 6, intro + 8], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // brief blur at each cut so the swap reads as a designed transition
  const blur = cuts.reduce((b, c) => b + interpolate(frame, [c - 6, c - 1, c + 1, c + 7], [0, 7, 7, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }), 0);

  const rotY = Math.sin((frame / fps) * 0.7) * 5;
  const outro = interpolate(frame, [dur - 16, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const groupO = interpolate(outro, [0, 1], [1, 0.3]);

  return (
    <AbsoluteFill style={{ opacity: groupO }}>
      <Background background={background} accent={accent} pattern={pattern} />
      <FloorGlow accent={accent} strength={0.13} />
      <Particles accent={accent} seed={23} />
      <PromoAudio musicUrl={musicUrl} />
      <Glow accent={accent} strength={0.2} />

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * 0.07 }}>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: height * 0.02 }}>
          <Eyebrow text="See it in action" enterAt={4} size={width * 0.02} accent={accent} />
          <MaskHeadline text={headline} enterAt={12} size={width * 0.05} maxWidth={width * 0.86} accent={accent} />
        </div>
      </AbsoluteFill>

      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", marginTop: height * 0.03 }}>
        <div style={{ display: "flex", alignItems: "center", gap: width * 0.035, transform: `translateY(${phoneY}px)`, filter: blur > 0.3 ? `blur(${blur}px)` : undefined }}>
          <div style={{ position: "relative" }}>
            <RealDeviceFrame deviceId={deviceId} width={phoneW} screenshot={shot} rotateX={leanX} rotateY={rotY} scale={enterScale * dolly} zoom={1.14} panY={panY} glare={0.1} />
            <ContactShadow width={phoneW} opacity={0.4 * rise} />
          </div>
          {/* progress rail with accent glow */}
          <div style={{ width: width * 0.007, height: phoneW * 1.4, borderRadius: 999, background: "rgba(255,255,255,0.1)", overflow: "hidden", opacity: railO }}>
            <div style={{ width: "100%", height: `${Math.max(6, progress * 100)}%`, borderRadius: 999, background: `linear-gradient(${accent}, ${rgba(accent, 0.4)})`, boxShadow: `0 0 12px ${rgba(accent, 0.8)}` }} />
          </div>
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
