"use client";

import type { StyleTheme } from "./themes";
import { persistAsset, resolveAsset, restoreAssets, type GuestAsset } from "./assets";
import { firebaseFetch } from "./firebaseClient";
import { BRAND_NAME_MAX, BrandKitSchema, brandSyncAction, type BrandKitRecord } from "./brandKitSchema";

/**
 * Brand kit — the styling a team applies to everything: accent colour,
 * optional logo (asset id) and a display name. Applied as a derived theme in
 * the editor and as the default accent in the promo maker and launch kit.
 *
 * localStorage is the instant cache; /api/brand-kit makes the kit follow the
 * account to every device (newest edit wins). The logo is uploaded as a normal
 * asset so it survives reloads, which a data-URL-only asset did not.
 */
export interface BrandKit {
  name: string;
  accent: string; // #rrggbb
  logoAssetId: string | null;
  /** ms epoch of the last edit; 0 for kits saved before sync existed */
  updatedAt?: number;
}

const KEY = "fk-brand-kit";
const EVENT = "framekit:brand-changed";
const PUSH_DEBOUNCE_MS = 1000;

export function loadBrandKit(): BrandKit | null {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<BrandKit>;
    if (typeof parsed.accent !== "string" || !/^#[0-9a-fA-F]{6}$/.test(parsed.accent)) return null;
    return {
      name: typeof parsed.name === "string" ? parsed.name : "My brand",
      accent: parsed.accent,
      logoAssetId: typeof parsed.logoAssetId === "string" ? parsed.logoAssetId : null,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : 0,
    };
  } catch {
    return null;
  }
}

function writeLocal(kit: BrandKit): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(kit));
    window.dispatchEvent(new CustomEvent(EVENT));
  } catch {
    /* storage unavailable — the cloud copy still exists */
  }
}

/** Save a user edit: stamp it, cache it locally, and push it to the cloud shortly after. */
export function saveBrandKit(kit: BrandKit): void {
  writeLocal({ ...kit, updatedAt: Date.now() });
  schedulePush();
}

function toRecord(kit: BrandKit | null): BrandKitRecord | null {
  if (!kit) return null;
  const parsed = BrandKitSchema.safeParse({ ...kit, name: kit.name.slice(0, BRAND_NAME_MAX), updatedAt: kit.updatedAt ?? 0 });
  return parsed.success ? parsed.data : null;
}

let pushTimer: ReturnType<typeof setTimeout> | null = null;

function schedulePush(): void {
  if (pushTimer) clearTimeout(pushTimer);
  // the panel saves on every keystroke and colour-drag tick — send only the settled kit
  pushTimer = setTimeout(() => {
    pushTimer = null;
    void pushBrandKit().catch(() => {});
  }, PUSH_DEBOUNCE_MS);
}

async function pushBrandKit(fromSync = false): Promise<void> {
  const record = toRecord(loadBrandKit());
  if (!record) return;
  if (record.logoAssetId) {
    const logo = resolveAsset(record.logoAssetId);
    // upload a freshly picked logo (still a data URL) so other devices can load it
    if (logo?.url.startsWith("data:")) await persistAsset(logo);
  }
  const res = await firebaseFetch("/api/brand-kit", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(record),
  });
  // another device saved a newer kit in the meantime — take that one (a push
  // made by the sync itself must not await the sync it is part of)
  if (res.status === 409 && !fromSync) await syncBrandKitFromServer();
}

let syncing: Promise<BrandKit | null> | null = null;

/**
 * Reconcile the local kit with the account's cloud copy. Call once when a
 * surface that uses the kit opens. Resolves to the kit now in effect.
 */
export function syncBrandKitFromServer(): Promise<BrandKit | null> {
  syncing ??= (async () => {
    try {
      const res = await firebaseFetch("/api/brand-kit");
      if (!res.ok) return loadBrandKit();
      const body = (await res.json()) as { kit: unknown; logo: GuestAsset | null };
      const cloud = BrandKitSchema.safeParse(body.kit);
      const cloudKit = cloud.success ? cloud.data : null;
      const local = loadBrandKit();
      const action = brandSyncAction(toRecord(local), cloudKit);
      // the logo URL is re-signed on every GET — register it whenever it is the logo in use
      const restoreLogo = (id: string | null) => {
        if (body.logo && id && body.logo.id === id) restoreAssets([body.logo]);
      };
      if (action === "pull" && cloudKit) {
        restoreLogo(cloudKit.logoAssetId);
        writeLocal(cloudKit);
        return cloudKit;
      }
      restoreLogo(local?.logoAssetId ?? null);
      if (action === "push") await pushBrandKit(true);
      return local;
    } catch {
      return loadBrandKit();
    } finally {
      syncing = null;
    }
  })();
  return syncing;
}

export function onBrandChange(fn: () => void): () => void {
  window.addEventListener(EVENT, fn);
  return () => window.removeEventListener(EVENT, fn);
}

/** Mix a hex colour toward black (t 0..1). */
function shade(hex: string, t: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = (v: number) => Math.round(v * (1 - t));
  const r = ch((n >> 16) & 255);
  const g = ch((n >> 8) & 255);
  const b = ch(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
}

/** Derive a one-click theme from the brand accent: a rich diagonal gradient
 *  from the accent into its deep shade — safe on any content. */
export function brandTheme(kit: BrandKit): StyleTheme {
  return {
    id: "brand-kit",
    name: `${kit.name} theme`,
    background: {
      type: "linear-gradient",
      angle: 135,
      stops: [
        { at: 0, color: kit.accent },
        { at: 1, color: shade(kit.accent, 0.72) },
      ],
    },
  };
}
