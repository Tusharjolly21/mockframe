import type { Device, DeviceCategory } from "./types";

/**
 * Shared device filters. Every list of devices (the /mockups library, the
 * editor picker, the Store Promo phone chooser) filters on the same four
 * facets, so a choice means the same thing everywhere:
 *
 *   type   what it is        Phone, Tablet, Laptop, Desktop, Watch, Browser
 *   brand  who makes it      Apple, Samsung, Google…
 *   model  which product     iPhone 16 Pro, MacBook Air, Galaxy S25 Ultra…
 *   style  how it is shown   photo scenes vs plain device frames
 *
 * Facets combine with AND. Each facet's options are counted against the OTHER
 * three facets, so a chip never leads to an empty list.
 */
/** The few fields filters read, so a list can pass slim items instead of whole devices. */
export type FilterableDevice = Pick<Device, "name" | "category" | "brand"> & { plate?: unknown };

export type DeviceStyle = "photo" | "frame";
export type DeviceFacet = "type" | "brand" | "model" | "style";

export interface DeviceFilter {
  type?: string;
  brand?: string;
  model?: string;
  style?: DeviceStyle;
}

export interface FacetOption {
  value: string;
  label: string;
  count: number;
}

export interface DeviceFacets {
  type: DeviceCategory;
  brand: string;
  model: string;
  style: DeviceStyle;
}

export const TYPE_LABELS: Record<string, string> = {
  phone: "Phone",
  tablet: "Tablet",
  laptop: "Laptop",
  desktop: "Desktop",
  watch: "Watch",
  browser: "Browser",
  scene: "Scene",
};
const TYPE_ORDER = ["phone", "tablet", "laptop", "desktop", "watch", "browser", "scene"];

export const BRAND_LABELS: Record<string, string> = {
  apple: "Apple",
  samsung: "Samsung",
  google: "Google",
  nothing: "Nothing",
  oneplus: "OnePlus",
  xiaomi: "Xiaomi",
  "browser-company": "The Browser Company",
};

export const STYLE_LABELS: Record<DeviceStyle, string> = { photo: "Photo scenes", frame: "Device frames" };

export const FACETS: DeviceFacet[] = ["type", "brand", "model", "style"];

export function brandLabel(brand: string): string {
  return BRAND_LABELS[brand] ?? brand.charAt(0).toUpperCase() + brand.slice(1);
}

/** "iPhone 16 Pro · Black Titanium · Front" → "iPhone 16 Pro"; "MacBook Air 13″" → "MacBook Air". */
export function deviceModel(device: { name: string }): string {
  let base = device.name.split("·")[0].replace(/^Samsung\s+/, "").trim();
  // "(M4)", "(2024)", "(concept)" are specs, not names; "(2)" / "(3)" in Nothing Phone are
  base = base.replace(/\s*\((?!\d\))[^)]*\)/g, "").trim();
  if (/^MacBook (Air|Pro)\b/.test(base)) return base.match(/^MacBook (Air|Pro)/)![0];
  if (/^iPad (Pro|Air|Mini)\b/i.test(base)) return base.match(/^iPad (Pro|Air|Mini)/i)![0].replace(/mini/i, "Mini");
  if (/^Apple Watch Ultra\b/.test(base)) return "Apple Watch Ultra";
  // the stone and podium scenes show an iPhone without naming a model
  if (base === "iPhone") return "iPhone scenes";
  return base.replace(/\s*\d+(\.\d+)?″$/, "").trim();
}

export function deviceFacets(device: FilterableDevice): DeviceFacets {
  return {
    type: device.category,
    brand: device.brand,
    model: deviceModel(device),
    style: device.plate ? "photo" : "frame",
  };
}

export function matchesFilter(device: FilterableDevice, filter: DeviceFilter, skip?: DeviceFacet): boolean {
  const f = deviceFacets(device);
  return FACETS.every((facet) => {
    if (facet === skip) return true;
    const want = filter[facet];
    return !want || f[facet] === want;
  });
}

export function filterDevices<T extends FilterableDevice>(devices: T[], filter: DeviceFilter): T[] {
  return devices.filter((d) => matchesFilter(d, filter));
}

export function hasFilter(filter: DeviceFilter): boolean {
  return FACETS.some((f) => !!filter[f]);
}

const collator = new Intl.Collator("en", { numeric: true });

/** Options for one facet, counted against the other three. */
export function facetOptions(devices: FilterableDevice[], filter: DeviceFilter, facet: DeviceFacet): FacetOption[] {
  const counts = new Map<string, number>();
  for (const d of devices) {
    if (!matchesFilter(d, filter, facet)) continue;
    const v = deviceFacets(d)[facet];
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  const label = (value: string) =>
    facet === "type" ? (TYPE_LABELS[value] ?? value) : facet === "brand" ? brandLabel(value) : facet === "style" ? STYLE_LABELS[value as DeviceStyle] : value;
  const options = [...counts.entries()].map(([value, count]) => ({ value, label: label(value), count }));
  if (facet === "type") options.sort((a, b) => TYPE_ORDER.indexOf(a.value) - TYPE_ORDER.indexOf(b.value));
  else if (facet === "style") options.sort((a, b) => (a.value === "photo" ? -1 : 1) - (b.value === "photo" ? -1 : 1));
  else if (facet === "brand") options.sort((a, b) => b.count - a.count);
  else options.sort((a, b) => Number(a.value.endsWith(" scenes")) - Number(b.value.endsWith(" scenes")) || collator.compare(b.value, a.value)); // newest model first, unnamed-model scenes last
  return options;
}

/** Drop any chosen value that the other choices have ruled out (e.g. model "iPhone 17" after switching to Watch). */
export function normalizeFilter(devices: FilterableDevice[], filter: DeviceFilter, keep?: DeviceFacet): DeviceFilter {
  const next: DeviceFilter = { ...filter };
  // two passes settle the dependencies between the facets
  for (let pass = 0; pass < 2; pass++) {
    for (const facet of FACETS) {
      const want = next[facet];
      if (!want || facet === keep) continue; // the choice the user just made always wins
      if (!facetOptions(devices, next, facet).some((o) => o.value === want)) delete next[facet];
    }
  }
  return next;
}

/** Change one facet (clicking the active value clears it) and keep the rest consistent. */
export function setFacet(devices: FilterableDevice[], filter: DeviceFilter, facet: DeviceFacet, value: string | undefined): DeviceFilter {
  const next = { ...filter } as Record<string, string | undefined>;
  if (!value || next[facet] === value) delete next[facet];
  else next[facet] = value;
  return normalizeFilter(devices, next as DeviceFilter, value ? facet : undefined);
}

export function filterToParams(filter: DeviceFilter): URLSearchParams {
  const p = new URLSearchParams();
  for (const f of FACETS) if (filter[f]) p.set(f, filter[f]!);
  return p;
}

export function filterFromParams(params: URLSearchParams | { get(name: string): string | null }): DeviceFilter {
  const filter: DeviceFilter = {};
  const type = params.get("type") ?? params.get("device");
  if (type) filter.type = type.toLowerCase();
  const brand = params.get("brand");
  if (brand) filter.brand = brand.toLowerCase();
  const model = params.get("model");
  if (model) filter.model = model;
  const style = params.get("style");
  if (style === "photo" || style === "frame") filter.style = style;
  return filter;
}
