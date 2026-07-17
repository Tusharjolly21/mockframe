import type { FC } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { EASE_CINE, EASE_OUT, FONT_STACK, rgba } from "./theme";

/** opacity + rise reveal, clamped, premium easing. */
export function useReveal(enterAt: number, duration = 18) {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [enterAt, enterAt + duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: EASE_OUT,
  });
  return { opacity: p, y: interpolate(p, [0, 1], [26, 0]) };
}

/** Big headline that reveals word-by-word with a small stagger. */
export const Headline: FC<{
  text: string;
  enterAt: number;
  size: number;
  color?: string;
  align?: "center" | "left";
  maxWidth?: number;
}> = ({ text, enterAt, size, color = "#ffffff", align = "center", maxWidth }) => {
  const words = text.split(" ");
  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        gap: `${size * 0.24}px`,
        justifyContent: align === "center" ? "center" : "flex-start",
        maxWidth,
        fontFamily: FONT_STACK,
        fontWeight: 800,
        fontSize: size,
        lineHeight: 1.02,
        letterSpacing: -size * 0.03,
        color,
        textAlign: align,
      }}
    >
      {words.map((word, i) => (
        <Word key={i} word={word} enterAt={enterAt + i * 3} />
      ))}
    </div>
  );
};

const Word: FC<{ word: string; enterAt: number }> = ({ word, enterAt }) => {
  const { opacity, y } = useReveal(enterAt, 16);
  return <span style={{ display: "inline-block", opacity, transform: `translateY(${y}px)` }}>{word}</span>;
};

/** Kinetic headline: each word wipes up from behind a mask, staggered — the
 *  premium "type reveal" look. Optionally underlined by a swiping accent bar. */
export const MaskHeadline: FC<{
  text: string;
  enterAt: number;
  size: number;
  color?: string;
  align?: "center" | "left";
  maxWidth?: number;
  accent?: string;
}> = ({ text, enterAt, size, color = "#ffffff", align = "center", maxWidth, accent }) => {
  const words = text.split(" ");
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start", gap: size * 0.12, maxWidth }}>
      <div style={{ display: "flex", flexWrap: "wrap", gap: `${size * 0.06}px ${size * 0.26}px`, justifyContent: align === "center" ? "center" : "flex-start" }}>
        {words.map((word, i) => (
          <MaskWord key={i} word={word} enterAt={enterAt + i * 4} size={size} color={color} />
        ))}
      </div>
      {accent && <AccentBar enterAt={enterAt + Math.min(words.length, 4) * 4 + 4} width={size * 2.4} accent={accent} thickness={size * 0.09} />}
    </div>
  );
};

const MaskWord: FC<{ word: string; enterAt: number; size: number; color: string }> = ({ word, enterAt, size, color }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [enterAt, enterAt + 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_CINE });
  const y = interpolate(p, [0, 1], [112, 0]);
  return (
    <span style={{ display: "inline-block", overflow: "hidden", paddingBottom: size * 0.06 }}>
      <span style={{ display: "inline-block", transform: `translateY(${y}%)`, fontFamily: FONT_STACK, fontWeight: 800, fontSize: size, lineHeight: 1.0, letterSpacing: -size * 0.03, color }}>
        {word}
      </span>
    </span>
  );
};

/** Character-cascade headline: every letter rises out of a blur with a tight
 *  stagger — the highest-energy premium type treatment. Use on hero beats. */
