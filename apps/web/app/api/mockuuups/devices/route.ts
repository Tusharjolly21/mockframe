import { NextResponse } from "next/server";
import { listDevices, MockuuupsError } from "@/lib/server/mockuuups";

/**
 * GET /api/mockuuups/devices — the full device-model catalog (66 models),
 * grouped into the categories the picker shows and ordered newest-first so
 * users can browse many iPhones / Androids / iPads / laptops / desktops /
 * watches. Mockups are then fetched per model via /mockups?device=<slug>.
 */

export const runtime = "nodejs";

type CatKey = "iphone" | "android" | "ipad" | "laptop" | "desktop" | "watch" | "other";

function categorize(slug: string): CatKey {
  if (slug.includes("iphone")) return "iphone";
  if (slug.includes("ipad")) return "ipad";
  if (/samsung-galaxy|google-pixel|htc|oneplus|nothing|-phone/.test(slug)) return "android";
  if (slug.includes("watch")) return "watch";
  if (/macbook|laptop|xps|chromebook|neo/.test(slug)) return "laptop";
  if (/imac|display|surface-studio|apple-tv|television|monitor/.test(slug)) return "desktop";
  return "other";
}

const CATS: { key: CatKey; label: string }[] = [
  { key: "iphone", label: "iPhone" },
  { key: "android", label: "Android" },
  { key: "ipad", label: "iPad" },
  { key: "laptop", label: "Laptop" },
  { key: "desktop", label: "Desktop" },
  { key: "watch", label: "Watch" },
];

export async function GET() {
  try {
    const raw = await listDevices();
    // dedup by slug, keep API order (oldest→newest)
    const seen = new Set<string>();
    const devices = raw.filter((d) => d.slug && !seen.has(d.slug) && (seen.add(d.slug), true));

    const groups = CATS.map((c) => ({
      key: c.key,
      label: c.label,
      // newest-first within a category (API lists oldest first)
      devices: devices
        .filter((d) => categorize(d.slug) === c.key)
        .reverse()
        .map((d) => ({ slug: d.slug, title: d.title })),
    })).filter((g) => g.devices.length > 0);

    return NextResponse.json({ groups });
  } catch (err) {
    if (err instanceof MockuuupsError) return NextResponse.json({ error: err.message }, { status: err.status });
    return NextResponse.json({ error: "Failed to load devices" }, { status: 500 });
  }
}
