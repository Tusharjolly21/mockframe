import type React from "react";
import type { CSSProperties } from "react";

/**
 * Built-in annotation graphics (sticker layers with a `stickerId`). Everything
 * a layer needs is encoded in the id + tint + size, so scenes stay plain data:
 *
 *   annot-arrow / annot-arrow-straight / annot-arrow-loop   tapered arrows
 *   annot-step-<n>                                           numbered marker
 *   annot-callout-<text>                                     label pill
 *   annot-box / annot-circle                                 frame a region
 *   annot-highlight / annot-redact / annot-blur              mark or hide
 *   annot-kbd-<keys joined by +>                             shortcut keycaps
 */

type Pt = [number, number];

export const ANNOTATION_DEFAULT_SIZE: Record<string, { width: number; height: number }> = {
  "annot-box": { width: 440, height: 260 },
  "annot-circle": { width: 360, height: 220 },
  "annot-highlight": { width: 380, height: 84 },
  "annot-redact": { width: 360, height: 88 },
  "annot-blur": { width: 360, height: 118 },
};

/** Annotations whose footprint is set by `size` rather than by content. */
export const isSizedAnnotation = (id: string) => id in ANNOTATION_DEFAULT_SIZE;

/** relative luminance 0..1 of a #rrggbb tint (non-hex → treat as mid) */
export function tintLuma(hex: string): number {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return 0.5;
  const n = parseInt(hex.slice(1), 16);
  return (0.2126 * ((n >> 16) & 255) + 0.7152 * ((n >> 8) & 255) + 0.0722 * (n & 255)) / 255;
}

export function hexToRgba(hex: string, alpha: number) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return `rgba(255,255,255,${alpha})`;
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

/** mix a #rrggbb tint toward white (amount > 0) or black (amount < 0) */
function shade(hex: string, amount: number) {
  if (!/^#[0-9a-f]{6}$/i.test(hex)) return hex;
  const n = parseInt(hex.slice(1), 16);
  const target = amount > 0 ? 255 : 0;
  const a = Math.abs(amount);
  const ch = (v: number) => Math.round(v + (target - v) * a);
  const r = ch((n >> 16) & 255), g = ch((n >> 8) & 255), b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** a contrasting outline that keeps strokes legible on any backdrop */
const casingFor = (tint: string) => (tintLuma(tint) > 0.6 ? "rgba(0,0,0,0.38)" : "rgba(255,255,255,0.92)");

/* ------------------------------- geometry ------------------------------- */

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n = 40): Pt[] {
  const out: Pt[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n, u = 1 - t;
    out.push([
      u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
      u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1],
    ]);
  }
  return out;
}

const f = (v: number) => Math.round(v * 10) / 10;

/** A tapered arrow along sampled points: thin tail → full body → notched head. */
function taperedArrow(pts: Pt[], tailW: number, bodyW: number, headLen: number, headW: number) {
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
  const total = lens[lens.length - 1];
  const tip = pts[pts.length - 1];
  // direction of the head: from the point one head-length back to the tip
  const backIdx = Math.max(0, lens.findIndex((l) => l >= total - headLen));
  const back = pts[backIdx];
  const dl = Math.hypot(tip[0] - back[0], tip[1] - back[1]) || 1;
  const dir: Pt = [(tip[0] - back[0]) / dl, (tip[1] - back[1]) / dl];
  const nrm: Pt = [-dir[1], dir[0]];

  const stop = total - headLen * 0.7;
  const left: Pt[] = [];
  const right: Pt[] = [];
  for (let i = 0; i < pts.length && lens[i] <= stop; i++) {
    const a = pts[Math.max(0, i - 1)], b = pts[Math.min(pts.length - 1, i + 1)];
    const tl = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
    const nx = -(b[1] - a[1]) / tl, ny = (b[0] - a[0]) / tl;
    const t = lens[i] / stop;
    const w = (tailW + (bodyW - tailW) * Math.sin((Math.min(1, t * 1.6) * Math.PI) / 2)) / 2;
    left.push([pts[i][0] + nx * w, pts[i][1] + ny * w]);
    right.push([pts[i][0] - nx * w, pts[i][1] - ny * w]);
  }
  const body =
    `M${f(left[0][0])} ${f(left[0][1])}` +
    left.slice(1).map((p) => `L${f(p[0])} ${f(p[1])}`).join("") +
    right.reverse().map((p) => `L${f(p[0])} ${f(p[1])}`).join("") +
    `A${f(tailW / 2)} ${f(tailW / 2)} 0 0 1 ${f(left[0][0])} ${f(left[0][1])}Z`;

  const base: Pt = [tip[0] - dir[0] * headLen, tip[1] - dir[1] * headLen];
  const notch: Pt = [base[0] + dir[0] * headLen * 0.2, base[1] + dir[1] * headLen * 0.2];
  const b1: Pt = [base[0] + (nrm[0] * headW) / 2, base[1] + (nrm[1] * headW) / 2];
  const b2: Pt = [base[0] - (nrm[0] * headW) / 2, base[1] - (nrm[1] * headW) / 2];
  const head = `M${f(tip[0])} ${f(tip[1])}L${f(b1[0])} ${f(b1[1])}L${f(notch[0])} ${f(notch[1])}L${f(b2[0])} ${f(b2[1])}Z`;
  return { body, head };
}

