"use client";

import { ingestFile } from "./assets";
import type { SocialPostDoc } from "./screens";

/** Data URL (returned by /api/post) → a local asset id, or undefined. */
async function ingestDataUrl(dataUrl: string, name: string) {
  try {
    const blob = await (await fetch(dataUrl)).blob();
    return (await ingestFile(new File([blob], name, { type: blob.type || "image/jpeg" }))).id;
  } catch {
    return undefined;
  }
}

/**
 * Import a public post into the post card's fields. Throws an Error with a
 * user-facing message when the post can't be read.
 */
export async function importPostUrl(url: string): Promise<Partial<SocialPostDoc>> {
  let response: Response;
  try {
    response = await fetch(`/api/post?url=${encodeURIComponent(url.trim())}`);
  } catch {
    throw new Error("You seem to be offline — check your connection and try again");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(data?.error || "That post couldn't be imported — check the link and try again");
  const [avatar, ...images] = await Promise.all([
    data.avatar ? ingestDataUrl(data.avatar, "post-avatar.jpg") : Promise.resolve(undefined),
    ...(Array.isArray(data.images) ? data.images : []).slice(0, 4).map((u: string, i: number) => ingestDataUrl(u, `post-photo-${i + 1}.jpg`)),
  ]);
  const fields: Partial<SocialPostDoc> = {
    network: data.provider,
    sourceLabel: data.sourceLabel,
    sourceUrl: data.sourceUrl,
    name: data.name,
    subtitle: data.subtitle,
    text: data.text,
    time: data.time,
    likes: data.likes,
    comments: data.comments,
    shares: data.shares,
    verified: !!data.verified,
    showMetrics: data.hasMetrics !== false,
    images: images.filter((id): id is string => !!id),
    standalone: true,
  };
  // keep a photo the user already set when the provider gave none
  if (avatar) fields.avatar = avatar;
  return fields;
}
