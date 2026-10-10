import type { FC } from "react";
import { AbsoluteFill, Img, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import type { PromoInputProps, PromoScreenshot } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { RealDeviceFrame, usePreloadScreenshots } from "../kit/RealDeviceFrame";
import { CharHeadline, Chip, Eyebrow } from "../kit/AnimatedText";
import { CutFlash, LightSweep, PromoAudio, Watermark } from "../kit/Overlay";
import { ContactShadow, Particles } from "../kit/Stage";
import { deviceAspect, ZoomCallout } from "../kit/MultiDevice";
import { cutsPassed, EASE_CINE, EASE_IN_EXPO, EASE_OUT, rgba, screenAt } from "../kit/theme";

/** One screen card in the isometric wall. */
const WallCard: FC<{ shot: PromoScreenshot | undefined; w: number; accent: string; i: number }> = ({ shot, w, accent, i }) => {
  const ratio = shot ? Math.min(2.2, Math.max(0.6, shot.height / shot.width)) : 2;
  const h = w * ratio;
  const base: React.CSSProperties = {
    width: w,
    height: h,
    borderRadius: w * 0.09,
    overflow: "hidden",
    border: "1px solid rgba(255,255,255,0.14)",
    boxShadow: `0 ${w * 0.08}px ${w * 0.2}px rgba(0,0,0,0.45), 0 0 ${w * 0.08}px ${rgba(accent, i % 3 === 0 ? 0.25 : 0)}`,
    flexShrink: 0,
  };
  if (!shot || shot.kind === "video") {
    return <div style={{ ...base, background: `linear-gradient(160deg, ${rgba(accent, 0.35)}, rgba(20,20,28,0.9))` }} />;
  }
  return (
    <div style={base}>
      <Img src={shot.url} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
};

/**
 * UI Showcase — opens on an isometric wall of the app's screens gliding in
 * opposing columns, then the camera dives through the wall to a hero phone
 * ringed by magnified UI panels and feature chips.
 */
export const UIShowcase: FC<PromoInputProps> = ({ deviceId, screenshots, texts, accent, background, pattern, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  usePreloadScreenshots(screenshots.map((s) => s.url), screenshots.map((s) => s.kind));
  const [headline = "", f1 = "", f2 = "", f3 = ""] = texts;
  const portrait = height > width * 1.2;
  const u = Math.min(width, height);
  const t = frame / fps;

  // ── phase 1: isometric wall
  const cols = portrait ? 5 : 8;
  const cardW = u * 0.3;
  const gap = cardW * 0.16;
  const dive = interpolate(frame, [96, 138], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_IN_EXPO });
  const wallScale = interpolate(dive, [0, 1], [1, 2.6]);
  const wallO = interpolate(dive, [0, 0.7, 1], [1, 0.5, 0.14]);
  const wallBlur = interpolate(dive, [0, 1], [0, 14]);
  const wallIn = spring({ frame, fps, config: { damping: 22, stiffness: 70 } });

  // ── phase 2: hero phone + floating UI panels
  const heroAt = 122;
  const hero = spring({ frame: frame - heroAt, fps, config: { damping: 15, mass: 0.9, stiffness: 120 } });
  const phoneW = Math.min(width * 0.42, (height * (portrait ? 0.46 : 0.62)) / deviceAspect(deviceId));
  const cuts = [206, 252];
  const shot = screenAt(screenshots, cutsPassed(frame, cuts));
  const rotY = interpolate(frame, [heroAt, dur], [-14, 10], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_CINE }) + noise2D("ry", t * 0.3, 0) * 3;
  const rotX = 6 + noise2D("rx", t * 0.25, 0) * 2;
  const floatY = noise2D("fy", t * 0.4, 0) * u * 0.012;

  const panelW = phoneW * 0.85;
  const panels = [
    { at: 150, x: -0.95, y: -0.28, fx: 0.2, fy: 0.15, chip: f1 },
    { at: 172, x: 0.95, y: 0.02, fx: 0.8, fy: 0.45, chip: f2 },
    { at: 194, x: -0.9, y: 0.32, fx: 0.4, fy: 0.85, chip: f3 },
  ];
  const panelP = (at: number) => interpolate(frame, [at, at + 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });

  const outro = interpolate(frame, [dur - 14, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const headlineY = interpolate(dive, [0, 1], [height * 0.32, 0]);
  const cy = height * (portrait ? 0.56 : 0.58);

  return (
    <AbsoluteFill style={{ opacity: interpolate(outro, [0, 1], [1, 0.35]) }}>
      <Background background={background} accent={accent} pattern={pattern} />
      <PromoAudio musicUrl={musicUrl} />

      {/* isometric wall */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "center", opacity: wallO * wallIn, filter: wallBlur > 0.3 ? `blur(${wallBlur}px)` : undefined }}>
        <div style={{ display: "flex", gap, transform: `scale(${wallScale * interpolate(wallIn, [0, 1], [0.85, 1])}) rotateX(52deg) rotateZ(-38deg)`, transformStyle: "preserve-3d" }}>
          {Array.from({ length: cols }, (_, c) => {
            const dir = c % 2 === 0 ? 1 : -1;
            const offset = dir * frame * u * 0.0035 + (c % 2 ? -cardW * 1.6 : 0);
            return (
              <div key={c} style={{ display: "flex", flexDirection: "column", gap, transform: `translateY(${offset}px)` }}>
                {Array.from({ length: 5 }, (_, r) => (
                  <WallCard key={r} shot={screenshots.length ? screenAt(screenshots, c * 2 + r) : undefined} w={cardW} accent={accent} i={c + r} />
                ))}
              </div>
            );
          })}
        </div>
      </AbsoluteFill>
      {/* scrim so the copy pops over the wall */}
      <AbsoluteFill style={{ background: `radial-gradient(80% 60% at 50% 50%, rgba(0,0,0,${0.45 * (1 - dive)}) 0%, transparent 80%)` }} />

      <Particles accent={accent} seed={53} count={18} />

      {/* hero phone */}
      <div style={{ position: "absolute", left: width / 2 - phoneW / 2, top: cy - (phoneW * deviceAspect(deviceId)) / 2 + floatY + (1 - hero) * height * 0.5, opacity: hero }}>
        <div style={{ position: "relative" }}>
          <RealDeviceFrame deviceId={deviceId} width={phoneW} screenshot={shot} rotateX={rotX} rotateY={rotY} scale={interpolate(hero, [0, 1], [0.8, 1])} perspective={width * 2.4} glare={0.13} />
          <ContactShadow width={phoneW} opacity={0.4 * hero} />
        </div>
      </div>

      {/* floating magnified UI panels with chips */}
      {panels.map((p, i) => {
        const pp = panelP(p.at);
        const drift = noise2D(`p${i}`, t * 0.35, 0) * u * 0.01;
        return (
          <div key={i} style={{ position: "absolute", left: width / 2 + p.x * phoneW * (portrait ? 0.62 : 0.9) - panelW / 2, top: cy + p.y * phoneW * deviceAspect(deviceId) * 0.75 - panelW * 0.33 + drift, display: "flex", flexDirection: "column", alignItems: "center", gap: u * 0.016 }}>
            <ZoomCallout shot={shot} fx={p.fx} fy={p.fy} w={panelW} h={panelW * 0.62} zoom={2.2} p={pp} accent={accent} />
            {p.chip && pp > 0 && <Chip text={p.chip} enterAt={p.at + 10} size={u * 0.024} accent={accent} />}
          </div>
        );
      })}

      {/* copy: centred over the wall, then rides to the top */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * 0.07, transform: `translateY(${headlineY}px)`, gap: height * 0.018 }}>
        <Eyebrow text="Every screen, considered" enterAt={8} size={u * 0.02} accent={accent} />
        <CharHeadline text={headline} enterAt={16} size={u * interpolate(dive, [0, 1], [0.095, 0.07])} maxWidth={width * 0.88} accent={accent} />
      </AbsoluteFill>

      <LightSweep startAt={136} durationInFrames={28} />
      <CutFlash cues={[120, ...cuts]} strength={0.35} />
      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
