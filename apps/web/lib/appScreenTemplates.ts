"use client";

import { getDevice } from "@framekit/devices";
import { createMockupLayer, createScene, createTextLayer, type Background, type SceneDocument } from "@framekit/scene";
import { encodeScreenAsset } from "./screens";
import {
  defaultDatingDoc,
  defaultInstagramRequests,
  defaultScreenDoc,
  defaultSocialDoc,
  type ScreenApp,
  type ScreenDoc,
} from "./screens/types";

/**
 * Ready-made app screenshot templates: a realistic phone holding a fully
 * editable app screen (chat, dating profile, feed, store listing…), on a
 * premium background with an optional headline — the shape of an App Store /
 * social screenshot. Every piece stays an ordinary scene layer, so the screen
 * is edited in Screen Studio and the text, device and background in the
 * normal panels.
 */

export type AppTemplateCategory = "Messaging" | "Dating" | "Social" | "AI" | "Apps & Store";
export const APP_TEMPLATE_CATEGORIES: AppTemplateCategory[] = ["Messaging", "Dating", "Social", "AI", "Apps & Store"];

export interface AppScreenTemplate {
  slug: string;
  label: string;
  blurb: string;
  category: AppTemplateCategory;
  /** the app this screen imitates (for icons / filters) */
  app: ScreenApp;
  deviceId: string;
  frameVariant?: string;
  doc: () => ScreenDoc;
  background: Background;
  /** CSS background for gallery cards (mirrors `background`) */
  cardBg: string;
  headline?: string;
  sub?: string;
  /** headline color (defaults to white) */
  ink?: string;
}

const studio = (id: string): Background => ({ type: "image", assetId: `builtin:${id}`, fit: "cover", blur: 0, opacity: 1 });
const lin = (angle: number, colors: string[]): Background => ({
  type: "linear-gradient",
  angle,
  stops: colors.map((color, i) => ({ at: i / (colors.length - 1), color })),
});
const mesh = (seed: number, colors: string[]): Background => ({ type: "mesh-gradient", seed, colors });

const dark = <T extends ScreenDoc>(doc: T): T => ({ ...doc, chrome: { ...doc.chrome, dark: true } });
const android = <T extends ScreenDoc>(doc: T): T => ({ ...doc, chrome: { ...doc.chrome, platform: "android" } });