const ARROWS: Record<string, { w: number; h: number; pts: Pt[] }> = {
  // keeps the original 330×150 footprint so existing scenes don't shift
  "annot-arrow": { w: 330, h: 150, pts: cubic([26, 116], [92, 46], [178, 30], [314, 44]) },
  "annot-arrow-straight": { w: 330, h: 90, pts: cubic([20, 45], [110, 45], [220, 45], [314, 45], 12) },
  "annot-arrow-loop": {
    w: 340,
    h: 180,
    pts: [
      ...cubic([22, 150], [44, 70], [140, 34], [160, 92], 30),
      ...cubic([160, 92], [172, 132], [104, 140], [110, 96], 24).slice(1),
      ...cubic([110, 96], [118, 40], [218, 22], [322, 52], 34).slice(1),
    ],
  },
};

/** hand-drawn ellipse: overshoots its start a little, radius drifts slightly */
function sketchEllipse(w: number, h: number, pad: number) {
  const cx = w / 2, cy = h / 2, rx = w / 2 - pad, ry = h / 2 - pad;
  const start = -2.1, sweep = Math.PI * 2 + 0.55, n = 96;
  let d = "";
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const a = start + sweep * t;
    const drift = 1 + 0.03 * Math.sin(a * 1.5) - 0.045 * t;
    const x = cx + Math.cos(a) * rx * drift;
    const y = cy + Math.sin(a) * ry * (drift + 0.02 * t);
    d += `${i ? "L" : "M"}${f(x)} ${f(y)}`;
  }
  return d;
}

const FONT = "Inter, system-ui, -apple-system, sans-serif";

/* -------------------------------- graphic ------------------------------- */

