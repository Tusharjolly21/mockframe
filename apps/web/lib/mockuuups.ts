"use client";

import { ingestFile, persistAsset, type GuestAsset } from "./assets";

/**
 * Client wrappers for the Realistic-render feature. All network calls go
 * through /api/mockuuups/* so the secret key stays server-side. The finished
 * render is a temporary CDN url (24h on the trial plan), so we always ingest
 * it into a LOCAL asset — scenes never reference a remote/expiring url.
 */

export interface MockuuupsItem {
  id: string;
  title: string;
  thumbnail: string;
  family: string;
  device: string;
  w: number;
  h: number;
}

export interface DeviceModel {
  slug: string;
  title: string;
}
export interface DeviceGroup {
  key: string;
  label: string;
  devices: DeviceModel[];
}

/** The categorized device-model catalog (iPhone / Android / iPad / Laptop / Desktop / Watch). */
export async function fetchDevices(): Promise<DeviceGroup[]> {
  const res = await fetch(`/api/mockuuups/devices`);
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? "Couldn't load devices");
  return json.groups ?? [];
}

/** Mockups for a specific device model (or newest across the catalog when device is omitted). */
export async function fetchMockups(page: number, device?: string): Promise<{ mockups: MockuuupsItem[]; hasMore: boolean }> {
  const q = device ? `?page=${page}&device=${encodeURIComponent(device)}` : `?page=${page}`;
  const res = await fetch(`/api/mockuuups/mockups${q}`);
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? "Couldn't load mockups");
  return { mockups: json.mockups ?? [], hasMore: !!json.hasMore };
}

export async function fetchCredits(): Promise<number | null> {
  try {
    const res = await fetch(`/api/mockuuups/account`);
    if (!res.ok) return null;
    const json = await res.json();
    return typeof json.creditsLeft === "number" ? json.creditsLeft : null;
  } catch {
    return null;
  }
}

/** Render `imageUrl` (a public url) into a Mockuuups mockup; returns the CDN image url. */
export async function renderMockup(mockup: string, imageUrl: string, size: number): Promise<string> {
  const res = await fetch(`/api/mockuuups/render`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mockup, imageUrl, size }),
  });
  const json = await res.json().catch(() => null);
  if (!res.ok) throw new Error(json?.error ?? "Render failed");
  return json.url as string;
}

/** Download a (temporary) render url and register it as a permanent local asset. */
export async function ingestRenderUrl(url: string): Promise<GuestAsset> {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Couldn't download the render");
  const blob = await res.blob();
  return ingestFile(new File([blob], "realistic-render.jpg", { type: blob.type || "image/jpeg" }));
}

/**
 * Persist a local SCREENSHOT to a public url, render it into a Mockuuups mockup,
 * and ingest the finished CDN image as a permanent local asset. This is the one
 * place the whole render round-trip lives — shared by the Realistic-render panel
 * and by "Edit screenshot" re-rendering an edited screenshot back onto the same
 * device. Costs 1 API credit (2 for HD).
 */
export async function renderScreenshotIntoMockup(source: GuestAsset, mockupId: string, hd: boolean): Promise<GuestAsset> {
  const persisted = await persistAsset(source);
  if (!/^https?:\/\//.test(persisted.url)) throw new Error("Couldn't host the screenshot for rendering");
  const url = await renderMockup(mockupId, persisted.url, hd ? 2000 : 1000);
  return ingestRenderUrl(url);
}
