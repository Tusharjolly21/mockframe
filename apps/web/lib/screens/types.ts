"use client";

/**
 * Screen Studio documents (framekit-screen-studio.md §2.2): a composed fake
 * app screen, stored INSIDE the media slot as
 * `assetId = "screen:" + encodeURIComponent(JSON.stringify(doc))`.
 * Plain JSON, discriminated on `app` — new generators are new arms.
 */

import type { FrameStyle } from "./frames";
export type { FrameStyle } from "./frames";

/** Status-bar + theme chrome shared by every generator. */
export interface ScreenChrome {
  time: string;
  battery: number; // 0–100
  dark?: boolean;
  /** iOS (default) vs Android chrome: status bar, nav bar, system font */
  platform?: "ios" | "android";
  /** transient animation state for video export (never user-authored) */
  _anim?: { typing?: boolean; dotPhase?: number };
}

/** Document attachment (PDF / doc / file card). */
export interface ChatFile {
  name: string;
  /** extension shown on the icon; colors it (pdf red, doc blue, …) */
  ext?: string;
  /** subtitle: "2 pages · 240 kB" etc. */
  meta?: string;
}

/** Link preview card. */
export interface ChatLink {
  url: string;
  title?: string;
  domain?: string;
}

/** Call-event card (WhatsApp-style: "Voice call · 32 sec", "Missed video call"). */
export interface ChatCall {
  kind: "voice" | "video";
  state: "outgoing" | "incoming" | "missed";
  duration?: string; // "32 sec" — omitted for missed
}

export interface ChatMessage {
  from: "me" | "them";
  text: string;
  /** uploaded image asset id — renders an image bubble (apps that support it) */
  image?: string;
  /** document attachment — renders a file card */
  file?: ChatFile;
  /** link attachment — renders a preview card */
  link?: ChatLink;
  /** call-event card instead of a text bubble */
  call?: ChatCall;
  /** date-separator pill shown BEFORE this message ("Today", "Yesterday") */
  dateLabel?: string;
  /** video-export pacing: ms to wait before this message pops in (overrides
   *  the auto rhythm). Set via "seconds before" in the editor. */
  delayMs?: number;
}

export interface IMessageDoc {
  app: "imessage";
  chrome: ScreenChrome;
  /** uploaded photo asset id for the contact / group / author */
  avatar?: string;
  contact: string;
  /** green SMS bubbles instead of blue iMessage */
  sms?: boolean;
  /** caption under the last outgoing bubble */
  status: "none" | "delivered" | "read";
  typing?: boolean;
  /** "iMessage · Today 9:41" conversation header */
  showHeader?: boolean;
  messages: ChatMessage[];
}

export type WhatsAppTicks = "sent" | "delivered" | "read";

export interface WhatsAppDoc {
  app: "whatsapp";
  chrome: ScreenChrome;
  /** uploaded photo asset id for the contact / group / author */
  avatar?: string;
  contact: string;
  /** header presence line: "online", "typing…", or free text */
  presence: string;
  /** chat wallpaper preset id (see wallpapers.ts); default when unset */
  wallpaper?: string;
  messages: Array<ChatMessage & { ticks?: WhatsAppTicks }>;
}

/** A reply/comment under a post (X threaded reply or FB/LinkedIn comment). */
export interface PostComment {
  user: string;
  handle?: string; // X: @handle
  text: string;
  time?: string; // "2h"
  likes?: number;
  verified?: boolean;
  /** uploaded photo asset id for this commenter */
  avatar?: string;
}

export interface XPostDoc {
  app: "xpost";
  chrome: ScreenChrome;
  /** uploaded photo asset id for the contact / group / author */
  avatar?: string;
  theme: "light" | "dim" | "dark";
  name: string;
  handle: string;
  badge: "none" | "blue" | "gold";
  text: string;
  /** 1–4 uploaded photos — rendered as the X media grid under the text */
  images?: string[];
  date: string;
  views: string;
  replies: number;
  reposts: number;
  likes: number;
  comments?: PostComment[];
  /** Template mode: render as a window-framed card instead of a phone screen */
  standalone?: boolean;
  frame?: FrameStyle;
}

/** Bluesky post (PostSpark /bluesky-post). */
export interface BlueskyDoc {
  app: "bluesky";
  chrome: ScreenChrome;
  avatar?: string;
  name: string;
  handle: string; // "bsky.app"
  text: string;
  time: string; // "November 30th, 2024 at 4:00 AM"
  replies: number;
  reposts: number;
  likes: number;
  /** optional embedded link card */
  link?: { image?: string; title: string; desc: string; domain: string };
  /** Template mode: render as a window-framed card instead of a phone screen */
  standalone?: boolean;
  frame?: FrameStyle;
}

