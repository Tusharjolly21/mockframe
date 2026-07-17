"use client";

import type { ResolvedAsset } from "@framekit/renderer";
import { SH, SW, svgDataUri } from "./common";
import { renderAiApp } from "./aiapp";
import { renderAiChat } from "./aichat";
import { renderBluesky, renderBlueskyCard } from "./bluesky";
import { renderCode } from "./code";
import { renderDating } from "./dating";
import { renderDiscord } from "./discord";
import { renderEmail } from "./email";
import { githubStandaloneSize, renderGithub } from "./github";
import { renderHinge } from "./hinge";
import { renderLine } from "./line";
import { renderStripe, stripeStandaloneSize } from "./stripe";
import { renderStory } from "./story";
import { renderTeams } from "./teams";
import { renderTestimonial, testimonialSize } from "./testimonial";
import { renderYouTube } from "./youtube";
import { renderIMessage } from "./imessage";
import { renderReddit } from "./reddit";
import { renderSignal } from "./signal";
import { renderSlack } from "./slack";
import { renderSocial, renderSocialCard } from "./social";
import { renderInstagram } from "./instagram";
import { renderMessenger } from "./messenger";
import { renderSnapchat } from "./snapchat";
import { renderTelegram } from "./telegram";
import { renderTikTok } from "./tiktok";
import { renderWhatsApp, renderWhatsAppGroup } from "./whatsapp";
import { renderXPost, renderXPostCard } from "./xpost";
import { renderIosNotification, iosNotificationSize } from "./iosnotification";
import { renderSpotify, spotifyCardSize } from "./spotify";
import { renderAppStore, appStoreCardSize } from "./appstore";
import { renderAppStorePromo, appStorePromoCardSize } from "./appstore-promo";
import { renderGoogleMaps, googleMapsCardSize } from "./googlemaps";
import { renderGooglePlay, googlePlayCardSize } from "./googleplay";
import { SCREEN_APP_LABELS, type ScreenDoc } from "./types";

export * from "./types";

/**
 * `screen:` asset scheme (framekit-screen-studio.md §2.1): the document IS
 * the assetId, so edits are scene mutations (undo/drafts for free) and the
 * render worker can resolve the identical generator for re-render parity.
 */

export const SCREEN_PREFIX = "screen:";

export function isScreenAsset(assetId: string): boolean {
  return assetId.startsWith(SCREEN_PREFIX);
}

/* ------------------------------- animation ----------------------------------- */
/* Chat replay: reveal messages one at a time. Works by re-encoding the doc
   with `messages` sliced to N — no renderer changes, and every intermediate
   state is a normal `screen:` asset the exporter can rasterize. */

type WithMessages = Extract<ScreenDoc, { messages: unknown[] }>;
function hasMessages(doc: ScreenDoc): doc is WithMessages {
  return "messages" in doc && Array.isArray((doc as WithMessages).messages);
}

/** How many reveal steps a doc has (0 = not a message-based chat). */
export function animMessageCount(doc: ScreenDoc): number {
  return hasMessages(doc) ? doc.messages.length : 0;
}

/** Sender of each message ("them" for non-directional apps like Discord). */
export function messageSenders(doc: ScreenDoc): ("me" | "them")[] {
  if (!hasMessages(doc)) return [];
  return doc.messages.map((m) => ((m as { from?: string }).from === "me" ? "me" : "them"));
}

/** A copy of the doc showing only the first `n` messages, optionally with the
 *  typing indicator active. When NOT `settled`, the just-revealed (newest)
 *  message's reaction is hidden — so reactions don't pop in the instant a
 *  bubble appears; they fade in a beat later, which reads far more natural. */
export function animStateDoc(
  doc: ScreenDoc,
  n: number,
  typing: boolean,
  dotPhase = 0,
  settled = false
): ScreenDoc {
  let msgs = hasMessages(doc) ? (doc.messages.slice(0, Math.max(0, n)) as { reaction?: string }[]) : undefined;
  if (msgs && !settled && msgs.length) {
    const last = msgs.length - 1;
    if (msgs[last].reaction) msgs = msgs.map((mm, i) => (i === last ? { ...mm, reaction: undefined } : mm));
  }
  const base = msgs ? ({ ...doc, messages: msgs } as ScreenDoc) : doc;
  return {
    ...base,
    chrome: { ...base.chrome, _anim: typing ? { typing: true, dotPhase } : undefined },
  } as ScreenDoc;
}

