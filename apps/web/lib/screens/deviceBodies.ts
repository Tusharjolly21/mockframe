"use client";

/**
 * Photoreal device bodies are raster <image>s referenced by URL. Fake-app screens
 * (the Store Promo templates) are serialized to an SVG that is later loaded through
 * an <img>, and an <img>-loaded SVG cannot fetch anything — every image inside it
 * has to be a data: URI. This module inlines them: the first render fetches the
 * body and serves a transparent placeholder, then `onDeviceImagesReady` fires so the
 * caller re-renders with the real pixels.
 */
const TRANSPARENT = "data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==";
const data = new Map<string, string>();
const inflight = new Set<string>();
const listeners = new Set<() => void>();
let pending = false;

function request(url: string) {
  if (inflight.has(url) || typeof fetch === "undefined") return;
  inflight.add(url);
  fetch(url)
    .then((r) => (r.ok ? r.blob() : Promise.reject(new Error(String(r.status)))))
    .then(
      (b) =>
        new Promise<string>((res, rej) => {
          const fr = new FileReader();
          fr.onload = () => res(String(fr.result));
          fr.onerror = () => rej(fr.error);
          fr.readAsDataURL(b);
        })
    )
    .then((uri) => {
      data.set(url, uri);
      listeners.forEach((fn) => fn());
    })
    .catch(() => {
      // leave the placeholder; a later render retries
    })
    .finally(() => inflight.delete(url));
}

/** Replace `/devices/*.webp` image hrefs in an SVG fragment with inline data URIs. */
export function inlineDeviceImages(fragment: string): string {
  return fragment.replace(/href="(\/devices\/[^"]+)"/g, (_m, url: string) => {
    const hit = data.get(url);
    if (hit) return `href="${hit}"`;
    pending = true;
    request(url);
    return `href="${TRANSPARENT}"`;
  });
}

/** True (once) if the last render had to use a placeholder, so it must not be cached. */
export function consumeDeviceImagesPending(): boolean {
  const p = pending;
  pending = false;
  return p;
}

export function onDeviceImagesReady(fn: () => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}