/** Code template card (PostSpark /code): window frame + syntax theme + code font.
 *  Always a standalone card (a code editor makes no sense inside a phone). */
export interface CodeDoc {
  app: "code";
  chrome: ScreenChrome;
  code: string;
  /** display + tokenizer hint: "tsx" | "js" | "python" | "php" | … */
  language: string;
  /** syntax theme key (see code.ts CODE_THEMES) */
  theme: string;
  /** monospace code font key (see fonts.ts CODE_FONTS) */
  codeFont: string;
  frame: FrameStyle;
  filename: string;
  lineNumbers?: boolean;
  fontSize?: number;
  /** code is always a card — kept for the shared standalone/frameless plumbing */
  standalone?: boolean;
}

export interface WhatsAppGroupDoc {
  app: "whatsapp-group";
  chrome: ScreenChrome;
  /** uploaded photo asset id for the contact / group / author */
  avatar?: string;
  name: string;
  /** member summary line under the group name */
  members: string;
  wallpaper?: string;
  messages: Array<ChatMessage & { ticks?: WhatsAppTicks; sender?: string; senderAvatar?: string }>;
}

export interface InstagramDoc {
  app: "instagram";
  chrome: ScreenChrome;
  /** uploaded photo asset id for the contact / group / author */
  avatar?: string;
  username: string;
  presence: string; // "Active now", "Active 2h ago", …
  /** "Seen" caption under the last outgoing message */
  seen?: boolean;
  messages: Array<ChatMessage & { reaction?: string }>;
}

export interface MessengerDoc {
  app: "messenger";
  chrome: ScreenChrome;
  /** uploaded photo asset id for the contact / group / author */
  avatar?: string;
  contact: string;
  presence: string;
  messages: Array<ChatMessage & { reaction?: string }>;
}

export interface TelegramDoc {
  app: "telegram";
  chrome: ScreenChrome;
  /** uploaded photo asset id for the contact / group / author */
  avatar?: string;
  contact: string;
  presence: string; // "last seen recently", "online", …
  wallpaper?: string;
  messages: Array<ChatMessage & { ticks?: WhatsAppTicks }>;
}

/** Snapchat message-status line under the latest message (ALL-CAPS). */
export type SnapStatus = "none" | "Delivered" | "Opened" | "Received" | "Screenshot!" | "Replied";

export interface SnapchatDoc {
  app: "snapchat";
  chrome: ScreenChrome;
  /** uploaded photo asset id for the contact / group / author */
  avatar?: string;
  contact: string;
  /** streak count shown next to the name; 0 hides it */
  streak: number;
  /** status line under the newest message; accent-colored for Screenshot!/Replied */
  status?: SnapStatus;
  /** selects the accent for Screenshot!/Replied (chat=blue, snap=red/purple) */
  statusKind?: "chat" | "snap-noaudio" | "snap-audio";
  /** each message can carry one emoji reaction chip (Snapchat, May 2024) */
  messages: Array<ChatMessage & { reaction?: string }>;
}

export interface TikTokComment {
  user: string;
  text: string;
  time: string;
  likes: number;
  creatorLiked?: boolean;
  /** uploaded photo asset id for this commenter */
  avatar?: string;
}

export interface TikTokDoc {
  app: "tiktok";
  chrome: ScreenChrome;
  /** header total, free text ("1.2K") */
  count: string;
  comments: TikTokComment[];
}

export type AiModel = "chatgpt" | "claude" | "gemini" | "grok" | "perplexity";

/** Claude/agent-style inline blocks under an assistant message. */
export type AiCard =
  | { kind: "tool"; tool: "drive" | "search" | "web" | "code"; label: string }
  | { kind: "research"; title: string; status: string } // "Research complete · 300 sources · 3m 36s"
  | { kind: "artifact"; title: string; subtitle: string }; // "Document"

export interface AiMessage extends ChatMessage {
  /** tool/research/artifact cards rendered after this message's text */
  cards?: AiCard[];
}

export interface AiChatDoc {
  app: "ai";
  chrome: ScreenChrome;
  model: AiModel;
  /** shown in the header, e.g. "ChatGPT" / "GPT-4o" */
  title?: string;
  /** assistant messages support light markdown: **bold**, `code`,
   *  ```fenced``` blocks, and "- " bullet lines */
  messages: AiMessage[];
}

export interface EmailDoc {
  app: "email";
  chrome: ScreenChrome;
  provider: "gmail" | "outlook" | "apple";
  sender: string;
  email: string;
  subject: string;
  time: string;
  /** blank line separates paragraphs */
  body: string;
  starred?: boolean;
  avatar?: string;
}