export function sliceScreenDoc(doc: ScreenDoc, n: number): ScreenDoc {
  return animStateDoc(doc, n, false);
}

/** One step of the chat-replay animation. */
export interface AnimShot {
  kind: "typing" | "reveal";
  k: number; // messages visible
  typing: boolean;
  holdMs: number; // dwell after fade-in
  fadeMs: number; // crossfade in from the previous shot
  easing?: "linear" | "ease-in-out" | "spring";
  /** show the newest message's reaction (used for the final "settle" beat) */
  settled?: boolean;
}

/**
 * Premium replay timeline: a typing beat (animated dots / "typing…" header)
 * precedes each incoming reply, then the message fades in; outgoing messages
 * pop in a little quicker (you just sent them). Reads like a real conversation
 * rather than a metronome.
 */
export function buildAnimPlan(doc: ScreenDoc): AnimShot[] {
  if (!hasMessages(doc)) return [];
  const msgs = doc.messages as Array<{ from?: string; delayMs?: number }>;
  const total = msgs.length;
  const shots: AnimShot[] = [];
  if (total === 0) return shots;

  const bump = (ms: number) => {
    if (shots.length) shots[shots.length - 1].holdMs += ms;
  };
  for (let i = 0; i < total; i++) {
    const incoming = msgs[i].from !== "me";
    // per-message "seconds before" overrides the default rhythm
    const gap = msgs[i].delayMs ?? (i === 0 ? 300 : incoming ? 1050 : 650);
    if (incoming) {
      // the other person "types" for the gap, then the message lands
      shots.push({ kind: "typing", k: i, typing: true, holdMs: Math.max(300, gap), fadeMs: shots.length ? 200 : 160, easing: "ease-in-out" });
      shots.push({ kind: "reveal", k: i + 1, typing: false, holdMs: 380, fadeMs: 260, easing: "spring" });
    } else {
      // you pause, then send
      bump(gap);
      shots.push({ kind: "reveal", k: i + 1, typing: false, holdMs: 420, fadeMs: 220, easing: "spring" });
    }
  }
  // final "settle" beat: fade in the last message's reaction (if any) + linger
  shots.push({ kind: "reveal", k: total, typing: false, settled: true, holdMs: 1300, fadeMs: 300, easing: "ease-in-out" });
  return shots;
}

export function encodeScreenAsset(doc: ScreenDoc): string {
  return SCREEN_PREFIX + encodeURIComponent(JSON.stringify(doc));
}

export function decodeScreenAsset(assetId: string): ScreenDoc | undefined {
  if (!isScreenAsset(assetId)) return undefined;
  try {
    const doc = JSON.parse(decodeURIComponent(assetId.slice(SCREEN_PREFIX.length)));
    return doc && typeof doc === "object" && doc.app in SCREEN_APP_LABELS ? (doc as ScreenDoc) : undefined;
  } catch {
    return undefined;
  }
}

/** Maps an uploaded asset id (e.g. a contact photo) to its data URL. */
export type AssetUrlLookup = (assetId: string) => string | undefined;

/** Logical height of a screen — normally full-phone (SH), but standalone
 *  chart cards export at a compact card height. */
export function screenLogicalHeight(doc: ScreenDoc): number {
  if (doc.app === "github" && doc.standalone) return githubStandaloneSize(doc).height;
  if (doc.app === "stripe" && doc.standalone) return stripeStandaloneSize(doc).height;
  if (doc.app === "testimonial") return testimonialSize(doc).height;
  if (doc.app === "ios-notification") return iosNotificationSize(doc).height;
  if (doc.app === "spotify" && doc.standalone) return spotifyCardSize(doc).height;
  if (doc.app === "appstore" && doc.standalone) return appStoreCardSize(doc).height;
  if (doc.app === "appstore-promo") return appStorePromoCardSize(doc).height;
  if (doc.app === "googlemaps" && doc.standalone) return googleMapsCardSize(doc).height;
  if (doc.app === "googleplay" && doc.standalone) return googlePlayCardSize(doc).height;
  // template cards have a content-driven height — resolved via renderScreenSized
  return SH;
}

