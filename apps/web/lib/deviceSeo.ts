import { listDevices, type Device } from "@framekit/devices";

/*
 * One indexable page per device family.
 *
 * Photo scenes (devices with a `plate`) come in sets: eight iPhone 16 Pro
 * colour/angle shots, seventeen Apple Watch Ultra scenes, and so on. Each got
 * its own /mockups/<id> page with the same template copy, so Google saw dozens
 * of near-duplicates and indexed few of them. Instead, every photo scene points
 * its canonical at one page for the family — the drawn frame of the same model
 * when there is one, otherwise the first scene of the set — and only those
 * pages go in the sitemap. The scene pages stay reachable for anyone who links
 * to them, and the family page lists every scene.
 */

/** Date the device pages' content was last reviewed (shown on the page, used as sitemap lastmod). */
export const DEVICE_PAGES_UPDATED = "2026-10-09";

function familyKey(device: Device): string {
  return device.name
    .split("·")[0]
    .replace(/^Samsung\s+/, "")
    .replace(/″/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

let canonicalById: Map<string, Device> | null = null;

function buildIndex(): Map<string, Device> {
  const devices = listDevices();
  const families = new Map<string, Device[]>();
  for (const d of devices) {
    const key = familyKey(d);
    families.set(key, [...(families.get(key) ?? []), d]);
  }
  const index = new Map<string, Device>();
  for (const members of families.values()) {
    const head = members.find((d) => !d.plate) ?? members[0];
    for (const d of members) index.set(d.id, d.plate ? head : d);
  }
  return index;
}

/** The device whose page should rank for this one (itself for drawn frames). */
export function canonicalDevice(device: Device): Device {
  if (!device.plate) return device;
  canonicalById ??= buildIndex();
  return canonicalById.get(device.id) ?? device;
}

export function isCanonicalDevicePage(device: Device): boolean {
  return canonicalDevice(device).id === device.id;
}

/** Photo scenes folded into this device's page (excluding the page's own device). */
export function familyScenes(device: Device): Device[] {
  if (!isCanonicalDevicePage(device)) return [];
  return listDevices().filter((d) => d.id !== device.id && d.plate && canonicalDevice(d).id === device.id);
}

/**
 * Per-device FAQ built from the device's real data (screen size, colours,
 * scenes), so each page answers questions about that device rather than
 * repeating one block of boilerplate. Also emitted as FAQPage structured data.
 */
export function deviceFaq(device: Device, o: { name: string; base: string; ratio: string; scenes: number }): { q: string; a: string }[] {
  const { width: w, height: h } = device.screen;
  const colours = device.variants.length > 1 ? device.variants.map((v) => v.label).filter(Boolean) : [];
  const faq = [
    {
      q: `Is the ${o.name} mockup generator free?`,
      a: `Yes. The ${o.base} mockup and the full editor are free, with a small “Made with MockFrame” badge on exports, and you can export images up to 3× resolution for personal use. Pro adds 6K export, video and GIF export, and a commercial license.`,
    },
    {
      q: `What screenshot size fits the ${o.base} mockup?`,
      a: `${w} × ${h} pixels (${o.ratio}), the ${o.base}'s native display resolution. A screenshot at that size fills the screen pixel for pixel; other sizes still work and are scaled to the display.`,
    },
  ];
  if (colours.length)
    faq.push({ q: `Which ${o.base} versions can I use?`, a: `The frame comes in ${colours.length} versions: ${colours.join(", ")}. Switch between them in the editor's Device tab.` });
  if (o.scenes)
    faq.push({
      q: `Are there photorealistic ${o.base} mockups?`,
      a: `Yes — ${o.scenes} photographed ${o.base} scenes are listed on this page. Each one is calibrated to the screen, so your screenshot is warped onto the display with the photo's lighting.`,
    });
  faq.push(
    {
      q: `Can I use the ${o.base} mockup for App Store screenshots?`,
      a: "Yes. For a single image, export from the editor at the size you need; for a full listing, the App Store screenshot generator exports every required App Store and Google Play size from one design. Your first full pack is free and can be used for one real store release; more packs need the Pro license.",
    },
    {
      q: "Can I use the mockups commercially?",
      a: "The free plan is for personal use, plus one store screenshot pack for a real release. Pro includes a commercial license for client work, ads, app store listings and products you sell.",
    }
  );
  return faq;
}
