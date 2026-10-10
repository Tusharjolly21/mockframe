import type { FC } from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { PromoInputProps } from "../../../lib/promo/inputProps";
import { Background } from "../kit/Background";
import { RealDeviceFrame, usePreloadScreenshots } from "../kit/RealDeviceFrame";
import { Caption, CharHeadline, Eyebrow } from "../kit/AnimatedText";
import { CutFlash, LightSweep, PromoAudio, Watermark } from "../kit/Overlay";
import { ContactShadow } from "../kit/Stage";
import { Sculpture3D } from "../kit/Sculpture3D";
import { deviceAspect, LAPTOP_ID, shotFor, TABLET_ID } from "../kit/MultiDevice";
import { cutsPassed, EASE_CINE, EASE_OUT, rgba, velBlur } from "../kit/theme";

/**
 * Abstract Stack — glossy 3D shapes assemble into a sculpture, then a laptop,
 * tablet and phone land on top of it one after another. The whole set drifts
 * on a slow camera orbit while screens cut on the beat. Brand-ad energy.
 */
export const AbstractStack: FC<PromoInputProps> = ({ deviceId, screenshots, texts, accent, background, pattern, watermark, musicUrl, width, height }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: dur } = useVideoConfig();
  usePreloadScreenshots(screenshots.map((s) => s.url), screenshots.map((s) => s.kind));
  const [headline = "", caption = ""] = texts;
  const portrait = height > width * 1.2;

  // ── layout: everything is sized off the laptop so the cluster scales per format
  const lapA = deviceAspect(LAPTOP_ID);
  const lapW = Math.min(width * (portrait ? 0.8 : 0.84), (height * 0.4) / lapA);
  const lapH = lapW * lapA;
  const cx = width / 2;
  const cy = height * (portrait ? 0.57 : 0.6);
  const phoneW = lapW * 0.22;
  const tabW = lapW * 0.44;
  const tabA = deviceAspect(TABLET_ID);

  const cuts = [156, 228];
  const beat = cutsPassed(frame, cuts);

  // ── camera: slow orbit across the whole set + gentle push-in
  const orbitFn = (f: number) => interpolate(f, [0, dur], [-10, 8], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_CINE });
  const orbit = orbitFn(frame);
  const push = interpolate(frame, [0, dur], [0.96, 1.04], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const parallax = orbit * -width * 0.004;

  // ── device arrivals: weighted drops with motion blur
  const drop = (at: number) => (f: number) => spring({ frame: f - at, fps, config: { damping: 15, mass: 0.9, stiffness: 120 } });
  const lap = drop(34);
  const tab = drop(58);
  const ph = drop(80);
  const y = (fn: (f: number) => number, f: number, dist: number) => interpolate(fn(f), [0, 1], [dist, 0]);

  const lapY = y(lap, frame, -height * 0.5);
  const tabX = y(tab, frame, -width * 0.5);
  const phX = y(ph, frame, width * 0.5);
  const lapBlur = velBlur(y(lap, frame, -height * 0.5), y(lap, frame - 1, -height * 0.5), 0.05, 8);
  const tabBlur = velBlur(y(tab, frame, -width * 0.5), y(tab, frame - 1, -width * 0.5), 0.05, 8);
  const phBlur = velBlur(y(ph, frame, width * 0.5), y(ph, frame - 1, width * 0.5), 0.05, 8);

  const t = frame / fps;
  const bob = (i: number) => Math.sin(t * 1.1 + i * 1.7) * height * 0.005;

  const outro = interpolate(frame, [dur - 16, dur], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_OUT });
  const persp = width * 2.6;

  const place = (x: number, yy: number, w: number, h: number) => ({ position: "absolute" as const, left: x - w / 2, top: yy - h / 2, width: w });

  return (
    <AbsoluteFill style={{ opacity: interpolate(outro, [0, 1], [1, 0.4]) }}>
      <AbsoluteFill style={{ transform: `translateX(${parallax * 0.5}px) scale(1.05)` }}>
        <Background background={background} accent={accent} pattern={pattern} />
      </AbsoluteFill>
      <PromoAudio musicUrl={musicUrl} />
      {/* real 3D sculpture — glossy shapes the devices sit on */}
      <AbsoluteFill style={{ transform: `scale(${push})` }}>
        <Sculpture3D accent={accent} width={width} height={height} orbit={orbit * 1.4} />
      </AbsoluteFill>

      <AbsoluteFill style={{ transform: `scale(${push})` }}>

        {/* tablet — back left */}
        <div style={{ ...place(cx - lapW * (portrait ? 0.3 : 0.4), cy + lapH * 0.14 + bob(1), tabW, tabW * tabA), transform: `translateX(${tabX}px)`, opacity: tab(frame), filter: tabBlur > 0.3 ? `blur(${tabBlur}px)` : undefined }}>
          <div style={{ position: "relative" }}>
            <RealDeviceFrame deviceId={TABLET_ID} width={tabW} screenshot={shotFor(screenshots, TABLET_ID, beat + 1)} rotateY={orbit + 14} rotateX={4} perspective={persp} glare={0.1} />
            <ContactShadow width={tabW} opacity={0.35 * tab(frame)} />
          </div>
        </div>

        {/* laptop — centre */}
        <div style={{ ...place(cx, cy + bob(0), lapW, lapH), transform: `translateY(${lapY}px)`, opacity: interpolate(lap(frame), [0, 0.2], [0, 1], { extrapolateRight: "clamp" }), filter: lapBlur > 0.3 ? `blur(${lapBlur}px)` : undefined }}>
          <div style={{ position: "relative" }}>
            <RealDeviceFrame deviceId={LAPTOP_ID} width={lapW} screenshot={shotFor(screenshots, LAPTOP_ID, beat)} rotateY={orbit} rotateX={interpolate(lap(frame), [0, 1], [18, 3])} perspective={persp} glare={0.1} />
            <ContactShadow width={lapW} opacity={0.4 * lap(frame)} />
          </div>
        </div>

        {/* phone — front right */}
        <div style={{ ...place(cx + lapW * 0.42, cy + lapH * 0.2 + bob(2), phoneW, phoneW * deviceAspect(deviceId)), transform: `translateX(${phX}px)`, opacity: ph(frame), filter: phBlur > 0.3 ? `blur(${phBlur}px)` : undefined }}>
          <div style={{ position: "relative" }}>
            <RealDeviceFrame deviceId={deviceId} width={phoneW} screenshot={shotFor(screenshots, deviceId, beat + 2)} rotateY={orbit - 12} rotateZ={interpolate(ph(frame), [0, 1], [-12, -4])} perspective={persp} glare={0.14} />
            <ContactShadow width={phoneW} opacity={0.45 * ph(frame)} />
          </div>
        </div>
      </AbsoluteFill>

      {/* copy */}
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-start", paddingTop: height * (portrait ? 0.08 : 0.06), gap: height * 0.018 }}>
        <Eyebrow text="Now available" enterAt={4} size={Math.min(width, height) * 0.02} accent={accent} />
        <CharHeadline text={headline} enterAt={10} size={Math.min(width, height) * (portrait ? 0.075 : 0.07)} maxWidth={width * 0.86} />
      </AbsoluteFill>
      <AbsoluteFill style={{ alignItems: "center", justifyContent: "flex-end", paddingBottom: height * 0.06 }}>
        <Caption text={caption} enterAt={104} size={Math.min(width, height) * 0.032} maxWidth={width * 0.8} />
      </AbsoluteFill>

      {/* accent rim light */}
      <AbsoluteFill style={{ background: `radial-gradient(70% 50% at 50% ${(cy / height) * 100}%, ${rgba(accent, 0.12)} 0%, transparent 70%)`, mixBlendMode: "screen", pointerEvents: "none" }} />
      <LightSweep startAt={118} durationInFrames={30} />
      <CutFlash cues={cuts} strength={0.3} />
      {watermark && <Watermark width={width} />}
    </AbsoluteFill>
  );
};
