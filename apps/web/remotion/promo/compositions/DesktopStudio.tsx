import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { RealDeviceFrame, usePreloadScreenshots } from "../kit/RealDeviceFrame";
import { Caption, Chip, Eyebrow, MaskHeadline } from "../kit/AnimatedText";
import { LightSweep, PromoAudio, Watermark } from "../kit/Overlay";
import { StudioFloor } from "../kit/Shapes";
import { deviceAspect, LAPTOP_ID, ScreenReflection, shotFor, ZoomCallout } from "../kit/MultiDevice";
import { cutsPassed, EASE_CINE, EASE_IN_OUT, EASE_OUT, rgba } from "../kit/theme";

/**
 * Desktop Studio — a realistic laptop hero shot. The camera sweeps from a low
 * three-quarter angle to front-on over a glossy studio floor, the display
 * powers on with a bloom, and magnified UI details float out of the screen.
 */
export const DesktopStudio: FC<PromoInputProps> = ({ screenshots, texts, accent, background, pattern, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  usePreloadScreenshots(screenshots.map((s) => s.url), screenshots.map((s) => s.kind));
  const [headline = "", caption = "", feature = ""] = texts;
  const portrait = height > width * 1.2;
  const u = Math.min(width, height);

  const lapA = deviceAspect(LAPTOP_ID);
  const lapW = Math.min(width * (portrait ? 0.9 : 0.62), (height * (portrait ? 0.36 : 0.52)) / lapA);
  const lapH = lapW * lapA;
  const horizon = portrait ? 0.6 : 0.8;
  // the laptop stands on the horizon line so its reflection meets the floor
  const lapCy = height * horizon - lapH;

  const cuts = [168, 240];
  const shot = shotFor(screenshots, LAPTOP_ID, cutsPassed(frame, cuts));

  // ── camera sweep: low 3/4 → front-on, then a slow push and drift
  const sweep = interpolate(frame, [0, 96], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_CINE });
  const rotY = interpolate(sweep, [0, 1], [-32, 0]) + interpolate(frame, [96, dur], [0, 5], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_IN_OUT });
  const rotX = interpolate(sweep, [0, 1], [16, 2]);
  const scale = interpolate(sweep, [0, 1], [0.78, 1]) * interpolate(frame, [96, dur], [1, 1.06], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const enter = spring({ frame, fps, config: { damping: 20, stiffness: 90 } });

  // ── display power-on: black glass → bloom → UI
  const power = interpolate(frame, [52, 74], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const bloom = interpolate(frame, [56, 66, 96], [0, 0.6, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const screenOverlay = (
    <>
      <div style={{ position: "absolute", inset: 0, background: "#050507", opacity: 1 - power }} />
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(circle at 50% 50%, rgba(255,255,255,${bloom}) 0%, ${rgba(accent, bloom * 0.6)} 40%, transparent 75%)` }} />
    </>
  );

  // ── zoom callouts float out of the screen
  const c1 = interpolate(frame, [112, 136, 196, 210], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const c2 = interpolate(frame, [212, 236, dur - 10, dur], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const calloutW = lapW * 0.36;
  const float = Math.sin((frame / fps) * 1.3) * u * 0.006;

  // ── screen light spill on the floor
  const spill = 0.18 * power;

  const outro = interpolate(frame, [dur - 14, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });

  const laptop = (
    <RealDeviceFrame deviceId={LAPTOP_ID} width={lapW} screenshot={shot} rotateX={rotX} rotateY={rotY} scale={scale} perspective={width * 2.4} glare={0.08} screenOverlay={screenOverlay} />
  );

  return (
    <AbsoluteFill style={{ opacity: interpolate(outro, [0, 1], [1, 0.35]) }}>
      <Background background={background} accent={accent} pattern={pattern} />
      <StudioFloor accent={accent} horizon={horizon} />
      <PromoAudio musicUrl={musicUrl} />

      {/* studio key light */}
      <AbsoluteFill style={{ background: `radial-gradient(60% 40% at 50% ${horizon * 100 - 22}%, rgba(255,255,255,0.08) 0%, transparent 70%)`, pointerEvents: "none" }} />
      {/* screen light spill */}
      <div style={{ position: "absolute", left: "50%", top: `${horizon * 100}%`, width: lapW * 1.6, height: lapH * 0.7, transform: "translate(-50%, -30%)", background: `radial-gradient(ellipse at 50% 30%, ${rgba(accent, spill)} 0%, transparent 68%)`, pointerEvents: "none" }} />

      {/* laptop + floor reflection */}
      <div style={{ position: "absolute", left: width / 2 - lapW / 2, top: lapCy, width: lapW, height: lapH, opacity: enter }}>
        <div style={{ position: "relative" }}>
          {laptop}
          <ScreenReflection deviceId={LAPTOP_ID} width={lapW} shot={shot} opacity={0.2 * power} fade={0.45} rotateX={rotX} rotateY={rotY} scale={scale} perspective={width * 2.4} />
        </div>
      </div>

      {/* callouts — left/right of the laptop in landscape, above it in portrait */}
      <div style={{ position: "absolute", left: width / 2 - lapW * (portrait ? 0.48 : 0.62), top: lapCy - lapH * (portrait ? 0.3 : 0.1) + float }}>
        <ZoomCallout shot={shot} fx={0.15} fy={0.12} w={calloutW} h={calloutW * 0.66} zoom={2.6} p={c1} accent={accent} />
      </div>
      <div style={{ position: "absolute", left: width / 2 + lapW * (portrait ? 0.48 : 0.62) - calloutW, top: lapCy + lapH * (portrait ? -0.3 : 0.32) - float }}>
        <ZoomCallout shot={shot} fx={0.8} fy={0.6} w={calloutW} h={calloutW * 0.66} zoom={2.4} p={c2} accent={accent} />
      </div>

      {/* copy */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * (portrait ? 0.08 : 0.07), gap: height * 0.02 }}>
        <Eyebrow text="For desktop" enterAt={6} size={u * 0.02} accent={accent} />
        <MaskHeadline text={headline} enterAt={12} size={u * (portrait ? 0.078 : 0.07)} maxWidth={width * 0.86} accent={accent} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: height * (portrait ? 0.1 : 0.05), gap: height * 0.022 }}>
        {feature && <Chip text={feature} enterAt={150} size={u * 0.026} accent={accent} />}
        <Caption text={caption} enterAt={92} size={u * 0.03} maxWidth={width * 0.8} />
      </AbsoluteFill>

      <LightSweep startAt={74} durationInFrames={32} />
      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