export const CharHeadline: FC<{
  text: string;
  enterAt: number;
  size: number;
  color?: string;
  align?: "center" | "left";
  maxWidth?: number;
  accent?: string;
  /** frames between characters (lower = snappier) */
  stagger?: number;
}> = ({ text, enterAt, size, color = "#ffffff", align = "center", maxWidth, accent, stagger = 1.3 }) => {
  const frame = useCurrentFrame();
  const words = text.split(" ");
  let charIndex = 0;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: align === "center" ? "center" : "flex-start", gap: size * 0.14, maxWidth }}>
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          gap: `${size * 0.04}px ${size * 0.26}px`,
          justifyContent: align === "center" ? "center" : "flex-start",
          fontFamily: FONT_STACK,
          fontWeight: 800,
          fontSize: size,
          lineHeight: 1.02,
          letterSpacing: -size * 0.03,
          color,
        }}
      >
        {words.map((word, wi) => (
          <span key={wi} style={{ display: "inline-flex" }}>
            {[...word].map((ch, ci) => {
              const at = enterAt + charIndex++ * stagger;
              const p = interpolate(frame, [at, at + 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_CINE });
              return (
                <span
                  key={ci}
                  style={{
                    display: "inline-block",
                    opacity: p,
                    transform: `translateY(${(1 - p) * size * 0.45}px)`,
                    filter: p < 1 ? `blur(${(1 - p) * 6}px)` : undefined,
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </span>
        ))}
      </div>
      {accent && <AccentBar enterAt={enterAt + Math.min(text.length, 22) * stagger + 4} width={size * 2.4} accent={accent} thickness={size * 0.09} />}
    </div>
  );
};

/** A short accent bar that swipes out from the left — a clean underline accent. */
export const AccentBar: FC<{ enterAt: number; width: number; accent: string; thickness?: number }> = ({ enterAt, width, accent, thickness = 6 }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [enterAt, enterAt + 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp", easing: EASE_CINE });
  return <div style={{ width, height: thickness, borderRadius: thickness, background: `linear-gradient(90deg, ${accent}, ${rgba(accent, 0.4)})`, transform: `scaleX(${p})`, transformOrigin: "left", boxShadow: `0 0 ${thickness * 2.4}px ${rgba(accent, 0.7)}` }} />;
};

/** Small uppercase eyebrow with a softly pulsing accent dot. */
export const Eyebrow: FC<{ text: string; enterAt: number; size: number; accent: string }> = ({ text, enterAt, size, accent }) => {
  const frame = useCurrentFrame();
  const { opacity, y } = useReveal(enterAt, 14);
  const pulse = 1 + Math.sin((frame - enterAt) * 0.16) * 0.14;
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.6,
        opacity,
        transform: `translateY(${y}px)`,
        fontFamily: FONT_STACK,
        fontWeight: 700,
        fontSize: size,
        letterSpacing: size * 0.22,
        textTransform: "uppercase",
        color: rgba("#ffffff", 0.72),
        padding: `${size * 0.55}px ${size * 1.1}px`,
        borderRadius: 999,
        background: rgba(accent, 0.14),
        border: `1px solid ${rgba(accent, 0.35)}`,
      }}
    >
      <span style={{ width: size * 0.7, height: size * 0.7, borderRadius: "50%", background: accent, boxShadow: `0 0 ${size}px ${accent}`, transform: `scale(${pulse})` }} />
      {text}
    </div>
  );
};

/** A feature callout pill with a shine sweep after it lands. */
export const Chip: FC<{ text: string; enterAt: number; size: number; accent: string }> = ({ text, enterAt, size, accent }) => {
  const frame = useCurrentFrame();
  const { opacity, y } = useReveal(enterAt, 14);
  // one shine pass shortly after the chip lands
  const shine = interpolate(frame, [enterAt + 16, enterAt + 38], [-60, 160], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const dotPulse = 1 + Math.sin((frame - enterAt) * 0.14) * 0.1;
  return (
    <div
      style={{
        position: "relative",
        overflow: "hidden",
        display: "inline-flex",
        alignItems: "center",
        gap: size * 0.55,
        opacity,
        transform: `translateY(${y}px)`,
        fontFamily: FONT_STACK,
        fontWeight: 700,
        fontSize: size,
        color: "#fff",
        padding: `${size * 0.7}px ${size * 1.15}px`,
        borderRadius: 999,
        background: "rgba(20,20,26,0.66)",
        border: "1px solid rgba(255,255,255,0.14)",
        boxShadow: `0 10px 30px rgba(0,0,0,0.35)`,
      }}
    >
      <span style={{ width: size * 0.85, height: size * 0.85, borderRadius: size * 0.28, background: accent, boxShadow: `0 0 ${size * 1.4}px ${rgba(accent, 0.8)}`, transform: `scale(${dotPulse})` }} />
      {text}
      {shine > -60 && shine < 160 && (
        <span style={{ position: "absolute", top: 0, bottom: 0, left: `${shine}%`, width: "30%", transform: "skewX(-18deg)", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.18), transparent)", pointerEvents: "none" }} />
      )}
    </div>
  );
};

/** Caption line with a blur-in rise reveal. */
export const Caption: FC<{ text: string; enterAt: number; size: number; color?: string; maxWidth?: number }> = ({ text, enterAt, size, color, maxWidth }) => {
  const { opacity, y } = useReveal(enterAt, 16);
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
        filter: opacity < 1 ? `blur(${(1 - opacity) * 4}px)` : undefined,
        fontFamily: FONT_STACK,
        fontWeight: 500,
        fontSize: size,
        lineHeight: 1.35,
        letterSpacing: -size * 0.01,
        color: color ?? rgba("#ffffff", 0.68),
        textAlign: "center",
        maxWidth,
      }}
    >
      {text}
    </div>
  );
};
