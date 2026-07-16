import type { FC } from "react";
import { interpolate, useCurrentFrame } from "remotion";
import { EASE_OUT, FONT_STACK, rgba } from "./theme";

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

/** Small uppercase eyebrow with an accent dot. */
export const Eyebrow: FC<{ text: string; enterAt: number; size: number; accent: string }> = ({ text, enterAt, size, accent }) => {
  const { opacity, y } = useReveal(enterAt, 14);
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
      <span style={{ width: size * 0.7, height: size * 0.7, borderRadius: "50%", background: accent, boxShadow: `0 0 ${size}px ${accent}` }} />
      {text}
    </div>
  );
};

/** A feature callout pill (used by Feature Pop / Quick Cut). */
export const Chip: FC<{ text: string; enterAt: number; size: number; accent: string }> = ({ text, enterAt, size, accent }) => {
  const { opacity, y } = useReveal(enterAt, 14);
  return (
    <div
      style={{
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
        background: "rgba(255,255,255,0.07)",
        border: "1px solid rgba(255,255,255,0.12)",
        backdropFilter: "blur(8px)",
        boxShadow: `0 10px 30px rgba(0,0,0,0.3)`,
      }}
    >
      <span style={{ width: size * 0.85, height: size * 0.85, borderRadius: size * 0.28, background: accent, boxShadow: `0 0 ${size * 1.4}px ${rgba(accent, 0.8)}` }} />
      {text}
    </div>
  );
};

/** Plain caption line with a rise reveal. */
export const Caption: FC<{ text: string; enterAt: number; size: number; color?: string; maxWidth?: number }> = ({ text, enterAt, size, color, maxWidth }) => {
  const { opacity, y } = useReveal(enterAt, 16);
  return (
    <div
      style={{
        opacity,
        transform: `translateY(${y}px)`,
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