/** Logical width of fixed-size screens and resizable standalone chart cards. */
export function screenLogicalWidth(doc: ScreenDoc): number {
  if (doc.app === "github" && doc.standalone) return githubStandaloneSize(doc).width;
  if (doc.app === "stripe" && doc.standalone) return stripeStandaloneSize(doc).width;
  if (doc.app === "testimonial") return testimonialSize(doc).width;
  if (doc.app === "ios-notification") return iosNotificationSize(doc).width;
  if (doc.app === "spotify" && doc.standalone) return spotifyCardSize(doc).width;
  if (doc.app === "appstore" && doc.standalone) return appStoreCardSize(doc).width;
  if (doc.app === "appstore-promo") return appStorePromoCardSize(doc).width;
  if (doc.app === "googlemaps" && doc.standalone) return googleMapsCardSize(doc).width;
  if (doc.app === "googleplay" && doc.standalone) return googlePlayCardSize(doc).width;
  return SW;
}

/** All uploaded asset ids a doc references (avatar + per-message images +
 *  YouTube thumbnail / Story background / Hinge photo cards). */
function referencedAssetIds(doc: ScreenDoc): string[] {
  const ids: string[] = [];
  if ("avatar" in doc && doc.avatar) ids.push(doc.avatar);
  if (doc.app === "ios-notification" && doc.appIcon) ids.push(doc.appIcon);
  if (doc.app === "youtube" && doc.thumbnail) ids.push(doc.thumbnail);
  if (doc.app === "story" && doc.background) ids.push(doc.background);
  if (doc.app === "hinge") for (const card of doc.cards) if (card.type === "photo" && card.image) ids.push(card.image);
  if (hasMessages(doc)) for (const m of doc.messages) if ((m as { image?: string }).image) ids.push((m as { image: string }).image);
  // per-person photos (commenter avatars + multi-sender chat avatars)
  if (doc.app === "youtube") for (const cm of doc.comments) if (cm.avatar) ids.push(cm.avatar);
  if (doc.app === "tiktok") for (const cm of doc.comments) if (cm.avatar) ids.push(cm.avatar);
  if (doc.app === "reddit") for (const cm of doc.comments) if (cm.avatar) ids.push(cm.avatar);
  if (doc.app === "xpost") {
    for (const cm of doc.comments ?? []) if (cm.avatar) ids.push(cm.avatar);
    for (const im of doc.images ?? []) ids.push(im);
  }
  if (doc.app === "bluesky" && doc.link?.image) ids.push(doc.link.image);
  if (doc.app === "social") for (const cm of doc.commentList ?? []) if (cm.avatar) ids.push(cm.avatar);
  if (doc.app === "slack" || doc.app === "discord") for (const m of doc.messages) if (m.avatar) ids.push(m.avatar);
  if (doc.app === "appstore-promo") {
    if (doc.screenshot) ids.push(doc.screenshot);
  }
  return ids;
}

/** Render a doc → its data-URI + the logical height it occupies. Template cards
 *  (code always; bluesky/xpost when standalone) have a content-driven height. */
