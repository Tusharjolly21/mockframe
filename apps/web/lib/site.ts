import { type Device } from "@framekit/devices";

/** Canonical origin — used for metadataBase, canonical URLs, sitemap, JSON-LD. */
export const SITE_URL = "https://mockframe.app";
export const SITE_NAME = "MockFrame";
export const SITE_TAGLINE = "Screenshot Mockup Studio";

/* --------------------------------- naming --------------------------------- */

/** Full device name, with scene decorations normalised for display/titles. */
export function cleanDeviceName(device: Device): string {
  return device.name.replace(/\s*·\s*/g, " — ").replace(/″/g, '"').trim();
}

/** The base product name without any variant/scene suffix (e.g. "iPhone 16 Pro"). */
export function baseDeviceName(device: Device): string {
  return device.name.split("·")[0].replace(/″/g, '"').trim();
}

/* ----------------------------- category labels ---------------------------- */

/** Display order + copy for grouping devices on the /mockups index. */
export const CATEGORY_ORDER = ["scene", "phone", "tablet", "laptop", "desktop", "browser", "watch"] as const;

export const CATEGORY_META: Record<string, { label: string; blurb: string }> = {
  scene: { label: "Photoreal scenes", blurb: "Photographed devices — drop your screenshot into a real-world shot." },
  phone: { label: "Phone", blurb: "Pixel-accurate phone frames for iOS and Android screenshots." },
  tablet: { label: "Tablet", blurb: "iPad and Android tablet frames in portrait and landscape." },
  laptop: { label: "Laptop", blurb: "MacBook and notebook frames for web and app shots." },
  desktop: { label: "Desktop", blurb: "Monitor and desktop frames for full-screen captures." },
  browser: { label: "Browser", blurb: "Clean browser chrome — Safari, Chrome, Arc — around any page." },
  watch: { label: "Watch", blurb: "Apple Watch frames for watchOS app and complication shots." },
};

export function categoryLabel(category: string): string {
  return CATEGORY_META[category]?.label ?? category;
}

/* ------------------------------ specs & ratio ----------------------------- */

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

/** A human aspect ratio: reduced "a : b" when tidy, else a decimal "1 : x". */
export function aspectRatio(w: number, h: number): string {
  if (!w || !h) return "—";
  const g = gcd(w, h);
  const rw = w / g;
  const rh = h / g;
  if (rw <= 40 && rh <= 40) return `${rw} : ${rh}`;
  const long = Math.max(w, h) / Math.min(w, h);
  return w >= h ? `${long.toFixed(2)} : 1` : `1 : ${long.toFixed(2)}`;
}

function formatReleased(released?: string): string | null {
  if (!released) return null;
  const [y, m] = released.split("-");
  if (!y) return null;
  const month = m ? new Date(2000, Number(m) - 1, 1).toLocaleString("en-US", { month: "long" }) : null;
  return month ? `${month} ${y}` : y;
}

export interface Spec {
  label: string;
  value: string;
}

/** The spec rows shown on a device mockup page. */
export function deviceSpecs(device: Device): Spec[] {
  const w = device.screen.width;
  const h = device.screen.height;
  const specs: Spec[] = [
    { label: "Screen resolution", value: `${w} × ${h} px` },
    { label: "Aspect ratio", value: aspectRatio(w, h) },
    { label: "Orientation", value: h >= w ? "Portrait" : "Landscape" },
    { label: "Device type", value: categoryLabel(device.category) },
  ];
  if (device.screen.cornerRadius) specs.push({ label: "Corner radius", value: `${device.screen.cornerRadius} px` });
  if (device.brand) specs.push({ label: "Brand", value: device.brand.replace(/^\w/, (c) => c.toUpperCase()) });
  const released = formatReleased(device.released);
  if (released) specs.push({ label: "Released", value: released });
  return specs;
}

/* --------------------------------- SEO copy -------------------------------- */

/** Keyword list for <meta keywords> / body copy, from real search intent. */
export function deviceKeywords(device: Device): string[] {
  const base = baseDeviceName(device).toLowerCase();
  const seo = device.seo?.monthlyQueries ?? [];
  const derived = [`${base} mockup`, `${base} mockup generator`, `${base} screenshot frame`, `${base} template`];
  const aliases = (device.aliases ?? []).map((a) => `${a} mockup`);
  return Array.from(new Set([...seo, ...derived, ...aliases]));
}

/** ~155-char meta description tuned for the device. */
export function deviceDescription(device: Device): string {
  const name = cleanDeviceName(device);
  const base = baseDeviceName(device);
  return `Free ${name} mockup generator. Drop your screenshot into a pixel-perfect ${base} frame (${device.screen.width}×${device.screen.height}), style the background, and export a production-ready image — no design tools needed.`;
}

/** SEO <title> for the device page (the layout template appends "— MockFrame"). */
export function deviceTitle(device: Device): string {
  return `${cleanDeviceName(device)} Mockup Generator`;
}

/** Absolute social image for a device, when a real raster preview exists. */
export function deviceOgImage(device: Device): string | null {
  if (device.plate?.src) {
    const src = device.plate.src;
    return src.startsWith("http") ? src : `${SITE_URL}${src.startsWith("/") ? "" : "/"}${src}`;
  }
  return null;
}