export interface DiscordMessage {
  sender: string;
  text: string;
  time: string;
  /** username color; defaults per-sender if omitted */
  color?: string;
  /** uploaded image asset id */
  image?: string;
  /** uploaded photo asset id for this sender's avatar */
  avatar?: string;
}

export interface DiscordDoc {
  app: "discord";
  chrome: ScreenChrome;
  /** "channel" (# view) or "dm" (1-on-1 with the profile intro block) */
  mode?: "channel" | "dm";
  channel: string;
  server: string;
  /** DM-only: the person you're chatting with */
  dmName?: string;
  dmUsername?: string;
  mutualServer?: string;
  messages: DiscordMessage[];
}

export type SocialNetwork = "facebook" | "linkedin" | "threads";

export interface SocialPostDoc {
  app: "social";
  chrome: ScreenChrome;
  network: SocialNetwork;
  name: string;
  /** LinkedIn headline / Threads @handle / Facebook: blank */
  subtitle: string;
  verified?: boolean;
  text: string;
  time: string;
  likes: number;
  comments: number;
  shares: number;
  avatar?: string;
  commentList?: PostComment[];
}

export interface SlackMessage {
  sender: string;
  text: string;
  time: string;
  color?: string;
  /** emoji reaction pills, e.g. ["🔥 3", "✅ 1"] */
  reactions?: string[];
  /** uploaded photo asset id for this sender's avatar */
  avatar?: string;
}

export interface SlackDoc {
  app: "slack";
  chrome: ScreenChrome;
  workspace: string;
  channel: string;
  messages: SlackMessage[];
}

export interface SignalDoc {
  app: "signal";
  chrome: ScreenChrome;
  avatar?: string;
  contact: string;
  presence: string;
  messages: Array<ChatMessage & { ticks?: WhatsAppTicks }>;
}

export interface RedditComment {
  user: string;
  text: string;
  time: string;
  votes: number;
  /** nesting depth (0 = top level) */
  depth?: number;
  op?: boolean;
  /** uploaded photo asset id for this commenter */
  avatar?: string;
}

export interface RedditDoc {
  app: "reddit";
  chrome: ScreenChrome;
  subreddit: string;
  title: string;
  body?: string;
  author: string;
  time: string;
  votes: number;
  commentCount: string;
  comments: RedditComment[];
}

export interface LineDoc {
  app: "line";
  chrome: ScreenChrome;
  avatar?: string;
  contact: string;
  /** header subline: "online", free text, or "" */
  presence?: string;
  /** LINE shows a small "Read" caption on delivered-and-read outgoing bubbles */
  messages: Array<ChatMessage & { read?: boolean }>;
}

export type DatingBrand = "tinder" | "bumble";

/** Tinder / Bumble discovery card — one renderer, per-brand chrome (like the
 *  social generators). Full-bleed profile photo, gradient overlay with the
 *  bio, and the swipe-action button row. */
export interface DatingDoc {
  app: "dating";
  chrome: ScreenChrome;
  brand: DatingBrand;
  /** uploaded profile photo asset id (full-bleed card image) */
  avatar?: string;
  name: string;
  age: number;
  verified?: boolean;
  /** "Product Designer at MockFrame" */
  job?: string;
  /** "2 miles away" / "5 km away" */
  distance?: string;
  bio?: string;
  interests?: string[];
}

export interface YouTubeComment {
  /** @handle (YouTube shows handles, not display names, since 2023) */
  handle: string;
  time: string; // "2 days ago"
  text: string;
  likes: number;
  /** uploaded photo asset id for this commenter */
  avatar?: string;
  /** "📌 Pinned by {channel}" label */
  pinned?: boolean;
  /** creator-hearted (red heart badge on the avatar) */
  hearted?: boolean;
  verified?: boolean;
  /** "View N replies" toggle */
  replyCount?: number;
}

export interface YouTubeDoc {
  app: "youtube";
  chrome: ScreenChrome;
  /** channel avatar photo (uploaded) */
  avatar?: string;
  /** video thumbnail / frame shown in the 16:9 player (uploaded) */
  thumbnail?: string;
  title: string;
  views: string; // compact "1.2M" → "1.2M views"
  age: string; // "3 days ago"
  channel: string;
  subscribers: string; // "182K"
  verified?: boolean;
  subscribed?: boolean;
  progress: number; // 0..1 red scrubber fill
  likes: string; // count on the Like half of the segmented chip
  commentCount: string; // header total, e.g. "1,204"
  comments: YouTubeComment[];
}