export function renderScreenSized(doc: ScreenDoc, lookupUrl?: AssetUrlLookup): { url: string; logicalH: number; logicalW: number } {
  const dp = "avatar" in doc && doc.avatar ? lookupUrl?.(doc.avatar) : undefined;
  const flat = (inner: string, h = SH, w = SW) => ({ url: svgDataUri(inner, h, w), logicalH: h, logicalW: w });
  switch (doc.app) {
    case "aiapp":
      return flat(renderAiApp(doc));
    case "imessage":
      return flat(renderIMessage(doc, dp, lookupUrl));
    case "whatsapp":
      return flat(renderWhatsApp(doc, dp, lookupUrl));
    case "whatsapp-group":
      return flat(renderWhatsAppGroup(doc, dp));
    case "instagram":
      return flat(renderInstagram(doc, dp, lookupUrl));
    case "messenger":
      return flat(renderMessenger(doc, dp, lookupUrl));
    case "telegram":
      return flat(renderTelegram(doc, dp, lookupUrl));
    case "snapchat":
      return flat(renderSnapchat(doc, dp));
    case "tiktok":
      return flat(renderTikTok(doc, lookupUrl));
    case "ai":
      return flat(renderAiChat(doc));
    case "email":
      return flat(renderEmail(doc, dp));
    case "discord":
      return flat(renderDiscord(doc, lookupUrl));
    case "slack":
      return flat(renderSlack(doc, lookupUrl));
    case "signal":
      return flat(renderSignal(doc, dp));
    case "reddit":
      return flat(renderReddit(doc, lookupUrl));
    case "line":
      return flat(renderLine(doc, dp, lookupUrl));
    case "dating":
      return flat(renderDating(doc, dp));
    case "youtube":
      return flat(renderYouTube(doc, dp, lookupUrl));
    case "teams":
      return flat(renderTeams(doc, dp, lookupUrl));
    case "hinge":
      return flat(renderHinge(doc, dp, lookupUrl));
    case "story":
      return flat(renderStory(doc, dp, lookupUrl));
    case "ios-notification":
      return flat(renderIosNotification(doc, dp), screenLogicalHeight(doc), screenLogicalWidth(doc));
    case "spotify":
      return flat(renderSpotify(doc, dp), screenLogicalHeight(doc), screenLogicalWidth(doc));
    case "appstore":
      return flat(renderAppStore(doc, dp), screenLogicalHeight(doc), screenLogicalWidth(doc));
    case "appstore-promo": {
      const screenshotUrl = doc.screenshot ? lookupUrl?.(doc.screenshot) : undefined;
      return flat(renderAppStorePromo(doc, dp, screenshotUrl), screenLogicalHeight(doc), screenLogicalWidth(doc));
    }
    case "googlemaps":
      return flat(renderGoogleMaps(doc), screenLogicalHeight(doc), screenLogicalWidth(doc));
    case "googleplay":
      return flat(renderGooglePlay(doc, dp), screenLogicalHeight(doc), screenLogicalWidth(doc));
    case "github":
      return flat(renderGithub(doc, dp), screenLogicalHeight(doc), screenLogicalWidth(doc));
    case "stripe":
      return flat(renderStripe(doc), screenLogicalHeight(doc), screenLogicalWidth(doc));
    case "testimonial":
      return flat(renderTestimonial(doc, dp), screenLogicalHeight(doc), screenLogicalWidth(doc));
    case "social":
      if (doc.standalone) {
        const r = renderSocialCard(doc, dp);
        return { url: svgDataUri(r.svg, r.totalH, r.totalW), logicalH: r.totalH, logicalW: r.totalW };
      }
      return flat(renderSocial(doc, dp, lookupUrl));
    case "xpost": {
      if (doc.standalone) {
        const r = renderXPostCard(doc, dp, lookupUrl);
        return { url: svgDataUri(r.svg, r.totalH, r.totalW), logicalH: r.totalH, logicalW: r.totalW };
      }
      return flat(renderXPost(doc, dp, lookupUrl));
    }
    case "bluesky": {
      if (doc.standalone) {
        const r = renderBlueskyCard(doc, dp, lookupUrl);
        return { url: svgDataUri(r.svg, r.totalH, r.totalW), logicalH: r.totalH, logicalW: r.totalW };
      }
      return flat(renderBluesky(doc, dp, lookupUrl));
    }
    case "code": {
      const r = renderCode(doc);
      return { url: svgDataUri(r.svg, r.totalH, r.totalW), logicalH: r.totalH, logicalW: r.totalW };
    }
  }
}

export function renderScreen(doc: ScreenDoc, lookupUrl?: AssetUrlLookup): string {
  return renderScreenSized(doc, lookupUrl).url;
}

/* Deterministic render → the assetId is the cache key (avatar data URLs are
   immutable per asset id). Bounded so a long editing session (new id per
   keystroke) can't grow memory unchecked. */
const cache = new Map<string, ResolvedAsset & { id: string; name: string }>();
const CACHE_MAX = 128;

export function resolveScreenAsset(
  assetId: string,
  lookupUrl?: AssetUrlLookup
): (ResolvedAsset & { id: string; name: string }) | undefined {
  const hit = cache.get(assetId);
  if (hit) return hit;
  const doc = decodeScreenAsset(assetId);
  if (!doc) return undefined;
  const { url, logicalH, logicalW } = renderScreenSized(doc, lookupUrl);
  const resolved = {
    id: assetId,
    name: `${SCREEN_APP_LABELS[doc.app]} screen`,
    url,
    width: Math.round(logicalW * 3),
    height: Math.round(logicalH * 3),
  };
  // a referenced upload (avatar or message image) isn't registered yet (e.g.
  // mid draft-restore): serve the fallback but don't cache — it fills in once
  // the asset loads
  if (referencedAssetIds(doc).some((id) => !lookupUrl?.(id))) return resolved;
  if (cache.size >= CACHE_MAX) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(assetId, resolved);
  return resolved;
}
