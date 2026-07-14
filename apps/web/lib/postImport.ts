"use client";

import { ingestFile } from "./assets";
import type { SocialPostDoc } from "./screens";

async function ingestAvatar(url: string) {
  try {
    const response = await fetch(`/api/proxy-image?url=${encodeURIComponent(url)}`);
    if (!response.ok) return undefined;
    const blob = await response.blob();
    return (await ingestFile(new File([blob], "post-avatar.jpg", { type: blob.type || "image/jpeg" }))).id;
  } catch {
    return undefined;
  }
}

export async function importPostUrl(url: string): Promise<Partial<SocialPostDoc>> {
  const response = await fetch(`/api/post?url=${encodeURIComponent(url.trim())}`);
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error || "The post could not be imported");
  const avatar = data.avatar ? await ingestAvatar(data.avatar) : undefined;
  return {
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
    avatar,
    verified: false,
    standalone: true,
  };
}