export type TeamsPresence = "available" | "busy" | "dnd" | "away" | "offline";

export interface TeamsDoc {
  app: "teams";
  chrome: ScreenChrome;
  avatar?: string;
  contact: string;
  presence: TeamsPresence;
  /** status line under the name, e.g. "Available" */
  status: string;
  /** eye "Seen" receipt under the last outgoing message */
  seen?: boolean;
  messages: Array<ChatMessage & { reaction?: string }>;
}

export type HingeVitalIcon =
  | "age"
  | "height"
  | "location"
  | "job"
  | "school"
  | "pronouns"
  | "religion"
  | "drinking";

export interface HingeVital {
  icon: HingeVitalIcon;
  text: string;
}

/** Hinge profile is an ordered sequence of photo + prompt cards. */
export type HingeCard =
  | { type: "photo"; image?: string }
  | { type: "prompt"; label: string; answer: string };

export interface HingeDoc {
  app: "hinge";
  chrome: ScreenChrome;
  name: string;
  age: number;
  verified?: boolean;
  vitals: HingeVital[];
  /** ordered photo/prompt sequence; the first photo is the lead card */
  cards: HingeCard[];
  /** card indices shown as liked (filled heart) */
  liked?: number[];
}

export type StorySticker = {
  type: "location" | "mention" | "poll" | "question" | "music";
  text: string;
  secondaryText?: string;
};

export interface StoryDoc {
  app: "story";
  chrome: ScreenChrome;
  /** author avatar (uploaded photo or gradient initials) */
  avatar?: string;
  /** full-bleed story media (uploaded); falls back to a gradient */
  background?: string;
  username: string;
  timeAgo: string; // "5h"
  storyCount: number;
  activeIndex: number;
  activeProgress: number; // 0..1 fill of the active segment
  caption?: string;
  sticker?: StorySticker;
  replyPlaceholder?: string;
}

/** GitHub mobile profile with the contribution heatmap. */
export interface GithubDoc {
  app: "github";
  chrome: ScreenChrome;
  avatar?: string;
  name: string;
  login: string;
  bio?: string;
  /** "1,247 contributions in the last year" */
  contributions: string;
  year: string; // "2025"
  /** 0..1 — how filled the graph is */
  density: number;
  /** deterministic pattern seed (Shuffle to change) */
  seed: number;
  followers?: string;
  following?: string;
  /** hand-painted cell levels (0-4), column-major 53×7 = 371 — overrides seed/density when set */
  cells?: number[];
  /** render just the contribution-graph card (no phone chrome) for a standalone export */
  standalone?: boolean;
}

/** Stripe-dashboard style revenue chart. */
export interface StripeDoc {
  app: "stripe";
  chrome: ScreenChrome;
  metric: string; // "Gross volume"
  amount: string; // "$24,392.81"
  delta: string; // "12.4%"
  deltaUp?: boolean;
  range: string; // "Last 7 days"
  /** chart series (any length; normalized to the plot) */
  series: number[];
  /** optional dashed comparison line (previous period) */
  prevSeries?: number[];
  /** accent color, default Stripe indigo #635bff */
  color?: string;
  /** render just the chart card (no phone chrome) for a standalone export */
  standalone?: boolean;
}

export type ScreenDoc =
  | IMessageDoc
  | WhatsAppDoc
  | WhatsAppGroupDoc
  | InstagramDoc
  | MessengerDoc
  | TelegramDoc
  | SnapchatDoc
  | TikTokDoc
  | AiChatDoc
  | EmailDoc
  | DiscordDoc
  | SlackDoc
  | SignalDoc
  | RedditDoc
  | LineDoc
  | DatingDoc
  | YouTubeDoc
  | TeamsDoc
  | HingeDoc
  | StoryDoc
  | GithubDoc
  | StripeDoc
  | SocialPostDoc
  | XPostDoc
  | BlueskyDoc
  | CodeDoc;
export type ScreenApp = ScreenDoc["app"];

export const SCREEN_APP_LABELS: Record<ScreenApp, string> = {
  imessage: "iMessage",
  whatsapp: "WhatsApp",
  "whatsapp-group": "WA Group",
  instagram: "Instagram",
  messenger: "Messenger",
  telegram: "Telegram",
  snapchat: "Snapchat",
  tiktok: "TikTok",
  ai: "AI Chat",
  email: "Email",
  discord: "Discord",
  slack: "Slack",
  signal: "Signal",
  reddit: "Reddit",
  line: "LINE",
  dating: "Dating",
  youtube: "YouTube",
  teams: "Teams",
  hinge: "Hinge",
  story: "IG Story",
  github: "GitHub",
  stripe: "Stripe",
  social: "Social Post",
  xpost: "X Post",
  bluesky: "Bluesky",
  code: "Code",
};