export const APP_SCREEN_TEMPLATES: AppScreenTemplate[] = [
  /* ------------------------------ Messaging ------------------------------- */
  {
    slug: "whatsapp-chat", label: "WhatsApp chat", category: "Messaging", app: "whatsapp",
    blurb: "A WhatsApp conversation with the doodle wallpaper, ticks and composer, in an iPhone 17 Pro.",
    deviceId: "iphone-17-pro", frameVariant: "natural-titanium", doc: () => defaultScreenDoc("whatsapp"),
    background: mesh(41, ["#064e3b", "#10b981", "#065f46", "#a7f3d0"]), cardBg: "linear-gradient(140deg,#064e3b,#10b981)",
    headline: "Chats that feel real", sub: "Every tick, bubble and wallpaper",
  },
  {
    slug: "imessage-conversation", label: "iMessage conversation", category: "Messaging", app: "imessage",
    blurb: "Blue and grey bubbles, read receipts and the iOS composer on a clean studio sweep.",
    deviceId: "iphone-17-pro-max", frameVariant: "desert-titanium", doc: () => defaultScreenDoc("imessage"),
    background: studio("st-white"), cardBg: "radial-gradient(circle at 50% 30%,#ffffff,#c9ccd3)",
    headline: "Text like it's real", sub: "iMessage, pixel-accurate", ink: "#111827",
  },
  {
    slug: "google-messages-pixel", label: "Google Messages on Pixel", category: "Messaging", app: "gmessages",
    blurb: "An Android RCS chat in Material You on a Pixel 10 Pro.",
    deviceId: "pixel-10-pro", frameVariant: "moonstone", doc: () => defaultScreenDoc("gmessages"),
    background: lin(150, ["#dbeafe", "#a5b4fc", "#6366f1"]), cardBg: "linear-gradient(150deg,#dbeafe,#6366f1)",
    headline: "Built for Android", sub: "RCS chats in Material You",
  },
  {
    slug: "telegram-chat", label: "Telegram chat", category: "Messaging", app: "telegram",
    blurb: "Telegram's pastel pattern wallpaper, green bubbles and double ticks.",
    deviceId: "iphone-17", frameVariant: "sage", doc: () => defaultScreenDoc("telegram"),
    background: lin(160, ["#0ea5e9", "#2563eb", "#1e3a8a"]), cardBg: "linear-gradient(160deg,#0ea5e9,#1e3a8a)",
    headline: "Fast. Secure. Yours.",
  },
  {
    slug: "wechat-chat", label: "WeChat chat", category: "Messaging", app: "wechat",
    blurb: "A WeChat business chat with square avatars and green bubbles.",
    deviceId: "iphone-16-pro", frameVariant: "black-titanium", doc: () => defaultScreenDoc("wechat"),
    background: studio("st-sand"), cardBg: "radial-gradient(circle at 50% 30%,#efe4d3,#c7b393)",
    headline: "Close the deal on WeChat", ink: "#1c1917",
  },
  {
    slug: "instagram-dm", label: "Instagram DM", category: "Messaging", app: "instagram",
    blurb: "An Instagram direct-message thread with reactions and the Seen receipt.",
    deviceId: "iphone-17-pro", frameVariant: "black-titanium", doc: () => defaultScreenDoc("instagram"),
    background: lin(135, ["#f58529", "#dd2a7b", "#8134af", "#515bd4"]), cardBg: "linear-gradient(135deg,#f58529,#dd2a7b,#8134af,#515bd4)",
    headline: "Slide into the DMs",
  },
  {
    slug: "instagram-requests", label: "Instagram message requests", category: "Messaging", app: "instagram",
    blurb: "The DM requests inbox, ready for a 'my inbox is on fire' post.",
    deviceId: "iphone-16-pro", frameVariant: "natural-titanium", doc: () => defaultInstagramRequests(),
    background: mesh(57, ["#4c1d95", "#db2777", "#f97316", "#1e1b4b"]), cardBg: "linear-gradient(135deg,#4c1d95,#db2777,#f97316)",
  },
  {
    slug: "messenger-chat", label: "Messenger chat", category: "Messaging", app: "messenger",
    blurb: "A Facebook Messenger conversation with reactions and the like button.",
    deviceId: "galaxy-s25", frameVariant: "icyblue", doc: () => android(defaultScreenDoc("messenger")),
    background: lin(145, ["#00c6ff", "#0072ff", "#7f00ff"]), cardBg: "linear-gradient(145deg,#00c6ff,#0072ff,#7f00ff)",
    headline: "Talk to your people",
  },
  {
    slug: "snapchat-chat", label: "Snapchat chat", category: "Messaging", app: "snapchat",
    blurb: "Snapchat's chat with streaks and the yellow camera feel.",
    deviceId: "iphone-17-air", frameVariant: "sky-blue", doc: () => defaultScreenDoc("snapchat"),
    background: lin(160, ["#fffc00", "#ffd60a", "#f59e0b"]), cardBg: "linear-gradient(160deg,#fffc00,#f59e0b)",
    headline: "Keep the streak alive", ink: "#111111",
  },
  {
    slug: "discord-channel", label: "Discord channel", category: "Messaging", app: "discord",
    blurb: "A dark Discord server channel with usernames, roles and the message bar.",
    deviceId: "pixel-10-pro-xl", frameVariant: "obsidian", doc: () => android(defaultScreenDoc("discord")),
    background: mesh(88, ["#1e1b4b", "#5865f2", "#0b0820", "#7c3aed"]), cardBg: "linear-gradient(150deg,#1e1b4b,#5865f2,#0b0820)",
    headline: "Your community, live",
  },

  /* -------------------------------- Dating -------------------------------- */
  {
    slug: "tinder-profile", label: "Tinder profile", category: "Dating", app: "dating",
    blurb: "A Tinder discovery card with bio, interests, swipe buttons and the tab bar.",
    deviceId: "iphone-17-pro", frameVariant: "natural-titanium", doc: () => defaultDatingDoc("tinder"),
    background: lin(150, ["#fd267a", "#ff6036"]), cardBg: "linear-gradient(150deg,#fd267a,#ff6036)",
    headline: "It's a match", sub: "Profiles that look the part",
  },
  {
    slug: "tinder-chat", label: "Tinder match chat", category: "Dating", app: "dating",
    blurb: "The conversation after the match, Tinder-styled.",
    deviceId: "iphone-16-pro", frameVariant: "black-titanium", doc: () => ({ ...defaultDatingDoc("tinder"), mode: "chat" as const }),
    background: studio("st-blush"), cardBg: "radial-gradient(circle at 50% 30%,#f8e6e9,#d9aab3)",
    headline: "Say something better than hey", ink: "#3f0d1c",
  },
  {
    slug: "bumble-profile", label: "Bumble profile", category: "Dating", app: "dating",
    blurb: "A Bumble profile card with the yellow brand chrome and navigation.",
    deviceId: "iphone-17", frameVariant: "lavender", doc: () => defaultDatingDoc("bumble"),
    background: lin(160, ["#ffe169", "#ffc629", "#f5a300"]), cardBg: "linear-gradient(160deg,#ffe169,#f5a300)",
    headline: "Make the first move", ink: "#1d1d1f",
  },
  {
    slug: "bumble-chat", label: "Bumble chat", category: "Dating", app: "dating",
    blurb: "A Bumble conversation, ready to post.",
    deviceId: "galaxy-z-flip-7", frameVariant: "coralred", doc: () => android({ ...defaultDatingDoc("bumble"), mode: "chat" as const }),
    background: studio("st-sand"), cardBg: "radial-gradient(circle at 50% 30%,#efe4d3,#c7b393)",
  },
  {
    slug: "hinge-profile", label: "Hinge profile", category: "Dating", app: "hinge",
    blurb: "Hinge's prompt-and-photo profile with like buttons.",
    deviceId: "iphone-17-pro", frameVariant: "desert-titanium", doc: () => defaultScreenDoc("hinge"),
    background: lin(160, ["#4a1942", "#67295f", "#9b4f8f"]), cardBg: "linear-gradient(160deg,#4a1942,#9b4f8f)",
    headline: "Designed to be deleted",
  },

  /* -------------------------------- Social -------------------------------- */
  {
    slug: "tiktok-comments", label: "TikTok comments", category: "Social", app: "tiktok",
    blurb: "A TikTok comment sheet with likes, replies and 'Liked by creator'.",
    deviceId: "iphone-17-pro-max", frameVariant: "black-titanium", doc: () => defaultScreenDoc("tiktok"),
    background: studio("st-graphite"), cardBg: "radial-gradient(circle at 50% 20%,#3a3d44,#0a0b0d)",
    headline: "Read the comments",
  },
  {
    slug: "youtube-video", label: "YouTube video page", category: "Social", app: "youtube",
    blurb: "A YouTube watch page with title, channel, actions and comments.",
    deviceId: "pixel-10-pro", frameVariant: "obsidian", doc: () => android(defaultScreenDoc("youtube")),
    background: lin(160, ["#ff0033", "#7f0018", "#18181b"]), cardBg: "linear-gradient(160deg,#ff0033,#18181b)",
    headline: "Go viral",
  },
  {
    slug: "reddit-thread", label: "Reddit thread", category: "Social", app: "reddit",
    blurb: "A Reddit post with votes and threaded comments.",
    deviceId: "iphone-16-pro", frameVariant: "natural-titanium", doc: () => defaultScreenDoc("reddit"),
    background: lin(150, ["#ff4500", "#ff8717"]), cardBg: "linear-gradient(150deg,#ff4500,#ff8717)",
    headline: "Top of the front page",
  },
  {
    slug: "x-post-thread", label: "X post", category: "Social", app: "xpost",
    blurb: "An X post with replies, shown in the app.",
    deviceId: "iphone-17-pro", frameVariant: "black-titanium", doc: () => dark(defaultScreenDoc("xpost")),
    background: studio("st-graphite"), cardBg: "radial-gradient(circle at 50% 20%,#3a3d44,#0a0b0d)",
  },
  {
    slug: "threads-post", label: "Threads post", category: "Social", app: "social",
    blurb: "A Threads post with likes, replies and reposts.",
    deviceId: "iphone-17", frameVariant: "black", doc: () => defaultSocialDoc("threads"),
    background: studio("st-white"), cardBg: "radial-gradient(circle at 50% 30%,#ffffff,#c9ccd3)", ink: "#111827",
    headline: "Start a thread",
  },
  {
    slug: "instagram-story", label: "Instagram story", category: "Social", app: "story",
    blurb: "A full-screen Instagram story with progress bars and reply bar.",
    deviceId: "iphone-17-air", frameVariant: "cloud-white", doc: () => defaultScreenDoc("story"),
    background: mesh(73, ["#f97316", "#ec4899", "#8b5cf6", "#fde68a"]), cardBg: "linear-gradient(135deg,#f97316,#ec4899,#8b5cf6)",
  },

  /* ---------------------------------- AI ---------------------------------- */
  {
    slug: "ai-chat", label: "AI chat", category: "AI", app: "ai",
    blurb: "A ChatGPT / Claude / Gemini style conversation; switch the model in Screen Studio.",
    deviceId: "iphone-17-pro", frameVariant: "natural-titanium", doc: () => defaultScreenDoc("ai"),
    background: mesh(97, ["#4c1d95", "#1d4ed8", "#be185d", "#0b0820"]), cardBg: "linear-gradient(135deg,#4c1d95,#1d4ed8,#be185d)",
    headline: "Ask anything",
  },
  {
    slug: "ai-app-home", label: "AI app home", category: "AI", app: "aiapp",
    blurb: "The home screen of an AI assistant app.",
    deviceId: "pixel-10-pro-fold", frameVariant: "moonstone", doc: () => android(defaultScreenDoc("aiapp")),
    background: studio("st-lilac"), cardBg: "radial-gradient(circle at 50% 30%,#ece7fb,#b6a9dc)", ink: "#1e1b4b",
  },

  /* ------------------------------ Apps & Store ---------------------------- */
  {
    slug: "spotify-now-playing", label: "Spotify now playing", category: "Apps & Store", app: "spotify",
    blurb: "Spotify's player with album art, progress and controls.",
    deviceId: "iphone-17-pro", frameVariant: "black-titanium", doc: () => defaultScreenDoc("spotify"),
    background: lin(160, ["#1db954", "#0b3d1d", "#050505"]), cardBg: "linear-gradient(160deg,#1db954,#050505)",
    headline: "On repeat",
  },
  {
    slug: "app-store-listing", label: "App Store listing", category: "Apps & Store", app: "appstore",
    blurb: "Your app's App Store page with icon, ratings and Get button.",
    deviceId: "iphone-17-pro-max", frameVariant: "natural-titanium", doc: () => defaultScreenDoc("appstore"),
    background: lin(150, ["#38bdf8", "#2563eb", "#1e1b4b"]), cardBg: "linear-gradient(150deg,#38bdf8,#1e1b4b)",
    headline: "Now on the App Store",
  },
  {
    slug: "google-play-listing", label: "Google Play listing", category: "Apps & Store", app: "googleplay",
    blurb: "Your app's Google Play page on a Pixel.",
    deviceId: "pixel-10-pro", frameVariant: "jade", doc: () => android(defaultScreenDoc("googleplay")),
    background: lin(150, ["#34d399", "#01875f", "#003d2b"]), cardBg: "linear-gradient(150deg,#34d399,#003d2b)",
    headline: "Get it on Google Play",
  },
  {
    slug: "google-maps-route", label: "Google Maps route", category: "Apps & Store", app: "googlemaps",
    blurb: "A Google Maps navigation route with ETA.",
    deviceId: "galaxy-s25-edge", frameVariant: "titanium-silver", doc: () => android(defaultScreenDoc("googlemaps")),
    background: studio("st-white"), cardBg: "radial-gradient(circle at 50% 30%,#ffffff,#c9ccd3)", ink: "#111827",
    headline: "Find your way",
  },
  {
    slug: "email-inbox", label: "Email", category: "Apps & Store", app: "email",
    blurb: "An email thread in a Gmail / Apple Mail style client.",
    deviceId: "iphone-16-pro", frameVariant: "natural-titanium", doc: () => defaultScreenDoc("email"),
    background: studio("st-ocean"), cardBg: "radial-gradient(circle at 50% 20%,#1d4f80,#081b30)",
    headline: "Inbox zero, finally",
  },
];