export function AnnotationGraphic({ id, tint, size }: { id: string; tint: string; size?: { width: number; height: number } }) {
  // gradient ids derive from the tint: the same scene can render into one
  // document several times (canvas, thumbnails, export), and identical ids
  // then always resolve to identical gradients
  const uid = tint.replace(/[^a-zA-Z0-9]/g, "");
  const sized = size ?? ANNOTATION_DEFAULT_SIZE[id];

  const arrow = ARROWS[id];
  if (arrow) {
    const { body, head } = taperedArrow(arrow.pts, 7, 20, 46, 50);
    const casing = casingFor(tint);
    return (
      <svg width={arrow.w} height={arrow.h} viewBox={`0 0 ${arrow.w} ${arrow.h}`} fill="none" style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={`ag${uid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0" stopColor={shade(tint, 0.18)} />
            <stop offset="1" stopColor={tint} />
          </linearGradient>
        </defs>
        <g style={{ filter: "drop-shadow(0 8px 10px rgba(0,0,0,0.22))" }}>
          <path d={body} fill={casing} stroke={casing} strokeWidth={8} strokeLinejoin="round" />
          <path d={head} fill={casing} stroke={casing} strokeWidth={15} strokeLinejoin="round" />
        </g>
        <path d={body} fill={`url(#ag${uid})`} />
        <path d={head} fill={tint} stroke={tint} strokeWidth={7} strokeLinejoin="round" />
      </svg>
    );
  }

  if (id.startsWith("annot-step-")) {
    const n = id.slice("annot-step-".length);
    const ink = tintLuma(tint) > 0.62 ? "#111114" : "#ffffff";
    return (
      <svg width="120" height="120" viewBox="0 0 120 120" style={{ display: "block", overflow: "visible" }}>
        <defs>
          <radialGradient id={`sg${uid}`} cx="0.35" cy="0.28" r="0.85">
            <stop offset="0" stopColor={shade(tint, 0.28)} />
            <stop offset="0.6" stopColor={tint} />
            <stop offset="1" stopColor={shade(tint, -0.18)} />
          </radialGradient>
        </defs>
        <circle cx="60" cy="60" r="55" fill="#ffffff" style={{ filter: `drop-shadow(0 10px 16px ${hexToRgba(shade(tint, -0.3), 0.38)})` }} />
        <circle cx="60" cy="60" r="47" fill={`url(#sg${uid})`} />
        <circle cx="60" cy="60" r="46.5" fill="none" stroke="rgba(255,255,255,0.28)" strokeWidth="1.5" />
        <text
          x="60"
          y="60"
          dy="0.36em"
          textAnchor="middle"
          fontFamily={FONT}
          fontSize={n.length > 1 ? 42 : 52}
          fontWeight={800}
          letterSpacing={n.length > 1 ? -2 : 0}
          fill={ink}
        >
          {n}
        </text>
      </svg>
    );
  }

  if (id.startsWith("annot-callout-")) {
    const text = id.slice("annot-callout-".length) || "New";
    const light = tintLuma(tint) > 0.62;
    const ink = light ? "#111114" : "#ffffff";
    const bg = `linear-gradient(180deg, ${shade(tint, 0.14)} 0%, ${tint} 100%)`;
    return (
      <div style={{ position: "relative", display: "inline-block", paddingBottom: 14 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            padding: "16px 28px 16px 22px",
            borderRadius: 999,
            background: bg,
            color: ink,
            fontFamily: FONT,
            fontSize: 30,
            fontWeight: 650,
            letterSpacing: "-0.015em",
            lineHeight: 1.1,
            whiteSpace: "nowrap",
            boxShadow: `inset 0 1px 0 rgba(255,255,255,${light ? 0.6 : 0.28}), 0 0 0 1px ${hexToRgba(shade(tint, -0.25), 0.35)}, 0 14px 30px ${hexToRgba(shade(tint, -0.2), 0.34)}, 0 2px 6px rgba(0,0,0,0.12)`,
          }}
        >
          <span style={{ width: 12, height: 12, borderRadius: 99, background: ink, opacity: 0.9, boxShadow: `0 0 0 5px ${light ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.22)"}` }} />
          {text}
        </div>
        <span
          style={{
            position: "absolute",
            left: 34,
            bottom: 4,
            width: 22,
            height: 22,
            background: tint,
            borderRadius: 4,
            transform: "rotate(45deg)",
            boxShadow: `1px 1px 0 ${hexToRgba(shade(tint, -0.25), 0.35)}`,
          }}
        />
      </div>
    );
  }

  if (id === "annot-box") {
    const { width: w, height: h } = sized!;
    const pad = 8;
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ display: "block", overflow: "visible" }}>
        <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} rx={22} fill={hexToRgba(tint, 0.07)} />
        <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} rx={22} stroke={casingFor(tint)} strokeWidth={14} style={{ filter: "drop-shadow(0 8px 14px rgba(0,0,0,0.18))" }} />
        <rect x={pad} y={pad} width={w - pad * 2} height={h - pad * 2} rx={22} stroke={tint} strokeWidth={8} />
      </svg>
    );
  }

  if (id === "annot-circle") {
    const { width: w, height: h } = sized!;
    const d = sketchEllipse(w, h, 12);
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} fill="none" style={{ display: "block", overflow: "visible" }}>
        <path d={d} stroke={casingFor(tint)} strokeWidth={15} strokeLinecap="round" strokeLinejoin="round" style={{ filter: "drop-shadow(0 8px 12px rgba(0,0,0,0.18))" }} />
        <path d={d} stroke={tint} strokeWidth={9} strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  if (id === "annot-highlight") {
    const { width: w, height: h } = sized!;
    // marker swipe: chisel-cut ends, slightly uneven edges
    const d = `M${f(w * 0.012)} ${f(h * 0.16)}L${f(w * 0.985)} ${f(h * 0.04)}L${f(w)} ${f(h * 0.86)}L${f(w * 0.02)} ${f(h * 0.98)}Z`;
    return (
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ display: "block", overflow: "visible", mixBlendMode: "multiply", opacity: 0.62 }}>
        <path d={d} fill={tint} stroke={tint} strokeWidth={10} strokeLinejoin="round" />
      </svg>
    );
  }

  if (id === "annot-redact") {
    const { width: w, height: h } = sized!;
    return (
      <div
        style={{
          width: w,
          height: h,
          borderRadius: Math.min(16, h / 3),
          backgroundColor: tint,
          backgroundImage: `repeating-linear-gradient(135deg, ${hexToRgba(tintLuma(tint) > 0.6 ? "#000000" : "#ffffff", 0.07)} 0 9px, transparent 9px 18px)`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 10px 24px rgba(0,0,0,0.22)",
        }}
      />
    );
  }

  if (id === "annot-blur") {
    const { width: w, height: h } = sized!;
    return (
      <div
        style={{
          width: w,
          height: h,
          borderRadius: Math.min(22, h / 3),
          background: hexToRgba(tint, 0.16),
          border: `1.5px solid ${hexToRgba(tint, 0.5)}`,
          boxShadow: "inset 0 1px 0 rgba(255,255,255,0.5), 0 12px 30px rgba(20,20,40,0.16)",
          backdropFilter: "blur(18px) saturate(1.3)",
          WebkitBackdropFilter: "blur(18px) saturate(1.3)",
        }}
      />
    );
  }

  if (id.startsWith("annot-kbd-")) {
    const combo = id.slice("annot-kbd-".length) || "⌘+K";
    const keys = combo.split("+").map((k) => k.trim()).filter(Boolean);
    const cap: CSSProperties = {
      display: "grid",
      placeItems: "center",
      minWidth: 58,
      height: 58,
      padding: "0 16px",
      borderRadius: 13,
      background: "linear-gradient(180deg, #ffffff 0%, #f3f3f7 100%)",
      boxShadow: "inset 0 -4px 0 #dcdce6, inset 0 0 0 1px #d3d3de, 0 2px 3px rgba(20,20,40,0.12)",
      fontFamily: FONT,
      fontSize: 27,
      fontWeight: 700,
      color: tintLuma(tint) > 0.85 ? "#17171c" : tint,
      whiteSpace: "nowrap",
      paddingBottom: 4,
    };
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 10,
          padding: 14,
          borderRadius: 24,
          background: "rgba(255,255,255,0.86)",
          backdropFilter: "blur(12px)",
          WebkitBackdropFilter: "blur(12px)",
          boxShadow: "inset 0 1px 0 #ffffff, 0 0 0 1px rgba(20,20,40,0.08), 0 18px 40px rgba(20,20,40,0.22)",
        }}
      >
        {keys.map((k, i) => (
          <span key={i} style={cap}>
            {k}
          </span>
        ))}
      </div>
    );
  }

  if (id.startsWith("label-")) return <LabelGraphic id={id} tint={tint} uid={uid} />;

  return (
    <svg width="160" height="160" viewBox="0 0 160 160" style={{ display: "block" }}>
      <rect x="14" y="14" width="132" height="132" rx="28" fill={tint} />
    </svg>
  );
}