export const SOCIAL_LABELS: Record<SocialNetwork, string> = {
  facebook: "Facebook",
  linkedin: "LinkedIn",
  threads: "Threads",
};

export const DATING_LABELS: Record<DatingBrand, string> = {
  tinder: "Tinder",
  bumble: "Bumble",
};

/** Starter Discord DM (profile-intro view) for the picker's second entry. */
export function defaultDiscordDm(): DiscordDoc {
  return {
    app: "discord",
    chrome: { time: "9:41", battery: 100, dark: false }, // Discord DMs shown in light mode here
    mode: "dm",
    channel: "unicorn",
    server: "",
    dmName: "Alex",
    dmUsername: "unicornalex",
    mutualServer: "Design Buddies",
    messages: [
      { sender: "Sam", text: "hey! welcome to the server 🎉", time: "8:41 PM", color: "#f47fff" },
      { sender: "Sam", text: "ping me if you need anything", time: "8:41 PM", color: "#f47fff" },
    ],
  };
}

/** Starter dating card per brand (used by the picker's Tinder/Bumble entries). */
export function defaultDatingDoc(brand: DatingBrand): DatingDoc {
  const chrome: ScreenChrome = { time: "9:41", battery: 100 };
  if (brand === "bumble")
    return {
      app: "dating",
      chrome,
      brand,
      name: "Bella",
      age: 26,
      verified: true,
      job: "Illustrator",
      distance: "3 km away",
      bio: "Make the first move 🐝 Matcha addict, weekend hiker, and full-time dog mom.",
      interests: ["Art", "Hiking", "Coffee", "Dogs"],
    };
  return {
    app: "dating",
    chrome,
    brand,
    name: "Alex",
    age: 27,
    verified: true,
    job: "Product Designer",
    distance: "2 miles away",
    bio: "Designer by day, rock climber by weekend. Looking for someone to split tacos and adventures with 🌮",
    interests: ["Climbing", "Design", "Travel", "Tacos"],
  };
}

/** Starter Social Post per network (used by the picker's three entries). */
export function defaultSocialDoc(network: SocialNetwork): SocialPostDoc {
  const chrome: ScreenChrome = { time: "9:41", battery: 100 };
  const base = {
    app: "social" as const,
    chrome,
    network,
    verified: true,
    time: "2h",
    text: "We just shipped Screen Studio — compose pixel-perfect app screenshots (and now video replays) right inside MockFrame. No design tools, no screen recording. 🚀",
    likes: 1024,
    comments: 88,
    shares: 24,
    commentList: [
      { user: "Priya Sharma", text: "Love this! Been waiting for a tool like this.", time: "1h", likes: 12 },
      { user: "Devon Lee", text: "How does the video export actually work?", time: "45m", likes: 3 },
    ] as PostComment[],
  };
  if (network === "linkedin")
    return { ...base, name: "Riley Morgan", subtitle: "Founder & Designer at MockFrame", likes: 542, comments: 47, shares: 12 };
  if (network === "threads")
    return { ...base, name: "mockframe", subtitle: "@mockframe" };
  return { ...base, name: "MockFrame", subtitle: "" }; // facebook
}

/** Which platforms each app actually exists on — the picker filters by the
 *  mockup device's platform, so iMessage never shows on an Android phone. */
export const APP_PLATFORMS: Record<ScreenApp, ("ios" | "android")[]> = {
  imessage: ["ios"], // Apple-only — the whole point of the platform filter
  whatsapp: ["ios", "android"],
  "whatsapp-group": ["ios", "android"],
  instagram: ["ios", "android"],
  messenger: ["ios", "android"],
  telegram: ["ios", "android"],
  snapchat: ["ios", "android"],
  tiktok: ["ios", "android"],
  ai: ["ios", "android"],
  email: ["ios", "android"],
  discord: ["ios", "android"],
  slack: ["ios", "android"],
  signal: ["ios", "android"],
  reddit: ["ios", "android"],
  line: ["ios", "android"],
  dating: ["ios", "android"],
  youtube: ["ios", "android"],
  teams: ["ios", "android"],
  hinge: ["ios", "android"],
  story: ["ios", "android"],
  github: ["ios", "android"],
  stripe: ["ios", "android"],
  social: ["ios", "android"],
  xpost: ["ios", "android"],
  bluesky: ["ios", "android"],
  code: ["ios", "android"],
};

/** The platform a screen should render as, given its app + the device. */
export function effectivePlatform(app: ScreenApp, devicePlatform: "ios" | "android"): "ios" | "android" {
  const supported = APP_PLATFORMS[app];
  return supported.includes(devicePlatform) ? devicePlatform : supported[0];
}

