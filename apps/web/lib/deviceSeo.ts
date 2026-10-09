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
