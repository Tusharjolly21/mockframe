import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { noise2D } from "@remotion/noise";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { RealDeviceFrame, usePreloadScreenshots } from "../kit/RealDeviceFrame";
import { Caption, Chip, Eyebrow, MaskHeadline } from "../kit/AnimatedText";
import { CutFlash, LightSweep, PromoAudio, Watermark } from "../kit/Overlay";
import { ContactShadow } from "../kit/Stage";
import { StudioFloor } from "../kit/Shapes";
import { Sculpture3D } from "../kit/Sculpture3D";
import { deviceAspect, LAPTOP_ID, Reflection, shotFor, TABLET_ID } from "../kit/MultiDevice";
import { cutsPassed, EASE_CINE, EASE_OUT, rgba, velBlur } from "../kit/theme";

/**
 * Everywhere — the cross-platform lineup. Laptop, tablet and phone rise in
 * sequence onto a mirrored studio floor, framed by orbiting 3D shapes; the
 * camera arcs across the set, screens cut in unison, and a CTA lands.
 */
export const Everywhere: FC<PromoInputProps> = ({ deviceId, screenshots, texts, accent, background, pattern, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  usePreloadScreenshots(screenshots.map((s) => s.url), screenshots.map((s) => s.kind));
  const [headline = "", caption = "", cta = ""] = texts;
  const portrait = height > width * 1.2;
  const u = Math.min(width, height);
  const t = frame / fps;

  const lapA = deviceAspect(LAPTOP_ID);
  const tabA = deviceAspect(TABLET_ID);
  const phA = deviceAspect(deviceId);
  const lapW = Math.min(width * (portrait ? 0.78 : 0.5), (height * 0.36) / lapA);
  const tabW = lapW * (portrait ? 0.5 : 0.56);
  const phW = lapW * (portrait ? 0.24 : 0.22);
  const floorY = height * (portrait ? 0.66 : 0.76);

  const cuts = [170, 236];
  const beat = cutsPassed(frame, cuts);

  // camera arc across the lineup
  const arc = interpolate(frame, [0, dur], [-9, 9], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_CINE }) + noise2D("arc", t * 0.2, 0) * 1.5;
  const push = interpolate(frame, [0, dur], [0.97, 1.05], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const rise = (at: number) => (f: number) => spring({ frame: f - at, fps, config: { damping: 16, mass: 0.9, stiffness: 120 } });
  const devices = [
    { id: LAPTOP_ID, w: lapW, a: lapA, x: 0, z: 0, at: 30, rot: 0, idx: 0 },
    { id: TABLET_ID, w: tabW, a: tabA, x: portrait ? -0.42 : -0.78, z: 1, at: 52, rot: 16, idx: 1 },
    { id: deviceId, w: phW, a: phA, x: portrait ? 0.44 : 0.74, z: 2, at: 72, rot: -18, idx: 2 },
  ];

  const outro = interpolate(frame, [dur - 14, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });

  return (
    <AbsoluteFill style={{ opacity: interpolate(outro, [0, 1], [1, 0.35]) }}>
      <Background background={background} accent={accent} pattern={pattern} />
      <AbsoluteFill style={{ opacity: 0.85 }}>
        <Sculpture3D accent={accent} width={width} height={height} orbit={arc * 2} layout="orbit" />
      </AbsoluteFill>
      <StudioFloor accent={accent} horizon={floorY / height} />
      <PromoAudio musicUrl={musicUrl} />
      {/* accent horizon glow */}
      <div style={{ position: "absolute", left: 0, right: 0, top: floorY - u * 0.02, height: u * 0.04, background: `radial-gradient(50% 50% at 50% 50%, ${rgba(accent, 0.45)} 0%, transparent 100%)`, filter: "blur(6px)", pointerEvents: "none" }} />


      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        {devices.map((d) => {
          const fn = rise(d.at);
          const e = fn(frame);
          const yOff = interpolate(e, [0, 1], [height * 0.35, 0]);
          const blur = velBlur(interpolate(fn(frame), [0, 1], [height * 0.35, 0]), interpolate(fn(frame - 1), [0, 1], [height * 0.35, 0]), 0.05, 8);
          const h = d.w * d.a;
          // front devices sit a touch lower so the lineup has depth
          const baseY = floorY - h + d.z * u * 0.03;
          const el = <RealDeviceFrame deviceId={d.id} width={d.w} screenshot={shotFor(screenshots, d.id, beat + d.idx)} rotateY={arc + d.rot} rotateX={3} perspective={width * 2.6} glare={0.1} />;
          return (
            <div key={d.idx} style={{ position: "absolute", left: width / 2 + d.x * lapW * 0.62 - d.w / 2 + arc * -d.z * u * 0.002, top: baseY + yOff, opacity: interpolate(e, [0, 0.3], [0, 1], { extrapolateRight: "clamp" }), filter: blur > 0.3 ? `blur(${blur}px)` : undefined, zIndex: d.z }}>
              <div style={{ position: "relative" }}>
                {el}
                <ContactShadow width={d.w} opacity={0.4 * e} />
                <Reflection opacity={0.16 * e} fade={0.35}>
                  {el}
                </Reflection>
              </div>
            </div>
          );
        })}
      </AbsoluteFill>

      {/* copy */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * (portrait ? 0.08 : 0.06), gap: height * 0.018 }}>
        <Eyebrow text="Phone · Tablet · Desktop" enterAt={6} size={u * 0.02} accent={accent} />
        <MaskHeadline text={headline} enterAt={12} size={u * (portrait ? 0.08 : 0.07)} maxWidth={width * 0.88} accent={accent} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: height * (portrait ? 0.08 : 0.04), gap: height * 0.02 }}>
        <Caption text={caption} enterAt={100} size={u * 0.03} maxWidth={width * 0.8} />
        {cta && <Chip text={cta} enterAt={244} size={u * 0.03} accent={accent} />}
      </AbsoluteFill>

      <LightSweep startAt={112} durationInFrames={30} />
      <CutFlash cues={cuts} strength={0.3} />
      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
