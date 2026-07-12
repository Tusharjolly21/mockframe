"use client";

import { ingestFile } from "./assets";
import type { BlueskyDoc } from "./screens";

/**
 * Import a real Bluesky post by URL (PostSpark parity). Bluesky's public
 * AppView API is CORS-open, so this works entirely client-side:
 *   1. bsky.app/profile/{actor}/post/{rkey} → resolve handle → DID
 *   2. app.bsky.feed.getPostThread → author, text, time, counts, link embed
 *   3. avatar + link thumbnail are fetched and ingested as local assets
 */

const API = "https://public.api.bsky.app/xrpc";

interface BskyExternal {
  uri: string;
  title: string;
  description: string;
  thumb?: string;
}

/** "November 30th, 2024 at 4:00 AM" (PostSpark's timestamp format). */
function formatTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const day = d.getDate();
  const suffix = day % 10 === 1 && day !== 11 ? "st" : day % 10 === 2 && day !== 12 ? "nd" : day % 10 === 3 && day !== 13 ? "rd" : "th";
  let h = d.getHours();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  const min = String(d.getMinutes()).padStart(2, "0");
  return `${months[d.getMonth()]} ${day}${suffix}, ${d.getFullYear()} at ${h}:${min} ${ampm}`;
}

/** Download an image URL and register it as a local asset; undefined on failure. */
async function ingestRemoteImage(url: string, name: string): Promise<string | undefined> {
  try {
    const res = await fetch(url);
    if (!res.ok) return undefined;
    const blob = await res.blob();
    const asset = await ingestFile(new File([blob], name, { type: blob.type || "image/jpeg" }));
    return asset.id;
  } catch {
    return undefined;
  }
}

/** Parse + fetch a Bluesky post; returns doc fields to merge. Throws with a
 *  human-readable message on any failure. */
export async function importBlueskyPost(url: string): Promise<Partial<BlueskyDoc>> {
  const m = url.match(/bsky\.app\/profile\/([^/]+)\/post\/([a-z0-9]+)/i);
  if (!m) throw new Error("Paste a bsky.app post link (bsky.app/profile/…/post/…)");
  const [, actor, rkey] = m;

  // handle → DID (skip if the URL already carries a DID)
  let did = actor;
  if (!actor.startsWith("did:")) {
    const r = await fetch(`${API}/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(actor)}`);
    if (!r.ok) throw new Error("Couldn't resolve that handle");
    did = (await r.json()).did as string;
  }

  const uri = `at://${did}/app.bsky.feed.post/${rkey}`;
  const r = await fetch(`${API}/app.bsky.feed.getPostThread?uri=${encodeURIComponent(uri)}&depth=0`);
  if (!r.ok) throw new Error("Post not found — is it public?");
  const thread = (await r.json()).thread;
  const post = thread?.post;
  if (!post) throw new Error("Post not found — is it public?");

  const author = post.author ?? {};
  const record = post.record ?? {};
  const out: Partial<BlueskyDoc> = {
    name: author.displayName || author.handle || "Bluesky",
    handle: author.handle || "bsky.app",
    text: record.text ?? "",
    time: formatTime(record.createdAt ?? ""),
    replies: post.replyCount ?? 0,
    reposts: (post.repostCount ?? 0) + (post.quoteCount ?? 0),
    likes: post.likeCount ?? 0,
  };

  if (author.avatar) out.avatar = await ingestRemoteImage(author.avatar, "bsky-avatar.jpg");

  // external link embed → our link card
  const external = (post.embed?.external ?? post.embed?.media?.external) as BskyExternal | undefined;
  if (external) {
    let domain = "";
    try {
      domain = new URL(external.uri).hostname.replace(/^www\./, "");
    } catch {
      domain = external.uri;
    }
    out.link = {
      title: external.title || domain,
      desc: external.description || "",
      domain,
      image: external.thumb ? await ingestRemoteImage(external.thumb, "bsky-link.jpg") : undefined,
    };
  } else {
    out.link = undefined;
  }

  return out;
}