export function appTemplateBySlug(slug: string): AppScreenTemplate | undefined {
  return APP_SCREEN_TEMPLATES.find((t) => t.slug === slug);
}

const CANVAS_W = 1080;
const CANVAS_H = 1350;

/** A 4:5 social / store-ready scene: headline up top, the phone below. */
export function makeAppScreenScene(t: AppScreenTemplate): SceneDocument {
  const scene = createScene({ width: CANVAS_W, height: CANVAS_H, background: t.background });
  const device = getDevice(t.deviceId);
  const frameH = device?.frame.height ?? 2700;
  const frameW = device?.frame.width ?? 1300;
  const hasText = !!t.headline;
  // phone height ~75% of the canvas under a headline, ~86% centered without
  // one, always leaving a margin for the shadow; wide devices
  // (open foldables) are limited by width instead
  const targetH = CANVAS_H * (hasText ? 0.75 : 0.86);
  const scale = Math.min(targetH / frameH, (CANVAS_W * 0.86) / frameW);
  const layer = createMockupLayer({
    deviceId: t.deviceId,
    frameVariant: t.frameVariant,
    media: { assetId: encodeScreenAsset(t.doc()), kind: "image", fit: "cover", offsetX: 0, offsetY: 0, scale: 1 },
  });
  layer.id = "layer-template";
  layer.transform = { ...layer.transform, scale: Math.round(scale * 1000) / 1000, y: hasText ? Math.round(CANVAS_H * 0.12) : 0 };
  layer.shadow = { mode: "adaptive", lightAngle: 90, distance: 46, softness: 90, opacity: 0.3, color: "#0b0b17" };
  scene.layers.push(layer);

  if (t.headline) {
    const head = createTextLayer(t.headline);
    head.id = "text-headline";
    head.color = t.ink ?? "#ffffff";
    head.font = { ...head.font, size: 66, weight: 800, letterSpacing: -0.03 };
    head.maxWidth = CANVAS_W - 140;
    head.transform = { ...head.transform, y: -CANVAS_H / 2 + (t.sub ? 118 : 132) };
    scene.layers.push(head);
  }
  if (t.headline && t.sub) {
    const sub = createTextLayer(t.sub);
    sub.id = "text-sub";
    // a touch softer than the headline (8-digit hex alpha)
    sub.color = `${t.ink ?? "#ffffff"}d1`;
    sub.font = { ...sub.font, size: 32, weight: 500, letterSpacing: -0.01 };
    sub.maxWidth = CANVAS_W - 160;
    sub.transform = { ...sub.transform, y: -CANVAS_H / 2 + 186 };
    scene.layers.push(sub);
  }
  scene.id = `scene-app-template-${t.slug}`;
  return scene;
}
