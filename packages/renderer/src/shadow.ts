import type { Shadow, Transform } from "@framekit/scene";

function hexWithOpacity(color: string, opacity: number): string {
  if (color.startsWith("#") && (color.length === 7 || color.length === 4)) {
    const full =
      color.length === 4
        ? `#${color[1]}${color[1]}${color[2]}${color[2]}${color[3]}${color[3]}`
        : color;
    const a = Math.round(Math.max(0, Math.min(1, opacity)) * 255)
      .toString(16)
      .padStart(2, "0");
    return `${full}${a}`;
  }
  return color;
}

/**
 * Shadow is a lighting model: the offset is DERIVED from lightAngle × distance,
 * so one light angle can be applied scene-wide and multi-device compositions
 * share a coherent light source.
 *
 * Values are interpreted in canvas px; since the filter is applied inside the
 * layer's scale transform, distances are divided by scale to compensate.
 */
export function shadowToFilter(shadow: Shadow, transform: Transform): string {
  const rad = (shadow.lightAngle * Math.PI) / 180;
  const tiltBoost = 1 + (Math.abs(transform.tiltX) + Math.abs(transform.tiltY)) / 90;

  let distance = shadow.distance;
  let softness = shadow.softness;
  if (shadow.mode === "hug") {
    distance *= 0.35;
    softness *= 0.5;
  } else if (shadow.mode === "adaptive") {
    distance *= tiltBoost;
    softness *= tiltBoost;
  }

  const s = transform.scale || 1;
  const dx = (-Math.cos(rad) * distance) / s;
  const dy = (Math.sin(rad) * distance) / s;
  const blur = softness / s;

  const main = `drop-shadow(${dx.toFixed(1)}px ${dy.toFixed(1)}px ${blur.toFixed(1)}px ${hexWithOpacity(shadow.color, shadow.opacity)})`;
  if (shadow.mode === "hug") return main;
  const contact = `drop-shadow(${(dx * 0.25).toFixed(1)}px ${(dy * 0.25).toFixed(1)}px ${(blur * 0.3).toFixed(1)}px ${hexWithOpacity(shadow.color, shadow.opacity * 0.55)})`;
  return `${main} ${contact}`;
}