/* --------------------------------- labels -------------------------------- */

/** split `label-<kind>-<text>` (text may itself contain dashes) */
export function parseLabelId(id: string): { kind: string; text: string } {
  const rest = id.slice("label-".length);
  const i = rest.indexOf("-");
  return i < 0 ? { kind: rest, text: "" } : { kind: rest.slice(0, i), text: rest.slice(i + 1) };
}

const STAR = "M12 2.2l2.95 6.07 6.68.93-4.86 4.66 1.2 6.62L12 17.3l-5.97 3.18 1.2-6.62L2.37 9.2l6.68-.93z";

function Stars({ n = 5, size = 26, color, gap = 4 }: { n?: number; size?: number; color: string; gap?: number }) {
  return (
    <span style={{ display: "inline-flex", gap }}>
      {Array.from({ length: n }, (_, i) => (
        <svg key={i} width={size} height={size} viewBox="0 0 24 24" style={{ display: "block" }}>
          <path d={STAR} fill={color} stroke={color} strokeWidth={1.2} strokeLinejoin="round" />
        </svg>
      ))}
    </span>
  );
}

function LabelGraphic({ id, tint, uid }: { id: string; tint: string; uid: string }) {
  const { kind, text } = parseLabelId(id);
  const light = tintLuma(tint) > 0.62;
  const ink = light ? "#111114" : "#ffffff";
  const deep = shade(tint, -0.22);

  if (kind === "pill") {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 30px 14px 24px",
          borderRadius: 999,
          background: `linear-gradient(135deg, ${shade(tint, 0.2)} 0%, ${tint} 55%, ${deep} 100%)`,
          color: ink,
          fontFamily: FONT,
          fontSize: 30,
          fontWeight: 800,
          letterSpacing: "0.09em",
          textTransform: "uppercase",
          whiteSpace: "nowrap",
          boxShadow: `inset 0 1px 0 rgba(255,255,255,${light ? 0.7 : 0.35}), inset 0 -2px 0 rgba(0,0,0,0.12), 0 12px 30px ${hexToRgba(deep, 0.45)}`,
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" style={{ display: "block" }}>
          <path d="M12 1.5c.6 4.9 2.6 8.3 10.5 10.5C14.6 14.2 12.6 17.6 12 22.5 11.4 17.6 9.4 14.2 1.5 12 9.4 9.8 11.4 6.4 12 1.5z" fill={ink} />
        </svg>
        {text || "New"}
      </div>
    );
  }

  if (kind === "burst") {
    const t = text || "New!";
    const pts: string[] = [];
    const N = 22;
    for (let i = 0; i < N * 2; i++) {
      const r = i % 2 ? 98 : 112;
      const a = (Math.PI * i) / N - Math.PI / 2;
      pts.push(`${f(120 + Math.cos(a) * r)},${f(120 + Math.sin(a) * r)}`);
    }
    const words = t.split(" ");
    const lines = words.length > 1 && t.length > 7 ? [words.slice(0, Math.ceil(words.length / 2)).join(" "), words.slice(Math.ceil(words.length / 2)).join(" ")] : [t];
    const longest = Math.max(...lines.map((l) => l.length));
    const fs = Math.min(54, Math.round(172 / Math.max(1, longest * 0.62)));
    return (
      <svg width="240" height="240" viewBox="0 0 240 240" style={{ display: "block", overflow: "visible" }}>
        <defs>
          <linearGradient id={`bg${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={shade(tint, 0.22)} />
            <stop offset="1" stopColor={deep} />
          </linearGradient>
        </defs>
        <polygon points={pts.join(" ")} fill={`url(#bg${uid})`} stroke="#ffffff" strokeWidth={6} strokeLinejoin="round" style={{ filter: `drop-shadow(0 12px 18px ${hexToRgba(deep, 0.4)})` }} />
        <circle cx="120" cy="120" r="80" fill="none" stroke={light ? "rgba(0,0,0,0.18)" : "rgba(255,255,255,0.35)"} strokeWidth="2" strokeDasharray="3 6" />
        <text x="120" y="120" textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={fs} letterSpacing={-1} fill={ink}>
          {lines.map((l, i) => (
            <tspan key={i} x="120" dy={i === 0 ? `${0.36 - (lines.length - 1) * 0.5}em` : "1em"}>
              {l}
            </tspan>
          ))}
        </text>
      </svg>
    );
  }

  if (kind === "laurel") {
    // one branch of leaves along an arc; the other side is its mirror image
    const branch: React.ReactElement[] = [];
    for (let i = 0; i < 8; i++) {
      const deg = 104 + i * 16;
      const a = (deg * Math.PI) / 180;
      const x = 160 + Math.cos(a) * 112;
      const y = 104 + Math.sin(a) * 92;
      branch.push(<ellipse key={i} cx={f(x)} cy={f(y)} rx="8.5" ry="20" transform={`rotate(${deg + 24} ${f(x)} ${f(y)})`} fill={i % 2 ? tint : shade(tint, 0.2)} />);
    }
    const leaves = (
      <>
        <g>{branch}</g>
        <g transform="translate(320 0) scale(-1 1)">{branch}</g>
      </>
    );
    const t = text || "#1 App";
    const fs = Math.min(40, Math.round(150 / Math.max(1, t.length * 0.58)));
    return (
      <svg width="320" height="220" viewBox="0 0 320 220" style={{ display: "block", overflow: "visible", filter: `drop-shadow(0 8px 14px ${hexToRgba(deep, 0.28)})` }}>
        {leaves}
        <text x="160" y="106" textAnchor="middle" fontFamily={FONT} fontWeight={850} fontSize={fs} letterSpacing={-1} fill={deep}>
          {t}
        </text>
        <g transform="translate(103 126)">
          {[0, 1, 2, 3, 4].map((i) => (
            <path key={i} d={STAR} fill={tint} transform={`translate(${i * 23} 0) scale(0.95)`} />
          ))}
        </g>
      </svg>
    );
  }

  if (kind === "rating") {
    const score = text || "4.9";
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 20,
          padding: "20px 28px",
          borderRadius: 28,
          background: "rgba(255,255,255,0.94)",
          boxShadow: "inset 0 1px 0 #ffffff, 0 0 0 1px rgba(20,20,40,0.07), 0 20px 44px rgba(20,20,40,0.2)",
          fontFamily: FONT,
          whiteSpace: "nowrap",
        }}
      >
        <span style={{ fontSize: 64, fontWeight: 800, letterSpacing: "-0.04em", color: "#111114", lineHeight: 1 }}>{score}</span>
        <span style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <Stars color={tintLuma(tint) > 0.85 ? "#f5b400" : tint} size={28} gap={3} />
          <span style={{ fontSize: 19, fontWeight: 600, color: "#6b6b76", letterSpacing: "-0.01em" }}>Average rating</span>
        </span>
      </div>
    );
  }

  if (kind === "cursor") {
    return (
      <div style={{ position: "relative", display: "inline-block", padding: "50px 0 0 40px" }}>
        <svg width="54" height="60" viewBox="0 0 27 30" style={{ position: "absolute", left: 0, top: 0, overflow: "visible", filter: "drop-shadow(0 4px 6px rgba(0,0,0,0.25))" }}>
          <path d="M2 2 L24 13 L14 15.5 L9.5 27 Z" fill={tint} stroke="#ffffff" strokeWidth={2.4} strokeLinejoin="round" />
        </svg>
        <div
          style={{
            padding: "10px 20px",
            borderRadius: "6px 999px 999px 999px",
            background: tint,
            color: ink,
            fontFamily: FONT,
            fontSize: 26,
            fontWeight: 650,
            whiteSpace: "nowrap",
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 8px 18px ${hexToRgba(deep, 0.35)}`,
          }}
        >
          {text || "Alex"}
        </div>
      </div>
    );
  }

  if (kind === "ribbon") {
    const end = (side: "l" | "r"): CSSProperties => ({
      position: "absolute",
      top: 14,
      [side === "l" ? "left" : "right"]: -30,
      width: 54,
      height: 64,
      background: deep,
      clipPath: side === "l" ? "polygon(0 0, 100% 0, 100% 100%, 0 100%, 34% 50%)" : "polygon(0 0, 100% 0, 66% 50%, 100% 100%, 0 100%)",
      zIndex: 0,
    });
    return (
      <div style={{ position: "relative", display: "inline-block", padding: "0 30px 14px" }}>
        <span style={end("l")} />
        <span style={end("r")} />
        <div
          style={{
            position: "relative",
            zIndex: 1,
            padding: "16px 44px",
            background: `linear-gradient(180deg, ${shade(tint, 0.14)}, ${tint})`,
            color: ink,
            fontFamily: FONT,
            fontSize: 30,
            fontWeight: 800,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
            whiteSpace: "nowrap",
            boxShadow: `inset 0 1px 0 rgba(255,255,255,0.3), 0 10px 22px ${hexToRgba(deep, 0.35)}`,
          }}
        >
          {text || "Launch day"}
        </div>
      </div>
    );
  }

  if (kind === "button") {
    return (
      <div
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 16,
          padding: "22px 30px 22px 38px",
          borderRadius: 22,
          background: `linear-gradient(180deg, ${shade(tint, 0.12)} 0%, ${tint} 100%)`,
          color: ink,
          fontFamily: FONT,
          fontSize: 32,
          fontWeight: 650,
          letterSpacing: "-0.015em",
          whiteSpace: "nowrap",
          boxShadow: `inset 0 1px 0 rgba(255,255,255,${light ? 0.7 : 0.3}), 0 0 0 1px ${hexToRgba(deep, 0.6)}, 0 16px 34px ${hexToRgba(deep, 0.4)}`,
        }}
      >
        {text || "Get started"}
        <span style={{ display: "grid", placeItems: "center", width: 42, height: 42, borderRadius: 999, background: light ? "rgba(0,0,0,0.08)" : "rgba(255,255,255,0.18)" }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={ink} strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round">
            <path d="M5 12h14M13 6l6 6-6 6" />
          </svg>
        </span>
      </div>
    );
  }

  return null;
}