export const AI_MODEL_LABELS: Record<AiModel, string> = {
  chatgpt: "ChatGPT",
  claude: "Claude",
  gemini: "Gemini",
  grok: "Grok",
  perplexity: "Perplexity",
};

/** Starter documents — obviously fictional placeholder content (spec §2.7). */
export function defaultScreenDoc(app: ScreenApp): ScreenDoc {
  const chrome: ScreenChrome = { time: "9:41", battery: 100 };
  switch (app) {
    case "imessage":
      return {
        app,
        chrome,
        contact: "Alex Rivera",
        status: "read",
        showHeader: true,
        messages: [
          { from: "them", text: "Did you see the launch? 👀" },
          { from: "me", text: "Just shipped it 🚀" },
          { from: "them", text: "That was FAST. How are the screenshots so clean?" },
          { from: "me", text: "Made them in MockFrame — took two minutes" },
        ],
      };
    case "whatsapp":
      return {
        app,
        chrome,
        contact: "Sam Carter",
        presence: "online",
        messages: [
          { from: "them", text: "Demo day is tomorrow 😅" },
          { from: "me", text: "Relax, the deck is done", ticks: "read" },
          { from: "them", text: "Even the product shots?" },
          { from: "me", text: "Especially the product shots ✨", ticks: "delivered" },
        ],
      };
    case "whatsapp-group":
      return {
        app,
        chrome,
        name: "Weekend Crew 🏔️",
        members: "You, Alex, Priya, Sam",
        messages: [
          { from: "them", sender: "Alex", text: "Cabin is booked for Saturday!" },
          { from: "them", sender: "Priya", text: "I'll bring the board games 🎲" },
          { from: "me", text: "Calling shotgun now 🙌", ticks: "read" },
          { from: "them", sender: "Sam", text: "Leaving at 8 sharp, no excuses" },
        ],
      };
    case "instagram":
      return {
        app,
        chrome,
        username: "riley.makes",
        presence: "Active now",
        seen: true,
        messages: [
          { from: "them", text: "Your new reel is everywhere 😭" },
          { from: "me", text: "It hit 100k overnight??", reaction: "❤️" },
          { from: "them", text: "Post the tutorial, people are asking" },
          { from: "me", text: "Editing it right now 🎬" },
        ],
      };
    case "messenger":
      return {
        app,
        chrome,
        contact: "Maya Chen",
        presence: "Active now",
        messages: [
          { from: "them", text: "Movie night still on?" },
          { from: "me", text: "Obviously. I have the snacks 🍿", reaction: "😂" },
          { from: "them", text: "You're forgiven for last week then" },
          { from: "me", text: "I bring popcorn ONE time late…" },
        ],
      };
    case "telegram":
      return {
        app,
        chrome,
        contact: "Dev Updates",
        presence: "last seen recently",
        messages: [
          { from: "them", text: "The beta build is live 🎉" },
          { from: "me", text: "Installing now", ticks: "read" },
          { from: "them", text: "Watch the new onboarding flow, it's smooth" },
          { from: "me", text: "Okay this is actually great 🔥", ticks: "delivered" },
        ],
      };
    case "snapchat":
      return {
        app,
        chrome,
        contact: "Jess 🌙",
        streak: 214,
        status: "Opened",
        statusKind: "chat",
        messages: [
          { from: "them", text: "Did you see the sunset??" },
          { from: "me", text: "Literally driving to the lookout rn", reaction: "😮" },
          { from: "them", text: "Send pics or it didn't happen" },
          { from: "me", text: "Streak stays alive another day 🔥" },
        ],
      };
    case "tiktok":
      return {
        app,
        chrome,
        count: "1.2K",
        comments: [
          { user: "caseycooks", text: "The way I ran to my kitchen after this 😭", time: "2h", likes: 4211, creatorLiked: true },
          { user: "mika.moves", text: "tutorial when??", time: "1h", likes: 892 },
          { user: "arjun_builds", text: "This is the third time this is on my fyp and I'm not mad", time: "45m", likes: 307 },
        ],
      };
    case "ai":
      return {
        app,
        chrome: { ...chrome, dark: false },
        model: "claude",
        messages: [
          { from: "me", text: "Help me plan a move to France and research the visa requirements." },
          {
            from: "them",
            text: "I'll help coordinate your move to France. First, let me check your Drive for itineraries and travel documents.",
            cards: [{ kind: "tool", tool: "drive", label: "Searched Google Drive" }],
          },
          {
            from: "them",
            text: "Next, I'll do a deep dive into French visa requirements and work permits.",
            cards: [
              { kind: "research", title: "French work visa research", status: "Research complete · 300 sources · 3m 36s" },
              { kind: "artifact", title: "Working in France: Comprehensive Visa Guide for 2025", subtitle: "Document" },
            ],
          },
        ],
      };
    case "email":
      return {
        app,
        chrome,
        provider: "gmail",
        sender: "Riley Morgan",
        email: "riley@mockframe.app",
        subject: "Your launch is live 🎉",
        time: "9:41 AM",
        starred: true,
        body: "Hey — just saw MockFrame go live on Product Hunt.\n\nThe Screen Studio demo is doing numbers. People keep asking how the mockups look so clean. Told them the secret is that you compose the screenshot AND the scene in one place.\n\nLet's grab time this week to plan the next drop.\n\nRiley",
      };
    case "discord":
      return {
        app,
        chrome: { ...chrome, dark: true },
        server: "MockFrame HQ",
        channel: "launch-day",
        messages: [
          { sender: "priya", text: "the new mockups are unreal 🔥", time: "9:38 AM", color: "#f47fff" },
          { sender: "devon", text: "shipped the AI chat generator just now", time: "9:40 AM", color: "#5865f2" },
          { sender: "priya", text: "wait it does ChatGPT AND Claude??", time: "9:41 AM", color: "#f47fff" },
          { sender: "devon", text: "and Gemini, Grok, Perplexity. all themed.", time: "9:41 AM", color: "#5865f2" },
        ],
      };
    case "slack":
      return {
        app,
        chrome,
        workspace: "MockFrame",
        channel: "launch",
        messages: [
          { sender: "Priya", text: "the new video export is 🔥", time: "9:38 AM", color: "#e01e5a", reactions: ["🔥 4", "🚀 2"] },
          { sender: "Devon", text: "just shipped Slack + Reddit generators too", time: "9:40 AM", color: "#2eb67d" },
          { sender: "Priya", text: "we're basically at Mockly parity now", time: "9:41 AM", color: "#e01e5a" },
        ],
      };
    case "signal":
      return {
        app,
        chrome,
        contact: "Sam Carter",
        presence: "",
        messages: [
          { from: "them", text: "did the disappearing-messages thing work?" },
          { from: "me", text: "yep, 8-hour timer set", ticks: "read" },
          { from: "them", text: "perfect, Signal is unreal for this" },
          { from: "me", text: "privacy > everything 🔒", ticks: "delivered" },
        ],
      };
    case "reddit":
      return {
        app,
        chrome,
        subreddit: "webdev",
        title: "I built a mockup studio that composes fake app screenshots AND animates them into videos",
        body: "No design tools, no screen recording — you compose the screenshot itself (iMessage, WhatsApp, Slack…) and export a chat-replay video. AMA.",
        author: "mockframe_dev",
        time: "5h",
        votes: 2400,
        commentCount: "312",
        comments: [
          { user: "code_wizard", text: "This is genuinely impressive. The typing animation is a nice touch.", time: "3h", votes: 184, op: false },
          { user: "mockframe_dev", text: "Thanks! The typing beat was the hardest part to get smooth.", time: "2h", votes: 96, depth: 1, op: true },
          { user: "designer_dana", text: "Does it do Reddit threads too? 👀", time: "1h", votes: 42 },
        ],
      };
    case "line":
      return {
        app,
        chrome,
        contact: "Yuki 🌸",
        presence: "",
        messages: [
          { from: "them", text: "did you see the new sticker set? 😆" },
          { from: "me", text: "already bought the whole thing lol", read: true },
          { from: "them", text: "of course you did 🐻" },
          { from: "me", text: "worth every coin ✨", read: false },
        ],
      };
    case "dating":
      return defaultDatingDoc("tinder");
    case "youtube":
      return {
        app,
        chrome,
        title: "I built a fake-screenshot studio that turns app mockups into videos",
        views: "248K",
        age: "3 days ago",
        channel: "MockFrame",
        subscribers: "182K",
        verified: true,
        subscribed: false,
        progress: 0.34,
        likes: "24K",
        commentCount: "1,204",
        comments: [
          { handle: "@designdev", time: "2 days ago", text: "The fact that it can fake a YouTube comment section is so meta 😂 instant subscribe.", likes: 842, pinned: true, hearted: true },
          { handle: "@maya.builds", time: "1 day ago", text: "wait it does the comments too?? this is unreal", likes: 210, replyCount: 4 },
          { handle: "@mockframe", time: "1 day ago", text: "Yep — every comment on this video was composed inside the editor.", likes: 96, verified: true },
        ],
      };
    case "teams":
      return {
        app,
        chrome,
        contact: "Priya Nair",
        presence: "available",
        status: "Available",
        seen: true,
        messages: [
          { from: "them", text: "Did the new build ship? 🚀" },
          { from: "me", text: "Yep, just merged it", reaction: "👍" },
          { from: "them", text: "Amazing. Standup in 5?" },
          { from: "me", text: "On my way 🏃" },
        ],
      };
    case "hinge":
      return {
        app,
        chrome,
        name: "Jordan",
        age: 24,
        verified: true,
        vitals: [
          { icon: "height", text: "5'9\"" },
          { icon: "location", text: "Brooklyn, NY" },
          { icon: "job", text: "Product Designer" },
          { icon: "school", text: "NYU" },
        ],
        cards: [
          { type: "photo" },
          { type: "prompt", label: "The way to win me over is", answer: "Bring me to the best taco spot you know and let the great debate begin." },
          { type: "photo" },
        ],
        liked: [],
      };
    case "story":
      return {
        app,
        chrome,
        username: "mockframe",
        timeAgo: "5h",
        storyCount: 4,
        activeIndex: 1,
        activeProgress: 0.6,
        caption: "shipping day 🚀",
        replyPlaceholder: "Send message",
      };
    case "github":
      return {
        app,
        chrome,
        name: "Riley Morgan",
        login: "rileymorgan",
        bio: "Design engineer. Building MockFrame — the screenshot mockup studio.",
        contributions: "1,247",
        year: "2025",
        density: 0.55,
        seed: 7,
        followers: "1.2k",
        following: "180",
      };
    case "stripe":
      return {
        app,
        chrome,
        metric: "Gross volume",
        amount: "$24,392.81",
        delta: "12.4%",
        deltaUp: true,
        range: "Last 7 days",
        series: [8, 9, 7, 10, 12, 11, 14, 13, 16, 15, 18, 20, 19, 22, 21, 24, 26, 25, 28, 31, 29, 34, 36, 35, 39, 41, 44, 47],
        prevSeries: [7, 8, 7, 8, 9, 9, 10, 10, 11, 12, 12, 13, 13, 14, 14, 15, 16, 16, 17, 18, 18, 19, 20, 21, 22, 22, 23, 24],
        color: "#635bff",
      };
    case "social":
      return defaultSocialDoc("facebook");
    case "xpost":
      return {
        app,
        chrome,
        theme: "light",
        name: "MockFrame",
        handle: "mockframe",
        badge: "blue",
        text: "We just shipped Screen Studio — compose pixel-perfect app screenshots right inside the editor 🚀 #buildinpublic",
        date: "Jul 10, 2026",
        views: "48.2K",
        replies: 42,
        reposts: 128,
        likes: 1024,
        comments: [
          { user: "Priya Sharma", handle: "priyabuilds", text: "This is exactly what I needed. Shipping mine tonight 🚀", time: "1h", likes: 42, verified: true },
          { user: "Devon", handle: "devondesigns", text: "the video export is wild", time: "45m", likes: 18 },
        ],
      };
    case "bluesky":
      return {
        app,
        chrome: { ...chrome, dark: true },
        name: "Bluesky",
        handle: "bsky.app",
        text: "We could go on about how we welcome publishers, we don't demote links, we encourage independent developers to build apps and extensions on top of Bluesky's network.… but instead, we'll show you.\n\nAll thanks to the incredible community here! 🦋",
        time: "November 30th, 2024 at 4:00 AM",
        replies: 1400,
        reposts: 8800,
        likes: 75700,
        link: {
          title: "The Engagement Is Better on Bluesky - Bluesky",
          desc: "Bluesky is the lobby to the open web. Find and build your community here.",
          domain: "bsky.social",
        },
      };
    case "code":
      return {
        app,
        chrome,
        code: 'function greet(name) {\n  const msg = `Hello, ${name}!`;\n  // ship it 🚀\n  return console.log(msg);\n}\n\ngreet("MockFrame");',
        language: "tsx",
        theme: "github-dark",
        codeFont: "jetbrains",
        frame: "macos",
        filename: "index.tsx",
        lineNumbers: true,
        fontSize: 13,
        standalone: true,
      };
  }
}

/** Template (card) variants of Bluesky / X — window-framed standalone cards. */
export function defaultTemplateDoc(app: "bluesky" | "xpost" | "code"): ScreenDoc {
  if (app === "code") return defaultScreenDoc("code");
  const base = defaultScreenDoc(app) as BlueskyDoc | XPostDoc;
  return { ...base, standalone: true, frame: "none" };
}
