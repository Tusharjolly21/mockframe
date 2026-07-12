import type { Background } from "@framekit/scene";

/** Deterministic PRNG — mesh gradients must re-render identically from their seed. */
export function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function meshGradientCss(seed: number, colors: string[]): { backgroundColor: string; backgroundImage: string } {
  const rng = mulberry32(seed);
  const blobs: string[] = [];
  const n = Math.min(colors.length + 2, 7);
  for (let i = 0; i < n; i++) {
    const color = colors[i % colors.length];
    const cx = Math.round(rng() * 100);
    const cy = Math.round(rng() * 100);
    const r = Math.round(45 + rng() * 55);
    blobs.push(`radial-gradient(circle at ${cx}% ${cy}%, ${color} 0%, transparent ${r}%)`);
  }
  return { backgroundColor: colors[0], backgroundImage: blobs.join(", ") };
}

export function backgroundToCss(bg: Background): React.CSSProperties {
  switch (bg.type) {
    case "solid":
      return { backgroundColor: bg.color };
    case "linear-gradient":
      return {
        backgroundImage: `linear-gradient(${bg.angle}deg, ${bg.stops
          .map((s) => `${s.color} ${s.at * 100}%`)
          .join(", ")})`,
      };
    case "radial-gradient":
      return {
        backgroundImage: `radial-gradient(circle at ${bg.cx * 100}% ${bg.cy * 100}%, ${bg.stops
          .map((s) => `${s.color} ${s.at * 100}%`)
          .join(", ")})`,
      };
    case "mesh-gradient":
      return meshGradientCss(bg.seed, bg.colors);
    case "image":
    case "transparent":
      return {};
  }
}
