/**
 * Clay finish: re-tints a device's own artwork into one matte colour. The
 * frame's luminance is kept as soft shading (bezel a little deeper, edges a
 * little lighter) and multiplied by the clay colour, so every device and
 * colourway turns into the same sculpted, monochrome look — inline SVG filter,
 * so it renders identically in the editor and in exports.
 */

const SHADE = 0.42; // how much of the artwork's luminance survives as shading
const BASE = 0.68; // tone of the darkest parts (bezel / island) relative to the clay colour
const SHEEN = 0.08; // a little neutral light on the lit edges, so deep clays keep their shape

export function parseHex(color: string): [number, number, number] | null {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(color.trim());
  if (!m) return null;
  const h = m[1].length === 3 ? m[1].replace(/./g, (c) => c + c) : m[1];
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255) as [number, number, number];
}

/** feColorMatrix values: out = clay × (SHADE·L + BASE) + SHEEN·L for luminance L, alpha untouched. */
export function clayMatrix(color: string): string {
  const [r, g, b] = parseHex(color) ?? [0.95, 0.94, 0.92];
  const k = (c: number) => c * SHADE + SHEEN;
  const row = (c: number) =>
    [k(c) * 0.2126, k(c) * 0.7152, k(c) * 0.0722, 0, c * BASE].map((v) => +v.toFixed(5)).join(" ");
  return `${row(r)} ${row(g)} ${row(b)} 0 0 0 1 0`;
}
