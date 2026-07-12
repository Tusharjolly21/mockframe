"use client";

import { ingestFile } from "./assets";
import type { XPostDoc } from "./screens";

/**
 * Import a real X (Twitter) post by URL through our /api/xpost proxy
 * (X's API is auth-only; fxtwitter does the reading, our server normalizes).
 * Avatar + photos come back through /api/proxy-image and are ingested as
 * local assets, so exports never depend on twimg URLs.
 */

async function ingestViaProxy(url: string, name: string): Promise<string | undefined> {
  try {
    const res = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    const asset = await ingestFile(new File([blob], name, { type: blob.type || "image/jpeg" }));
    return asset.id;
  } catch {
    return undefined;
  }
}

export async function importXPost(url: string): Promise<Partial<XPostDoc>> {
  const r = await fetch(`/api/xpost?url=${encodeURIComponent(url.trim())}`);
  const j = await r.json();
  if (!r.ok) throw new Error(j?.error ?? "Import failed");

  const out: Partial<XPostDoc> = {
    name: j.name,
    handle: j.handle,
    text: j.text,
    date: j.date,
    views: j.views,
    replies: j.replies,
    reposts: j.reposts,
    likes: j.likes,
  };
  if (j.avatar) out.avatar = await ingestViaProxy(j.avatar, "x-avatar.jpg");
  if (Array.isArray(j.photos) && j.photos.length) {
    const ids: string[] = [];
    for (let i = 0; i < j.photos.length; i++) {
      const id = await ingestViaProxy(j.photos[i], `x-photo-${i}.jpg`);
      if (id) ids.push(id);
    }
    out.images = ids.length ? ids : undefined;
  } else {
    out.images = undefined;
  }
  return out;
}
