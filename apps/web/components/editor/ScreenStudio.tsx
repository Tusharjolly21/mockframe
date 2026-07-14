"use client";

import {
  SiBluesky,
  SiDiscord,
  SiFacebook,
  SiGmail,
  SiGithub,
  SiImessage,
  SiInstagram,
  SiLine,
  SiMessenger,
  SiReddit,
  SiSignal,
  SiStripe,
  SiTinder,
  SiSnapchat,
  SiTelegram,
  SiThreads,
  SiTiktok,
  SiWhatsapp,
  SiX,
  SiYoutube,
} from "@icons-pack/react-simple-icons";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDown, ArrowUp, CalendarDays, Code2, FileText, Heart, ImageIcon, ImagePlus, LayoutGrid, Link2, Linkedin, MessagesSquare, Mic, Paperclip, Phone, Search, Shuffle, Slack, SmilePlus, Sparkles, Trash2, X } from "lucide-react";
import type { MockupLayer } from "@framekit/scene";
import { getDevice } from "@framekit/devices";
import { ingestFile, resolveAsset } from "@/lib/assets";
import {
  AI_MODEL_LABELS,
  APP_PLATFORMS,
  decodeScreenAsset,
  defaultDatingDoc,
  defaultDiscordDm,
  defaultScreenDoc,
  effectivePlatform,
  encodeScreenAsset,
  isScreenAsset,
  defaultSocialDoc,
  DATING_LABELS,
  SCREEN_APP_LABELS,
  SOCIAL_LABELS,
  type AiCard,
  type AiChatDoc,
  type AiMessage,
  type AiModel,
  type ChatCall,
  type ChatFile,
  type ChatLink,
  type DatingDoc,
  type DiscordDoc,
  type GithubDoc,
  type HingeCard,
  type HingeDoc,
  type HingeVital,
  type LineDoc,
  type StripeDoc,
  type SnapStatus,
  type StoryDoc,
  type TeamsDoc,
  type TeamsPresence,
  type YouTubeComment,
  type YouTubeDoc,
  type EmailDoc,
  type SocialNetwork,
  type SocialPostDoc,
  type IMessageDoc,
  type InstagramDoc,
  type MessengerDoc,
  type PostComment,
  type RedditDoc,
  type ScreenApp,
  type ScreenDoc,
  type SignalDoc,
  type SlackDoc,
  type SnapchatDoc,
  type TelegramDoc,
  type TikTokDoc,
  type WhatsAppDoc,
  type WhatsAppGroupDoc,
  defaultTemplateDoc,
  type WhatsAppTicks,
  type XPostDoc,
  type BlueskyDoc,
  type CodeDoc,
  type FrameStyle,
} from "@/lib/screens";
import { WALLPAPERS } from "@/lib/screens/wallpapers";
import { githubCells } from "@/lib/screens/github";
import { importBlueskyPost } from "@/lib/blueskyImport";
import { importXPost } from "@/lib/xpostImport";
import { importPostUrl } from "@/lib/postImport";
import { fetchGithubContributions } from "@/lib/githubImport";
import { toast } from "./Toolbar";
import { CODE_THEME_LABELS } from "@/lib/screens/code";
import { FRAME_LABELS, FRAME_STYLES } from "@/lib/screens/frames";
import { CODE_FONT_LABELS } from "@/lib/screens/fonts";
import { useSceneStore, useViewStore } from "@/lib/store";
import { openUpgrade } from "@/lib/billing/gate";
import { Section, Seg, SliderRow } from "./ui";

/**
 * Screen Studio (framekit-screen-studio.md §2.4): compose the screenshot
 * itself. Every control re-encodes the doc into media.assetId, so edits are
 * ordinary scene mutations — undo, drafts and export need no extra plumbing.
 */

/* Categorized catalog — the picker groups + searches these so it stays
   navigable as the roster grows toward Mockly's 50+ generators. Add a new
   generator by dropping one row here (+ its renderer + doc arm). */
type ScreenCat = "Messaging" | "AI Chats" | "Social" | "Dating" | "Dev & Charts" | "Email";
const CAT_ORDER: ScreenCat[] = ["Messaging", "AI Chats", "Social", "Dating", "Dev & Charts", "Email"];

interface AppMeta {
  app: ScreenApp;
  label: string;
  icon: React.ComponentType<{ size?: number; color?: string }>;
  tint: string;
  cat: ScreenCat;
  /** extra search terms */
  kw?: string;
  /** custom starter doc (for the 3 social networks that share app "social") */
  make?: () => ScreenDoc;
}

const APPS: AppMeta[] = [
  { app: "imessage", label: "iMessage", icon: SiImessage, tint: "#34c759", cat: "Messaging", kw: "sms text apple" },
  { app: "whatsapp", label: "WhatsApp", icon: SiWhatsapp, tint: "#25d366", cat: "Messaging" },
  { app: "whatsapp-group", label: "WA Group", icon: SiWhatsapp, tint: "#128c7e", cat: "Messaging", kw: "whatsapp group" },
  { app: "instagram", label: "Instagram", icon: SiInstagram, tint: "#e4405f", cat: "Messaging", kw: "dm insta" },
  { app: "messenger", label: "Messenger", icon: SiMessenger, tint: "#0a7cff", cat: "Messaging", kw: "facebook" },
  { app: "telegram", label: "Telegram", icon: SiTelegram, tint: "#26a5e4", cat: "Messaging" },
  { app: "snapchat", label: "Snapchat", icon: SiSnapchat, tint: "#d4b800", cat: "Messaging", kw: "snap" },
  { app: "discord", label: "Discord", icon: SiDiscord, tint: "#5865f2", cat: "Messaging", kw: "channel server" },
  { app: "discord", label: "Discord DM", icon: SiDiscord, tint: "#404eed", cat: "Messaging", kw: "discord dm direct message", make: () => defaultDiscordDm() },
  { app: "slack", label: "Slack", icon: Slack, tint: "#4a154b", cat: "Messaging", kw: "workspace channel" },
  { app: "signal", label: "Signal", icon: SiSignal, tint: "#3a76f0", cat: "Messaging", kw: "private encrypted" },
  { app: "line", label: "LINE", icon: SiLine, tint: "#06c755", cat: "Messaging", kw: "japan korea sticker green chat" },
  { app: "teams", label: "Teams", icon: MessagesSquare, tint: "#5b5fc7", cat: "Messaging", kw: "microsoft work office channel" },
  { app: "ai", label: "AI Chat", icon: Sparkles, tint: "#7c3aed", cat: "AI Chats", kw: "chatgpt claude gemini grok perplexity gpt" },
  { app: "xpost", label: "X Post", icon: SiX, tint: "#000000", cat: "Social", kw: "twitter tweet" },
  { app: "bluesky", label: "Bluesky", icon: SiBluesky, tint: "#1083fe", cat: "Social", kw: "bsky butterfly post skeet" },
  { app: "social", label: "Facebook", icon: SiFacebook, tint: "#1877f2", cat: "Social", kw: "post feed meta", make: () => defaultSocialDoc("facebook") },
  { app: "social", label: "LinkedIn", icon: Linkedin, tint: "#0a66c2", cat: "Social", kw: "post feed job", make: () => defaultSocialDoc("linkedin") },
  { app: "social", label: "Threads", icon: SiThreads, tint: "#000000", cat: "Social", kw: "post meta insta", make: () => defaultSocialDoc("threads") },
  { app: "tiktok", label: "TikTok", icon: SiTiktok, tint: "#161823", cat: "Social", kw: "comments" },
  { app: "youtube", label: "YouTube", icon: SiYoutube, tint: "#ff0000", cat: "Social", kw: "video watch comments subscribe channel" },
  { app: "reddit", label: "Reddit", icon: SiReddit, tint: "#ff4500", cat: "Social", kw: "thread post comments upvote subreddit" },
  { app: "story", label: "IG Story", icon: SiInstagram, tint: "#e4405f", cat: "Social", kw: "instagram story reel status full screen" },
  { app: "dating", label: "Tinder", icon: SiTinder, tint: "#fe3c72", cat: "Dating", kw: "swipe match profile date", make: () => defaultDatingDoc("tinder") },
  { app: "dating", label: "Bumble", icon: Heart, tint: "#ffb800", cat: "Dating", kw: "swipe match profile date bee", make: () => defaultDatingDoc("bumble") },
  { app: "hinge", label: "Hinge", icon: Heart, tint: "#67295f", cat: "Dating", kw: "swipe match profile date prompt" },
  { app: "github", label: "GitHub", icon: SiGithub, tint: "#1f2328", cat: "Dev & Charts", kw: "contribution graph heatmap commits dev profile" },
  { app: "stripe", label: "Stripe", icon: SiStripe, tint: "#635bff", cat: "Dev & Charts", kw: "chart revenue dashboard mrr graph payments money" },
  { app: "email", label: "Email", icon: SiGmail, tint: "#ea4335", cat: "Email", kw: "gmail outlook apple mail" },
];

/** Standalone-card Templates (window-framed content, no phone) — a separate
 *  section from the phone app roster. */
type StandaloneTemplateApp = "code" | "social" | "github" | "stripe";

const TEMPLATE_TILES: { app: StandaloneTemplateApp; label: string; icon: React.ComponentType<{ size?: number; color?: string }>; tint: string }[] = [
  { app: "social", label: "Post URL", icon: Link2, tint: "#7c3aed" },
  { app: "code", label: "Code", icon: Code2, tint: "#2f81f7" },
  { app: "github", label: "GitHub graph", icon: SiGithub, tint: "#238636" },
  { app: "stripe", label: "Stripe graph", icon: SiStripe, tint: "#635bff" },
];

/** Apps whose doc carries a contact/profile photo (`avatar`). A runtime
 *  `"avatar" in doc` check fails on fresh docs (JSON never carries an unset
 *  optional key), which hid the DP-upload field entirely — so gate on the app. */
const AVATAR_APPS = new Set<ScreenApp>([
  "imessage",
  "whatsapp",
  "whatsapp-group",
  "instagram",
  "messenger",
  "telegram",
  "snapchat",
  "email",
  "signal",
  "line",
  "dating",
  "youtube",
  "teams",
  "story",
  "github",
  "social",
  "xpost",
  "bluesky",
]);

/** True when the doc is a standalone window-framed Template card (Code always;
 *  Bluesky/X only in their `standalone` mode) — gates the window-frame picker. */
export function isTemplateCard(doc: ScreenDoc): boolean {
  return doc.app === "code" || ((doc.app === "bluesky" || doc.app === "xpost" || doc.app === "social") && !!(doc as { standalone?: boolean }).standalone);
}

/** Any content that is currently exporting on its own, without a device. */
function isStandaloneContent(doc: ScreenDoc): boolean {
  return isTemplateCard(doc) || ((doc.app === "github" || doc.app === "stripe") && !!doc.standalone);
}

/** iOS vs Android from the mockup's device — Apple = iOS, everything else
 *  (Samsung, Pixel, OnePlus, Chrome) = Android. Drives which apps are offered
 *  and how they render (a chat's UI must match the phone it's shown in). */
function devicePlatform(deviceId: string | null): "ios" | "android" {
  if (!deviceId) return "ios";
  const d = getDevice(deviceId);
  return d && d.brand === "apple" ? "ios" : "android";
}

export function ScreenStudio({ layer }: { layer: MockupLayer }) {
  const updateLayer = useSceneStore((s) => s.updateLayer);
  const doc = layer.media && isScreenAsset(layer.media.assetId) ? decodeScreenAsset(layer.media.assetId) : undefined;
  const devPlatform = devicePlatform(layer.deviceId);
  const frameless = !layer.deviceId;
  // remember the last real device so toggling the frame back restores it
  const lastDeviceRef = useRef(layer.deviceId || "iphone-16-pro");
  if (layer.deviceId) lastDeviceRef.current = layer.deviceId;

  // toggle the phone frame on/off; for charts this also flips the standalone
  // (card) render, atomically with the deviceId so there's no flash
  const setFrameless = (on: boolean) =>
    updateLayer(layer.id, (l) => {
      if (l.type !== "mockup") return l;
      let media = l.media;
      if (media && isScreenAsset(media.assetId)) {
        const d = decodeScreenAsset(media.assetId);
        if (d && (d.app === "github" || d.app === "stripe" || d.app === "code" || d.app === "bluesky" || d.app === "xpost" || d.app === "social")) {
          media = { ...media, assetId: encodeScreenAsset({ ...d, standalone: on }) };
        }
      }
      return { ...l, deviceId: on ? null : lastDeviceRef.current, media };
    });

  // Load a standalone Template card in ONE atomic update:
  // the frameless deviceId + the standalone doc land together, so it can never
  // flash the phone version.
  const setTemplate = (app: StandaloneTemplateApp) =>
    updateLayer(layer.id, (l) => {
      if (l.type !== "mockup") return l;
      const d = defaultTemplateDoc(app);
      return {
        ...l,
        deviceId: null,
        media: {
          assetId: encodeScreenAsset({ ...d, chrome: { ...d.chrome, platform: effectivePlatform(d.app, devPlatform) } }),
          kind: "image" as const,
          fit: "cover" as const,
          offsetX: 0,
          offsetY: 0,
          scale: 1,
        },
      };
    });

  // every setDoc stamps the platform the device dictates (per-app: iMessage
  // stays iOS even on an Android frame — it just isn't offered there)
  const setDoc = (next: ScreenDoc) =>
    updateLayer(layer.id, (l) => ({
      ...l,
      media: {
        assetId: encodeScreenAsset({
          ...next,
          chrome: { ...next.chrome, platform: effectivePlatform(next.app, devPlatform) },
        }),
        kind: "image" as const,
        fit: "cover" as const,
        offsetX: 0,
        offsetY: 0,
        scale: 1,
      },
    }));

  // keep the screen's platform in sync when the device is swapped
  useEffect(() => {
    const m = layer.media;
    if (!m || !isScreenAsset(m.assetId)) return;
    const d = decodeScreenAsset(m.assetId);
    if (!d) return;
    const want = effectivePlatform(d.app, devPlatform);
    if ((d.chrome.platform ?? "ios") !== want) {
      updateLayer(layer.id, (l) =>
        l.type === "mockup" && l.media
          ? { ...l, media: { ...l.media, assetId: encodeScreenAsset({ ...d, chrome: { ...d.chrome, platform: want } }) } }
          : l
      );
    }
  }, [devPlatform, layer.id, layer.media, updateLayer]);

  if (!doc) {
    return (
      <Section title="Generate a screen">
        {/* Templates — standalone content CARDS wrapped in a window frame (no phone) */}
        <div className="mb-1.5 flex items-baseline justify-between">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9a9aa4]">Templates</p>
          <span className="text-[9.5px] text-[#b0b0ba]">A ready-made card — no device</span>
        </div>
        <p className="mb-2 text-[10.5px] leading-snug text-[#858590]">Paste a post URL or code and export it as a standalone card. It doesn&apos;t go inside a phone.</p>
        <div className="mb-4 grid grid-cols-2 gap-2">
          {TEMPLATE_TILES.map((t) => (
            <button
              key={t.app}
              onClick={() => setTemplate(t.app)}
              className="fk-tile flex flex-col items-center gap-1.5 rounded-2xl border border-[#e8e8ef] bg-white py-3"
            >
              <t.icon size={20} color={t.tint} />
              <span className="text-[10.5px] font-semibold text-[#17171c]">{t.label}</span>
            </button>
          ))}
        </div>
        <div className="mb-1.5 flex items-baseline justify-between border-t border-[#eeeef3] pt-3">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[#9a9aa4]">App screenshots</p>
          <span className="text-[9.5px] text-[#b0b0ba]">Fake app UI · goes in your device</span>
        </div>
        <p className="mb-2 text-[10.5px] leading-snug text-[#858590]">Build a chat, feed, or app screen that sits inside the phone or tablet frame you picked.</p>
        <FeaturedPicker
          platform={devPlatform}
          onPick={(meta) => {
            const d = meta.make ? meta.make() : defaultScreenDoc(meta.app);
            setDoc(d);
          }}
        />
      </Section>
    );
  }

  const removeBtn = (
    <button
      title="Remove screen"
      onClick={() => updateLayer(layer.id, (l) => ({ ...l, media: null }))}
      className="fk-press grid h-6 w-6 place-items-center rounded-md text-[#9a9aa4] hover:bg-black/6 hover:text-[#17171c]"
    >
      <Trash2 size={12} />
    </button>
  );

  return (
    <Section
      title={`Screen Studio · ${
        doc.app === "social"
          ? SOCIAL_LABELS[doc.network]
          : doc.app === "dating"
            ? DATING_LABELS[doc.brand]
            : doc.app === "discord" && doc.mode === "dm"
              ? "Discord DM"
              : (APPS.find((a) => a.app === doc.app)?.label ?? SCREEN_APP_LABELS[doc.app])
      }`}
      action={removeBtn}
    >
      {/* shared status-bar chrome */}
      <div className="mb-3 flex gap-2">
        <Field label="Time" value={doc.chrome.time} onChange={(time) => setDoc({ ...doc, chrome: { ...doc.chrome, time } })} className="w-20" />
        <div className="flex-1">
          <SliderRow
            label="Battery"
            value={doc.chrome.battery}
            min={1}
            max={100}
            format={(v) => `${Math.round(v)}%`}
            onChange={(battery) => setDoc({ ...doc, chrome: { ...doc.chrome, battery } })}
          />
        </div>
      </div>
      {/* platform is driven by the device the mockup sits in — n/a for the code card
          or any standalone Template card (there's no device behind a card) */}
      {doc.app !== "code" && !isStandaloneContent(doc) && (
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-[#f4f4f8] px-2.5 py-1.5 text-[11px] text-[#6b6b76]">
          <span className="grid h-4 w-4 place-items-center rounded bg-[#17171c] text-[8px] font-bold text-white">
            {devPlatform === "ios" ? "" : "▲"}
          </span>
          {devPlatform === "ios" ? "iPhone UI" : "Android UI"} · matches your device
        </div>
      )}
      {doc.app !== "xpost" && doc.app !== "code" && (
        <Seg
          id="scr-theme"
          options={[
            { value: "light", label: "Light" },
            { value: "dark", label: "Dark" },
          ]}
          value={doc.chrome.dark ? "dark" : "light"}
          onChange={(v) => setDoc({ ...doc, chrome: { ...doc.chrome, dark: v === "dark" } })}
        />
      )}

      {/* device frame on/off — "None" exports just the screen/card, no phone.
          The code template is always a card, so it skips this toggle. */}
      {doc.app !== "code" && (
        <div className="mt-3">
          <span className="mb-1 block text-xs text-[#6b6b76]">Frame</span>
          <Seg
            id="scr-frame"
            options={[
              { value: "device", label: "Phone" },
              { value: "none", label: doc.app === "bluesky" || doc.app === "xpost" || doc.app === "social" || doc.app === "github" || doc.app === "stripe" ? "Card" : "No frame" },
            ]}
            value={frameless ? "none" : "device"}
            onChange={(v) => setFrameless(v === "none")}
          />
          {frameless && (
            <p className="mt-1.5 text-[10px] leading-relaxed text-[#b0b0ba]">
              Standalone — exports just the {doc.app === "github" || doc.app === "stripe" ? "chart card" : "content card"}, no phone. Set the canvas background to Transparent for a clean cut-out.
            </p>
          )}
        </div>
      )}

      {/* window frame for the standalone Template cards (Code / Bluesky / X) */}
      {isTemplateCard(doc) && (
        <FrameField value={(doc as { frame?: FrameStyle }).frame ?? "none"} onChange={(frame) => setDoc({ ...doc, frame } as ScreenDoc)} />
      )}

      {AVATAR_APPS.has(doc.app) && (
        <AvatarField
          label={
            doc.app === "dating"
              ? "Profile photo"
              : doc.app === "youtube"
                ? "Channel avatar"
                : doc.app === "story"
                  ? "Your avatar"
                  : doc.app === "github"
                    ? "Profile photo"
                    : doc.app === "social" || doc.app === "xpost" || doc.app === "bluesky"
                      ? "Author photo"
                      : "Their photo (DP)"
          }
          value={(doc as { avatar?: string }).avatar}
          onChange={(avatar) => setDoc({ ...doc, avatar } as ScreenDoc)}
        />
      )}

      {doc.app === "imessage" && <IMessageFields doc={doc} setDoc={setDoc} />}
      {doc.app === "whatsapp" && <WhatsAppFields doc={doc} setDoc={setDoc} />}
      {doc.app === "whatsapp-group" && <WhatsAppGroupFields doc={doc} setDoc={setDoc} />}
      {doc.app === "instagram" && <InstagramFields doc={doc} setDoc={setDoc} />}
      {doc.app === "messenger" && <MessengerFields doc={doc} setDoc={setDoc} />}
      {doc.app === "telegram" && <TelegramFields doc={doc} setDoc={setDoc} />}
      {doc.app === "snapchat" && <SnapchatFields doc={doc} setDoc={setDoc} />}
      {doc.app === "tiktok" && <TikTokFields doc={doc} setDoc={setDoc} />}
      {doc.app === "ai" && <AiFields doc={doc} setDoc={setDoc} />}
      {doc.app === "email" && <EmailFields doc={doc} setDoc={setDoc} />}
      {doc.app === "discord" && <DiscordFields doc={doc} setDoc={setDoc} />}
      {doc.app === "slack" && <SlackFields doc={doc} setDoc={setDoc} />}
      {doc.app === "signal" && <SignalFields doc={doc} setDoc={setDoc} />}
      {doc.app === "reddit" && <RedditFields doc={doc} setDoc={setDoc} />}
      {doc.app === "line" && <LineFields doc={doc} setDoc={setDoc} />}
      {doc.app === "dating" && <DatingFields doc={doc} setDoc={setDoc} />}
      {doc.app === "youtube" && <YouTubeFields doc={doc} setDoc={setDoc} />}
      {doc.app === "teams" && <TeamsFields doc={doc} setDoc={setDoc} />}
      {doc.app === "hinge" && <HingeFields doc={doc} setDoc={setDoc} />}
      {doc.app === "story" && <StoryFields doc={doc} setDoc={setDoc} />}
      {doc.app === "github" && <GithubFields doc={doc} setDoc={setDoc} />}
      {doc.app === "stripe" && <StripeFields doc={doc} setDoc={setDoc} />}
      {doc.app === "social" && <SocialFields doc={doc} setDoc={setDoc} />}
      {doc.app === "xpost" && <XPostFields doc={doc} setDoc={setDoc} />}
      {doc.app === "bluesky" && <BlueskyFields doc={doc} setDoc={setDoc} />}
      {doc.app === "code" && <CodeFields doc={doc} setDoc={setDoc} />}
    </Section>
  );
}

/* --------------------------------- picker ------------------------------------ */
/* Categorized + searchable grid. Scales cleanly as generators are added —
   a flat wall of icons doesn't (the reason this was redesigned). */

/** A single app tile (icon + label). */
function AppTile({ meta, onClick }: { meta: AppMeta; onClick: () => void }) {
  const Icon = meta.icon;
  return (
    <button
      onClick={onClick}
      className="fk-tile flex flex-col items-center gap-1.5 rounded-2xl border border-[#e8e8ef] bg-white py-3"
    >
      <Icon size={20} color={meta.tint} />
      <span className="text-[10.5px] font-semibold text-[#17171c]">{meta.label}</span>
    </button>
  );
}

/** The most-reached-for apps shown inline; the rest live behind "More apps". */
const FEATURED_LABELS = ["iMessage", "WhatsApp", "Instagram", "X Post", "Snapchat", "AI Chat", "YouTube", "Tinder"];

/** Compact launcher: a few featured apps + a "More apps" button that opens the
 *  full categorized/searchable catalog in a popup (keeps the sidebar tidy as the
 *  roster grows past two dozen generators). */
function FeaturedPicker({ platform, onPick }: { platform: "ios" | "android"; onPick: (meta: AppMeta) => void }) {
  const [browse, setBrowse] = useState(false);
  const featured = FEATURED_LABELS.map((l) => APPS.find((a) => a.label === l)).filter(
    (a): a is AppMeta => !!a && APP_PLATFORMS[a.app].includes(platform)
  );
  return (
    <div>
      <div className="grid grid-cols-3 gap-2">
        {featured.slice(0, 5).map((meta) => (
          <AppTile key={meta.label} meta={meta} onClick={() => onPick(meta)} />
        ))}
        <button
          onClick={() => setBrowse(true)}
          className="fk-tile flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-[#c9c9d4] bg-[#f7f7fb] py-3 text-[#6b6b76] hover:border-[#17171c] hover:text-[#17171c]"
        >
          <LayoutGrid size={20} />
          <span className="text-[10.5px] font-semibold">More apps</span>
        </button>
      </div>

      {browse && (
        <div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-black/40 p-4 pt-[8vh]"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setBrowse(false);
          }}
        >
          <div className="w-[min(560px,94vw)] overflow-hidden rounded-2xl bg-white p-4 shadow-2xl">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-[#17171c]">Choose an app</h3>
              <button
                onClick={() => setBrowse(false)}
                className="fk-press grid h-7 w-7 place-items-center rounded-lg text-[#9a9aa4] hover:bg-black/6 hover:text-[#17171c]"
              >
                <X size={15} />
              </button>
            </div>
            <ScreenPicker
              platform={platform}
              maxH="62vh"
              autoFocus
              onPick={(m) => {
                onPick(m);
                setBrowse(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ScreenPicker({
  platform,
  onPick,
  maxH = "46vh",
  autoFocus = false,
}: {
  platform: "ios" | "android";
  onPick: (meta: AppMeta) => void;
  maxH?: string;
  autoFocus?: boolean;
}) {
  const [q, setQ] = useState("");
  const query = q.trim().toLowerCase();

  const groups = useMemo(() => {
    const match = (a: AppMeta) =>
      APP_PLATFORMS[a.app].includes(platform) && // only apps that exist on this device's OS
      (!query || a.label.toLowerCase().includes(query) || (a.kw ?? "").includes(query) || a.app.includes(query));
    return CAT_ORDER.map((cat) => ({ cat, items: APPS.filter((a) => a.cat === cat && match(a)) })).filter(
      (g) => g.items.length > 0
    );
  }, [query, platform]);

  return (
    <div>
      <div className="relative mb-3">
        <Search size={13} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[#9a9aa4]" />
        <input
          value={q}
          autoFocus={autoFocus}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search apps…"
          className="w-full rounded-lg border border-[#e4e4ec] bg-white py-2 pl-7 pr-2 text-xs text-[#17171c] outline-none focus:border-[#17171c]"
        />
      </div>
      <div className="panel-scroll -mr-1 overflow-y-auto pr-1" style={{ maxHeight: maxH }}>
        {groups.map(({ cat, items }) => (
          <div key={cat} className="mb-3 last:mb-0">
            <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[#9a9aa4]">{cat}</p>
            <div className="grid grid-cols-3 gap-2">
              {items.map((meta) => (
                <AppTile key={meta.label} meta={meta} onClick={() => onPick(meta)} />
              ))}
            </div>
          </div>
        ))}
        {groups.length === 0 && (
          <p className="py-6 text-center text-[11px] text-[#9a9aa4]">No apps match “{q}”.</p>
        )}
      </div>
    </div>
  );
}

/* --------------------------------- fields ------------------------------------ */

/** Window-frame picker for Template cards — the 8 PostSpark styles. */
function FrameField({ value, onChange }: { value: FrameStyle; onChange: (f: FrameStyle) => void }) {
  return (
    <div className="mt-3">
      <span className="mb-1.5 block text-xs text-[#6b6b76]">Window frame</span>
      <div className="grid grid-cols-4 gap-1.5">
        {FRAME_STYLES.map((f) => (
          <button
            key={f}
            onClick={() => onChange(f)}
            className={`fk-tile rounded-lg border px-1 py-2 text-[10px] font-semibold ${
              value === f ? "border-[#17171c] bg-[#17171c] text-white" : "border-[#e8e8ef] bg-white text-[#6b6b76] hover:border-[#c9c9d4]"
            }`}
          >
            {FRAME_LABELS[f]}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Contact/author photo (DP): uploads into the guest asset registry and is
 *  referenced from the screen doc by id (drafts snapshot it alongside). */
function AvatarField({ value, onChange, label = "Their photo (DP)" }: { value?: string; onChange: (id?: string) => void; label?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const url = value ? resolveAsset(value)?.url : undefined;
  return (
    <div className="mb-3 flex items-center gap-2">
      <span className="flex-1 text-xs text-[#6b6b76]">{label}</span>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-8 w-8 rounded-full border border-[#e4e4ec] object-cover" />
      )}
      <button
        onClick={() => fileRef.current?.click()}
        className="fk-press flex items-center gap-1.5 rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-[11px] font-semibold text-[#17171c] hover:border-[#17171c]"
      >
        <ImagePlus size={12} />
        {url ? "Change" : "Upload"}
      </button>
      {value && (
        <button
          title="Remove photo"
          onClick={() => onChange(undefined)}
          className="fk-press rounded-md p-1 text-[#9a9aa4] hover:bg-black/6 hover:text-[#17171c]"
        >
          <X size={13} />
        </button>
      )}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const a = await ingestFile(f);
          onChange(a.id);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  className,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  className?: string;
  placeholder?: string;
}) {
  return (
    <label className={`mb-0 block ${className ?? ""}`}>
      <span className="mb-1 block text-xs text-[#6b6b76]">{label}</span>
      <input
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-xs font-medium text-[#17171c] outline-none focus:border-[#17171c]"
      />
    </label>
  );
}

/** Chat wallpaper swatches (Default + presets) for WhatsApp / Telegram. */
function WallpaperField({ value, onChange }: { value?: string; onChange: (id?: string) => void }) {
  const swatches = [{ id: undefined as string | undefined, label: "Default", swatch: "#ece5dd" }, ...WALLPAPERS];
  return (
    <div className="mt-3">
      <span className="mb-1.5 block text-xs text-[#6b6b76]">Wallpaper</span>
      <div className="flex flex-wrap gap-1.5">
        {swatches.map((w) => {
          const active = (value ?? undefined) === (w.id ?? undefined);
          return (
            <button
              key={w.label}
              title={w.label}
              onClick={() => onChange(w.id)}
              className={`h-7 w-7 rounded-lg border-2 ${active ? "border-[#17171c]" : "border-transparent"}`}
              style={{ background: w.swatch }}
            />
          );
        })}
      </div>
    </div>
  );
}

/** Per-message attachments (image / document / link) + reorder + video timing. */
const REACTION_QUICK = ["❤️", "😂", "😮", "😢", "🙏", "👍", "🔥"];

function MsgExtras<
  M extends { image?: string; file?: ChatFile; link?: ChatLink; call?: ChatCall; dateLabel?: string; delayMs?: number; voice?: { seconds: number }; reaction?: string }
>({
  m,
  i,
  count,
  patch,
  move,
}: {
  m: M;
  i: number;
  count: number;
  patch: (p: Partial<M>) => void;
  move: (from: number, to: number) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const imgUrl = m.image ? resolveAsset(m.image)?.url : undefined;
  const secs = m.delayMs != null ? (m.delayMs / 1000).toString() : "";
  const toggleFile = () =>
    patch({ file: m.file ? undefined : { name: "Document.pdf", ext: "pdf", meta: "1 page · 240 kB" } } as Partial<M>);
  const toggleLink = () =>
    patch({ link: m.link ? undefined : { url: "https://mockframe.app", domain: "mockframe.app", title: "MockFrame — the mockup studio" } } as Partial<M>);
  const toggleCall = () =>
    patch({ call: m.call ? undefined : { kind: "voice", state: "outgoing", duration: "32 sec" } } as Partial<M>);
  const chipCls = (active: boolean) =>
    `fk-press flex items-center gap-1 rounded-lg border px-2 py-1 text-[10.5px] font-medium ${
      active ? "border-[#17171c] bg-[#17171c] text-white" : "border-[#e4e4ec] bg-white text-[#6b6b76] hover:border-[#c9c9d4]"
    }`;
  return (
    <div className="mt-1.5 rounded-xl border border-[#ececf2] bg-[#fafafc] p-2">
      {/* order + timing */}
      <div className="mb-2 flex items-center gap-1.5">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#b0b0ba]">Order</span>
        <button title="Move up" disabled={i === 0} onClick={() => move(i, i - 1)} className="fk-press rounded p-0.5 text-[#9a9aa4] hover:text-[#17171c] disabled:opacity-30">
          <ArrowUp size={13} />
        </button>
        <button title="Move down" disabled={i === count - 1} onClick={() => move(i, i + 1)} className="fk-press rounded p-0.5 text-[#9a9aa4] hover:text-[#17171c] disabled:opacity-30">
          <ArrowDown size={13} />
        </button>
        <span className="flex-1" />
        <span className="text-[9px] font-semibold uppercase tracking-wider text-[#b0b0ba]">Delay</span>
        <input
          title="Seconds before this message (video)"
          type="number"
          min={0}
          step={0.5}
          value={secs}
          placeholder="auto"
          onChange={(e) => patch({ delayMs: e.target.value === "" ? undefined : Math.max(0, Number(e.target.value)) * 1000 } as Partial<M>)}
          className="w-12 rounded-md border border-[#e4e4ec] bg-white px-1 py-0.5 text-center text-[10px] tabular-nums text-[#17171c] outline-none focus:border-[#17171c]"
        />
        <span className="text-[10px] text-[#9a9aa4]">s</span>
      </div>
      {/* attach chips */}
      <div className="flex flex-wrap items-center gap-1.5">
        <button title={imgUrl ? "Change photo" : "Attach photo"} onClick={() => fileRef.current?.click()} className={chipCls(!!m.image)}>
          {imgUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imgUrl} alt="" className="h-4 w-4 rounded object-cover" />
          ) : (
            <ImagePlus size={12} />
          )}
          Photo
        </button>
        {m.image && (
          <button title="Remove photo" onClick={() => patch({ image: undefined } as Partial<M>)} className="fk-press rounded p-1 text-[#9a9aa4] hover:text-[#17171c]">
            <X size={11} />
          </button>
        )}
        <button title="Attach document" onClick={toggleFile} className={chipCls(!!m.file)}>
          <FileText size={12} /> Doc
        </button>
        <button title="Attach link" onClick={toggleLink} className={chipCls(!!m.link)}>
          <Link2 size={12} /> Link
        </button>
        <button title="Call event (WhatsApp)" onClick={toggleCall} className={chipCls(!!m.call)}>
          <Phone size={12} /> Call
        </button>
        <button title="Date separator before this message" onClick={() => patch({ dateLabel: m.dateLabel ? undefined : "Today" } as Partial<M>)} className={chipCls(m.dateLabel != null)}>
          <CalendarDays size={12} /> Date
        </button>
        {/* Pro chat pack: voice notes + reactions */}
        <button
          title="Voice-note bubble (Pro)"
          onClick={() => {
            if (!useViewStore.getState().removeWatermark) return openUpgrade();
            patch({ voice: m.voice ? undefined : { seconds: 12 } } as Partial<M>);
          }}
          className={chipCls(!!m.voice)}
        >
          <Mic size={12} /> Voice
        </button>
        <button
          title="Emoji reaction on this bubble (Pro)"
          onClick={() => {
            if (!useViewStore.getState().removeWatermark) return openUpgrade();
            patch({ reaction: m.reaction ? undefined : "❤️" } as Partial<M>);
          }}
          className={chipCls(!!m.reaction)}
        >
          <SmilePlus size={12} /> React
        </button>
      </div>
      {m.voice && (
        <div className="mt-1.5 flex items-center gap-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-wider text-[#b0b0ba]">Length</span>
          <input
            type="number"
            min={1}
            max={599}
            value={m.voice.seconds}
            onChange={(e) => patch({ voice: { seconds: Math.max(1, Number(e.target.value) || 1) } } as Partial<M>)}
            className="w-14 rounded-md border border-[#e4e4ec] bg-white px-1 py-0.5 text-center text-[10px] tabular-nums text-[#17171c] outline-none focus:border-[#17171c]"
          />
          <span className="text-[10px] text-[#9a9aa4]">sec</span>
        </div>
      )}
      {m.reaction && (
        <div className="mt-1.5 flex items-center gap-1">
          {REACTION_QUICK.map((e) => (
            <button
              key={e}
              onClick={() => patch({ reaction: e } as Partial<M>)}
              className={`fk-press grid h-6 w-6 place-items-center rounded-md text-[13px] ${m.reaction === e ? "bg-[#17171c]" : "hover:bg-black/5"}`}
            >
              {e}
            </button>
          ))}
        </div>
      )}

      {m.file && (
        <div className="mt-2 flex gap-1.5">
          <input
            value={m.file.name}
            placeholder="filename.pdf"
            onChange={(e) => patch({ file: { ...m.file!, name: e.target.value, ext: e.target.value.split(".").pop() } } as Partial<M>)}
            className="min-w-0 flex-1 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[10.5px] text-[#17171c] outline-none focus:border-[#17171c]"
          />
          <input
            value={m.file.meta ?? ""}
            placeholder="2 pages · 240 kB"
            onChange={(e) => patch({ file: { ...m.file!, meta: e.target.value } } as Partial<M>)}
            className="w-28 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[10.5px] text-[#17171c] outline-none focus:border-[#17171c]"
          />
        </div>
      )}
      {m.link && (
        <div className="mt-2 flex gap-1.5">
          <input
            value={m.link.title ?? ""}
            placeholder="Link title"
            onChange={(e) => patch({ link: { ...m.link!, title: e.target.value } } as Partial<M>)}
            className="min-w-0 flex-1 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[10.5px] text-[#17171c] outline-none focus:border-[#17171c]"
          />
          <input
            value={m.link.domain ?? m.link.url}
            placeholder="domain.com"
            onChange={(e) => patch({ link: { ...m.link!, domain: e.target.value, url: e.target.value } } as Partial<M>)}
            className="w-28 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[10.5px] text-[#17171c] outline-none focus:border-[#17171c]"
          />
        </div>
      )}
      {m.call && (
        <div className="mt-2 flex flex-wrap items-center gap-1">
          {(["voice", "video"] as const).map((k) => (
            <button key={k} onClick={() => patch({ call: { ...m.call!, kind: k } } as Partial<M>)} className={`fk-press rounded-md px-1.5 py-1 text-[10px] font-semibold ${m.call!.kind === k ? "bg-[#17171c] text-white" : "border border-[#e4e4ec] text-[#6b6b76]"}`}>
              {k}
            </button>
          ))}
          <span className="mx-0.5 h-3 w-px bg-[#e4e4ec]" />
          {(["outgoing", "incoming", "missed"] as const).map((st) => (
            <button key={st} onClick={() => patch({ call: { ...m.call!, state: st } } as Partial<M>)} className={`fk-press rounded-md px-1.5 py-1 text-[10px] font-semibold ${m.call!.state === st ? "bg-[#17171c] text-white" : "border border-[#e4e4ec] text-[#6b6b76]"}`}>
              {st === "outgoing" ? "out" : st === "incoming" ? "in" : "missed"}
            </button>
          ))}
          {m.call.state !== "missed" && (
            <input
              value={m.call.duration ?? ""}
              placeholder="32 sec"
              onChange={(e) => patch({ call: { ...m.call!, duration: e.target.value } } as Partial<M>)}
              className="w-16 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[10px] text-[#17171c] outline-none focus:border-[#17171c]"
            />
          )}
        </div>
      )}
      {m.dateLabel != null && (
        <div className="mt-2">
          <input
            value={m.dateLabel}
            placeholder="Today"
            onChange={(e) => patch({ dateLabel: e.target.value } as Partial<M>)}
            className="w-32 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[10.5px] text-[#17171c] outline-none focus:border-[#17171c]"
          />
        </div>
      )}

      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const a = await ingestFile(f);
          patch({ image: a.id } as Partial<M>);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function MessageRows<
  M extends { from: "me" | "them"; text: string; image?: string; file?: ChatFile; link?: ChatLink; delayMs?: number }
>({
  messages,
  onChange,
  extra,
  makeNew,
}: {
  messages: M[];
  onChange: (messages: M[]) => void;
  /** per-row trailing control (e.g. WhatsApp ticks) */
  extra?: (m: M, patch: (p: Partial<M>) => void) => React.ReactNode;
  makeNew: (from: "me" | "them") => M;
}) {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const patchAt = (i: number, p: Partial<M>) =>
    onChange(messages.map((m, j) => (j === i ? { ...m, ...p } : m)));
  const move = (from: number, to: number) => {
    if (to < 0 || to >= messages.length) return;
    const next = [...messages];
    const [it] = next.splice(from, 1);
    next.splice(to, 0, it);
    onChange(next);
  };
  const hasExtras = (m: M) => {
    const x = m as { image?: string; file?: unknown; link?: unknown; call?: unknown; dateLabel?: unknown; delayMs?: number | null };
    return !!(x.image || x.file || x.link || x.call || x.dateLabel != null || (x.delayMs != null));
  };
  return (
    <div className="mt-3">
      <span className="mb-1.5 block text-xs text-[#6b6b76]">Messages</span>
      <div className="flex flex-col gap-1.5">
        {messages.map((m, i) => {
          const open = openIdx === i;
          const marked = open || hasExtras(m);
          return (
            <div key={i} className={open ? "rounded-xl bg-[#f4f4f8] p-1.5" : ""}>
              <div className="flex items-center gap-1.5">
                <button
                  title={m.from === "me" ? "Sent by you — click to flip" : "Sent by them — click to flip"}
                  onClick={() => patchAt(i, { from: m.from === "me" ? "them" : "me" } as Partial<M>)}
                  className={`fk-press w-11 shrink-0 rounded-lg py-1.5 text-[10px] font-bold ${
                    m.from === "me" ? "bg-[#17171c] text-white" : "border border-[#e4e4ec] bg-white text-[#6b6b76]"
                  }`}
                >
                  {m.from === "me" ? "You" : "Them"}
                </button>
                <input
                  value={m.text}
                  placeholder={m.image ? "caption (optional)" : "Message…"}
                  onChange={(e) => patchAt(i, { text: e.target.value } as Partial<M>)}
                  className="min-w-0 flex-1 rounded-lg border border-[#e4e4ec] bg-white px-2.5 py-2 text-xs text-[#17171c] outline-none focus:border-[#17171c]"
                />
                {extra?.(m, (p) => patchAt(i, p))}
                <button
                  title="Attachments, order & timing"
                  onClick={() => setOpenIdx(open ? null : i)}
                  className={`fk-press relative shrink-0 rounded-md p-1.5 ${marked ? "text-[#17171c]" : "text-[#b0b0ba] hover:bg-black/6 hover:text-[#17171c]"}`}
                >
                  <Paperclip size={13} />
                  {marked && !open && <span className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-[#7c3aed]" />}
                </button>
                <button
                  title="Remove message"
                  onClick={() => { onChange(messages.filter((_, j) => j !== i)); setOpenIdx(null); }}
                  className="fk-press shrink-0 rounded-md p-1.5 text-[#b0b0ba] hover:bg-black/6 hover:text-[#17171c]"
                >
                  <Trash2 size={13} />
                </button>
              </div>
              {open && <MsgExtras m={m} i={i} count={messages.length} patch={(p) => patchAt(i, p)} move={move} />}
            </div>
          );
        })}
      </div>
      <button
        onClick={() => onChange([...messages, makeNew(messages.at(-1)?.from === "me" ? "them" : "me")])}
        className="fk-press mt-2 w-full rounded-lg border border-dashed border-[#c9c9d4] py-2 text-[11px] font-semibold text-[#6b6b76] hover:border-[#17171c] hover:text-[#17171c]"
      >
        + Add message
      </button>
    </div>
  );
}

/* --------------------------------- iMessage ---------------------------------- */

function IMessageFields({ doc, setDoc }: { doc: IMessageDoc; setDoc: (d: ScreenDoc) => void }) {
  return (
    <>
      <Field label="Contact name" value={doc.contact} onChange={(contact) => setDoc({ ...doc, contact })} />
      <div className="mt-3">
        <span className="mb-1 block text-xs text-[#6b6b76]">Bubbles</span>
        <Seg
          id="im-kind"
          options={[
            { value: "imessage", label: "iMessage" },
            { value: "sms", label: "SMS" },
          ]}
          value={doc.sms ? "sms" : "imessage"}
          onChange={(v) => setDoc({ ...doc, sms: v === "sms" })}
        />
      </div>
      <span className="mb-1 block text-xs text-[#6b6b76]">Last message status</span>
      <Seg
        id="im-status"
        options={[
          { value: "none", label: "None" },
          { value: "delivered", label: "Delivered" },
          { value: "read", label: "Read" },
        ]}
        value={doc.status}
        onChange={(status) => setDoc({ ...doc, status })}
      />
      <div className="flex gap-1.5">
        <Toggle label="Typing…" on={!!doc.typing} onClick={() => setDoc({ ...doc, typing: !doc.typing })} />
        <Toggle label="Date header" on={!!doc.showHeader} onClick={() => setDoc({ ...doc, showHeader: !doc.showHeader })} />
      </div>
      <MessageRows
        messages={doc.messages}
        onChange={(messages) => setDoc({ ...doc, messages })}
        makeNew={(from) => ({ from, text: "" })}
      />
    </>
  );
}

/* --------------------------------- WhatsApp ---------------------------------- */

const TICK_CYCLE: WhatsAppTicks[] = ["sent", "delivered", "read"];
const TICK_GLYPH: Record<WhatsAppTicks, { label: string; color: string }> = {
  sent: { label: "✓", color: "#8a8a94" },
  delivered: { label: "✓✓", color: "#8a8a94" },
  read: { label: "✓✓", color: "#53bdeb" },
};

function TickCycler({ ticks, onCycle }: { ticks: WhatsAppTicks; onCycle: (t: WhatsAppTicks) => void }) {
  return (
    <button
      title={`Ticks: ${ticks} — click to cycle`}
      onClick={() => onCycle(TICK_CYCLE[(TICK_CYCLE.indexOf(ticks) + 1) % TICK_CYCLE.length])}
      className="fk-press w-8 shrink-0 rounded-md border border-[#e4e4ec] py-1 text-[11px] font-bold tracking-[-0.12em]"
      style={{ color: TICK_GLYPH[ticks].color }}
    >
      {TICK_GLYPH[ticks].label}
    </button>
  );
}

function tickExtra<M extends { from: "me" | "them"; ticks?: WhatsAppTicks }>(
  m: M,
  patch: (p: Partial<M>) => void
) {
  return m.from === "me" ? (
    <TickCycler ticks={m.ticks ?? "read"} onCycle={(ticks) => patch({ ticks } as Partial<M>)} />
  ) : null;
}

function WhatsAppFields({ doc, setDoc }: { doc: WhatsAppDoc; setDoc: (d: ScreenDoc) => void }) {
  return (
    <>
      <div className="flex gap-2">
        <Field label="Contact name" value={doc.contact} onChange={(contact) => setDoc({ ...doc, contact })} className="flex-1" />
        <Field label="Status" value={doc.presence} onChange={(presence) => setDoc({ ...doc, presence })} className="w-24" placeholder="online" />
      </div>
      <WallpaperField value={doc.wallpaper} onChange={(wallpaper) => setDoc({ ...doc, wallpaper })} />
      <MessageRows
        messages={doc.messages}
        onChange={(messages) => setDoc({ ...doc, messages })}
        makeNew={(from) => ({ from, text: "", ticks: "read" as WhatsAppTicks })}
        extra={tickExtra}
      />
    </>
  );
}

function WhatsAppGroupFields({ doc, setDoc }: { doc: WhatsAppGroupDoc; setDoc: (d: ScreenDoc) => void }) {
  return (
    <>
      <Field label="Group name" value={doc.name} onChange={(name) => setDoc({ ...doc, name })} />
      <div className="mt-3">
        <Field label="Members line" value={doc.members} onChange={(members) => setDoc({ ...doc, members })} />
      </div>
      <WallpaperField value={doc.wallpaper} onChange={(wallpaper) => setDoc({ ...doc, wallpaper })} />
      <MessageRows
        messages={doc.messages}
        onChange={(messages) => setDoc({ ...doc, messages })}
        makeNew={(from) => ({ from, text: "", ticks: "read" as WhatsAppTicks, sender: from === "them" ? "Alex" : undefined })}
        extra={(m, patch) =>
          m.from === "me" ? (
            tickExtra(m, patch)
          ) : (
            <input
              title="Sender name"
              value={m.sender ?? ""}
              placeholder="Name"
              onChange={(e) => patch({ sender: e.target.value } as Partial<typeof m>)}
              className="w-14 shrink-0 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[10.5px] text-[#17171c] outline-none focus:border-[#17171c]"
            />
          )
        }
      />
    </>
  );
}

function reactionExtra<M extends { reaction?: string }>(m: M, patch: (p: Partial<M>) => void) {
  return (
    <input
      title="Reaction emoji (empty for none)"
      value={m.reaction ?? ""}
      placeholder="♡"
      onChange={(e) => patch({ reaction: e.target.value.trim() || undefined } as Partial<M>)}
      className="w-8 shrink-0 rounded-md border border-[#e4e4ec] bg-white px-1 py-1 text-center text-[11px] outline-none focus:border-[#17171c]"
    />
  );
}

function InstagramFields({ doc, setDoc }: { doc: InstagramDoc; setDoc: (d: ScreenDoc) => void }) {
  return (
    <>
      <div className="flex gap-2">
        <Field label="Username" value={doc.username} onChange={(username) => setDoc({ ...doc, username })} className="flex-1" />
        <Field label="Status" value={doc.presence} onChange={(presence) => setDoc({ ...doc, presence })} className="w-28" placeholder="Active now" />
      </div>
      <div className="mt-3 flex gap-1.5">
        <Toggle label="Seen" on={!!doc.seen} onClick={() => setDoc({ ...doc, seen: !doc.seen })} />
      </div>
      <MessageRows
        messages={doc.messages}
        onChange={(messages) => setDoc({ ...doc, messages })}
        makeNew={(from) => ({ from, text: "" })}
        extra={reactionExtra}
      />
    </>
  );
}

function MessengerFields({ doc, setDoc }: { doc: MessengerDoc; setDoc: (d: ScreenDoc) => void }) {
  return (
    <>
      <div className="flex gap-2">
        <Field label="Contact name" value={doc.contact} onChange={(contact) => setDoc({ ...doc, contact })} className="flex-1" />
        <Field label="Status" value={doc.presence} onChange={(presence) => setDoc({ ...doc, presence })} className="w-28" placeholder="Active now" />
      </div>
      <MessageRows
        messages={doc.messages}
        onChange={(messages) => setDoc({ ...doc, messages })}
        makeNew={(from) => ({ from, text: "" })}
        extra={reactionExtra}
      />
    </>
  );
}

function SignalFields({ doc, setDoc }: { doc: SignalDoc; setDoc: (d: ScreenDoc) => void }) {
  return (
    <>
      <div className="flex gap-2">
        <Field label="Contact name" value={doc.contact} onChange={(contact) => setDoc({ ...doc, contact })} className="flex-1" />
        <Field label="Status" value={doc.presence} onChange={(presence) => setDoc({ ...doc, presence })} className="w-24" placeholder="optional" />
      </div>
      <MessageRows
        messages={doc.messages}
        onChange={(messages) => setDoc({ ...doc, messages })}
        makeNew={(from) => ({ from, text: "", ticks: "read" as WhatsAppTicks })}
        extra={tickExtra}
      />
    </>
  );
}

function LineFields({ doc, setDoc }: { doc: LineDoc; setDoc: (d: ScreenDoc) => void }) {
  return (
    <>
      <div className="flex gap-2">
        <Field label="Contact name" value={doc.contact} onChange={(contact) => setDoc({ ...doc, contact })} className="flex-1" />
        <Field label="Status" value={doc.presence ?? ""} onChange={(presence) => setDoc({ ...doc, presence })} className="w-24" placeholder="optional" />
      </div>
      <MessageRows
        messages={doc.messages}
        onChange={(messages) => setDoc({ ...doc, messages })}
        makeNew={(from) => ({ from, text: "", read: from === "me" ? true : undefined })}
        extra={(m, patch) =>
          m.from === "me" ? (
            <Toggle label="Read" on={!!m.read} onClick={() => patch({ read: !m.read } as Partial<typeof m>)} />
          ) : null
        }
      />
    </>
  );
}

const DATING_BRANDS: DatingDoc["brand"][] = ["tinder", "bumble"];

function DatingFields({ doc, setDoc }: { doc: DatingDoc; setDoc: (d: ScreenDoc) => void }) {
  return (
    <>
      <Seg
        id="dating-brand"
        options={DATING_BRANDS.map((b) => ({ value: b, label: DATING_LABELS[b] }))}
        value={doc.brand}
        onChange={(v) => setDoc({ ...doc, brand: v as DatingDoc["brand"] })}
      />
      <div className="mt-3 flex gap-2">
        <Field label="Name" value={doc.name} onChange={(name) => setDoc({ ...doc, name })} className="flex-1" />
        <NumField label="Age" value={doc.age} onChange={(age) => setDoc({ ...doc, age })} />
        <div className="flex flex-col justify-end pb-0.5">
          <Toggle label="Verified" on={!!doc.verified} onClick={() => setDoc({ ...doc, verified: !doc.verified })} />
        </div>
      </div>
      <div className="mt-2 flex gap-2">
        <Field label="Job / role" value={doc.job ?? ""} onChange={(job) => setDoc({ ...doc, job: job || undefined })} className="flex-1" placeholder="Product Designer" />
        <Field label="Distance" value={doc.distance ?? ""} onChange={(distance) => setDoc({ ...doc, distance: distance || undefined })} className="w-28" placeholder="2 miles away" />
      </div>
      <label className="mt-2 block">
        <span className="mb-1 block text-xs text-[#6b6b76]">Bio</span>
        <textarea value={doc.bio ?? ""} rows={3} onChange={(e) => setDoc({ ...doc, bio: e.target.value || undefined })} className="w-full resize-none rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-[11px] text-[#17171c] outline-none focus:border-[#17171c]" />
      </label>
      <Field
        label="Interests (comma separated)"
        value={(doc.interests ?? []).join(", ")}
        onChange={(v) => setDoc({ ...doc, interests: v.split(",").map((s) => s.trim()).filter(Boolean) })}
        placeholder="Climbing, Design, Travel"
      />
      <p className="mt-2 text-[10px] leading-relaxed text-[#b0b0ba]">Upload a profile photo above — without one, the card uses a colored gradient.</p>
    </>
  );
}

function SlackFields({ doc, setDoc }: { doc: SlackDoc; setDoc: (d: ScreenDoc) => void }) {
  const patchAt = (i: number, p: Partial<SlackDoc["messages"][number]>) =>
    setDoc({ ...doc, messages: doc.messages.map((m, j) => (j === i ? { ...m, ...p } : m)) });
  return (
    <>
      <div className="flex gap-2">
        <Field label="Workspace" value={doc.workspace} onChange={(workspace) => setDoc({ ...doc, workspace })} className="flex-1" />
        <Field label="# Channel" value={doc.channel} onChange={(channel) => setDoc({ ...doc, channel })} className="flex-1" />
      </div>
      <div className="mt-3">
        <span className="mb-1 block text-xs text-[#6b6b76]">Messages</span>
        <div className="flex flex-col gap-2">
          {doc.messages.map((m, i) => (
            <div key={i} className="rounded-xl border border-[#ececf2] p-1.5">
              <div className="mb-1.5 flex items-center gap-1.5">
                <AvatarUploadButton value={m.avatar} onChange={(avatar) => patchAt(i, { avatar })} />
                <input value={m.sender} placeholder="name" onChange={(e) => patchAt(i, { sender: e.target.value })} className="min-w-0 flex-1 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] font-medium outline-none focus:border-[#17171c]" />
                <input title="Time" value={m.time} onChange={(e) => patchAt(i, { time: e.target.value })} className="w-16 shrink-0 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#17171c]" />
                <input type="color" title="Name color" value={m.color ?? "#e01e5a"} onChange={(e) => patchAt(i, { color: e.target.value })} className="h-6 w-6 shrink-0 cursor-pointer rounded" />
                <button title="Remove" onClick={() => setDoc({ ...doc, messages: doc.messages.filter((_, j) => j !== i) })} className="fk-press shrink-0 rounded-md p-1 text-[#b0b0ba] hover:bg-black/6 hover:text-[#17171c]"><Trash2 size={12} /></button>
              </div>
              <input value={m.text} placeholder="message" onChange={(e) => patchAt(i, { text: e.target.value })} className="mb-1 w-full rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#17171c]" />
              <input value={(m.reactions ?? []).join(", ")} placeholder="reactions e.g. 🔥 4, 🚀 2" onChange={(e) => patchAt(i, { reactions: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} className="w-full rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#17171c]" />
            </div>
          ))}
        </div>
        <button onClick={() => setDoc({ ...doc, messages: [...doc.messages, { sender: doc.messages.at(-1)?.sender ?? "user", text: "", time: "9:41 AM" }] })} className="fk-press mt-2 w-full rounded-lg border border-dashed border-[#c9c9d4] py-1.5 text-[11px] font-semibold text-[#6b6b76] hover:border-[#17171c] hover:text-[#17171c]">+ Add message</button>
      </div>
    </>
  );
}

function RedditFields({ doc, setDoc }: { doc: RedditDoc; setDoc: (d: ScreenDoc) => void }) {
  const patchC = (i: number, p: Partial<RedditDoc["comments"][number]>) =>
    setDoc({ ...doc, comments: doc.comments.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  return (
    <>
      <div className="flex gap-2">
        <Field label="Subreddit (r/)" value={doc.subreddit} onChange={(subreddit) => setDoc({ ...doc, subreddit })} className="flex-1" />
        <Field label="Time" value={doc.time} onChange={(time) => setDoc({ ...doc, time })} className="w-16" />
      </div>
      <label className="mt-3 mb-2 block">
        <span className="mb-1 block text-xs text-[#6b6b76]">Post title</span>
        <textarea value={doc.title} rows={2} onChange={(e) => setDoc({ ...doc, title: e.target.value })} className="w-full resize-none rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-xs text-[#17171c] outline-none focus:border-[#17171c]" />
      </label>
      <label className="mb-2 block">
        <span className="mb-1 block text-xs text-[#6b6b76]">Body (optional)</span>
        <textarea value={doc.body ?? ""} rows={3} onChange={(e) => setDoc({ ...doc, body: e.target.value })} className="w-full resize-none rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-[11px] text-[#17171c] outline-none focus:border-[#17171c]" />
      </label>
      <div className="flex gap-2">
        <Field label="Author" value={doc.author} onChange={(author) => setDoc({ ...doc, author })} className="flex-1" />
        <NumField label="Upvotes" value={doc.votes} onChange={(votes) => setDoc({ ...doc, votes })} />
        <Field label="Comments" value={doc.commentCount} onChange={(commentCount) => setDoc({ ...doc, commentCount })} className="w-16" />
      </div>
      <div className="mt-3">
        <span className="mb-1 block text-xs text-[#6b6b76]">Comments</span>
        <div className="flex flex-col gap-2">
          {doc.comments.map((cm, i) => (
            <div key={i} className="rounded-xl border border-[#ececf2] p-1.5">
              <div className="mb-1.5 flex items-center gap-1.5">
                <AvatarUploadButton value={cm.avatar} onChange={(avatar) => patchC(i, { avatar })} />
                <input value={cm.user} placeholder="username" onChange={(e) => patchC(i, { user: e.target.value })} className="min-w-0 flex-1 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] font-medium outline-none focus:border-[#17171c]" />
                <input title="Time" value={cm.time} onChange={(e) => patchC(i, { time: e.target.value })} className="w-10 shrink-0 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#17171c]" />
                <input type="number" title="Votes" value={cm.votes} onChange={(e) => patchC(i, { votes: Number(e.target.value) || 0 })} className="w-12 shrink-0 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] tabular-nums outline-none focus:border-[#17171c]" />
                <button title="Indent" onClick={() => patchC(i, { depth: ((cm.depth ?? 0) + 1) % 3 })} className={`fk-press shrink-0 rounded-md border px-1.5 py-1 text-[10px] font-bold ${cm.depth ? "border-[#17171c] text-[#17171c]" : "border-[#e4e4ec] text-[#b0b0ba]"}`}>↳{cm.depth ?? 0}</button>
                <button title="OP" onClick={() => patchC(i, { op: !cm.op })} className={`fk-press shrink-0 rounded-md border px-1.5 py-1 text-[10px] font-bold ${cm.op ? "border-[#0079d3] text-[#0079d3]" : "border-[#e4e4ec] text-[#b0b0ba]"}`}>OP</button>
                <button title="Remove" onClick={() => setDoc({ ...doc, comments: doc.comments.filter((_, j) => j !== i) })} className="fk-press shrink-0 rounded-md p-1 text-[#b0b0ba] hover:bg-black/6 hover:text-[#17171c]"><Trash2 size={12} /></button>
              </div>
              <input value={cm.text} placeholder="comment text" onChange={(e) => patchC(i, { text: e.target.value })} className="w-full rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#17171c]" />
            </div>
          ))}
        </div>
        <button onClick={() => setDoc({ ...doc, comments: [...doc.comments, { user: "", text: "", time: "1h", votes: 0 }] })} className="fk-press mt-2 w-full rounded-lg border border-dashed border-[#c9c9d4] py-1.5 text-[11px] font-semibold text-[#6b6b76] hover:border-[#17171c] hover:text-[#17171c]">+ Add comment</button>
      </div>
    </>
  );
}

function TelegramFields({ doc, setDoc }: { doc: TelegramDoc; setDoc: (d: ScreenDoc) => void }) {
  return (
    <>
      <div className="flex gap-2">
        <Field label="Contact name" value={doc.contact} onChange={(contact) => setDoc({ ...doc, contact })} className="flex-1" />
        <Field label="Status" value={doc.presence} onChange={(presence) => setDoc({ ...doc, presence })} className="w-32" placeholder="last seen recently" />
      </div>
      <WallpaperField value={doc.wallpaper} onChange={(wallpaper) => setDoc({ ...doc, wallpaper })} />
      <MessageRows
        messages={doc.messages}
        onChange={(messages) => setDoc({ ...doc, messages })}
        makeNew={(from) => ({ from, text: "", ticks: "read" as WhatsAppTicks })}
        extra={tickExtra}
      />
    </>
  );
}

/** Rectangular media upload (video thumbnail / story background). */
function MediaUploadField({ label, value, onChange, hint }: { label: string; value?: string; onChange: (id?: string) => void; hint?: string }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const url = value ? resolveAsset(value)?.url : undefined;
  return (
    <div className="mb-1 mt-3 flex items-center gap-2">
      <span className="flex-1 text-xs text-[#6b6b76]">
        {label}
        {hint && <span className="ml-1 text-[10px] text-[#b0b0ba]">{hint}</span>}
      </span>
      {url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-8 w-12 rounded border border-[#e4e4ec] object-cover" />
      )}
      <button onClick={() => fileRef.current?.click()} className="fk-press flex items-center gap-1.5 rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-[11px] font-semibold text-[#17171c] hover:border-[#17171c]">
        <ImageIcon size={12} />
        {url ? "Change" : "Upload"}
      </button>
      {value && (
        <button title="Remove" onClick={() => onChange(undefined)} className="fk-press rounded-md p-1 text-[#9a9aa4] hover:bg-black/6 hover:text-[#17171c]">
          <X size={13} />
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const a = await ingestFile(f); onChange(a.id); e.target.value = ""; }} />
    </div>
  );
}

function Select<T extends string>({ label, value, options, onChange, className }: { label: string; value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; className?: string }) {
  return (
    <label className={`block ${className ?? ""}`}>
      <span className="mb-1 block text-xs text-[#6b6b76]">{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)} className="w-full rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-xs font-medium text-[#17171c] outline-none focus:border-[#17171c]">
        {options.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>
    </label>
  );
}

/** Compact round photo upload for a person (commenter / group sender). */
function AvatarUploadButton({ value, onChange }: { value?: string; onChange: (id?: string) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const url = value ? resolveAsset(value)?.url : undefined;
  return (
    <div className="relative shrink-0">
      <button
        type="button"
        title={url ? "Change photo" : "Add photo"}
        onClick={() => fileRef.current?.click()}
        className="fk-press grid h-7 w-7 place-items-center overflow-hidden rounded-full border border-[#e4e4ec] bg-[#f4f4f8] text-[#9a9aa4]"
      >
        {url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="h-full w-full object-cover" />
        ) : (
          <ImagePlus size={11} />
        )}
      </button>
      {value && (
        <button
          type="button"
          title="Remove photo"
          onClick={() => onChange(undefined)}
          className="absolute -right-1 -top-1 grid h-3.5 w-3.5 place-items-center rounded-full bg-[#17171c] text-white"
        >
          <X size={8} />
        </button>
      )}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={async (e) => { const f = e.target.files?.[0]; if (!f) return; const a = await ingestFile(f); onChange(a.id); e.target.value = ""; }} />
    </div>
  );
}

const SNAP_STATUS: SnapStatus[] = ["none", "Delivered", "Opened", "Received", "Screenshot!", "Replied"];

function SnapchatFields({ doc, setDoc }: { doc: SnapchatDoc; setDoc: (d: ScreenDoc) => void }) {
  return (
    <>
      <div className="flex gap-2">
        <Field label="Friend name" value={doc.contact} onChange={(contact) => setDoc({ ...doc, contact })} className="flex-1" />
        <NumField label="Streak 🔥" value={doc.streak} onChange={(streak) => setDoc({ ...doc, streak })} />
      </div>
      <div className="mt-3 flex gap-2">
        <Select
          label="Status line"
          value={doc.status ?? "none"}
          options={SNAP_STATUS.map((s) => ({ value: s, label: s === "none" ? "— none —" : s }))}
          onChange={(status) => setDoc({ ...doc, status })}
          className="flex-1"
        />
        <Select
          label="Accent"
          value={doc.statusKind ?? "chat"}
          options={[
            { value: "chat", label: "Chat (blue)" },
            { value: "snap-noaudio", label: "Snap (red)" },
            { value: "snap-audio", label: "Snap (purple)" },
          ]}
          onChange={(statusKind) => setDoc({ ...doc, statusKind })}
          className="w-32"
        />
      </div>
      <MessageRows
        messages={doc.messages}
        onChange={(messages) => setDoc({ ...doc, messages })}
        makeNew={(from) => ({ from, text: "" })}
        extra={reactionExtra}
      />
    </>
  );
}

const TEAMS_PRESENCE: TeamsPresence[] = ["available", "busy", "dnd", "away", "offline"];

function TeamsFields({ doc, setDoc }: { doc: TeamsDoc; setDoc: (d: ScreenDoc) => void }) {
  return (
    <>
      <div className="flex gap-2">
        <Field label="Contact name" value={doc.contact} onChange={(contact) => setDoc({ ...doc, contact })} className="flex-1" />
        <Field label="Status line" value={doc.status} onChange={(status) => setDoc({ ...doc, status })} className="w-28" placeholder="Available" />
      </div>
      <div className="mt-3 flex items-end gap-2">
        <Select
          label="Presence"
          value={doc.presence}
          options={TEAMS_PRESENCE.map((p) => ({ value: p, label: p === "dnd" ? "Do not disturb" : p[0].toUpperCase() + p.slice(1) }))}
          onChange={(presence) => setDoc({ ...doc, presence })}
          className="flex-1"
        />
        <Toggle label="Seen ✓" on={!!doc.seen} onClick={() => setDoc({ ...doc, seen: !doc.seen })} />
      </div>
      <MessageRows
        messages={doc.messages}
        onChange={(messages) => setDoc({ ...doc, messages })}
        makeNew={(from) => ({ from, text: "" })}
        extra={reactionExtra}
      />
    </>
  );
}

function YouTubeFields({ doc, setDoc }: { doc: YouTubeDoc; setDoc: (d: ScreenDoc) => void }) {
  const patchC = (i: number, p: Partial<YouTubeComment>) =>
    setDoc({ ...doc, comments: doc.comments.map((c, j) => (j === i ? { ...c, ...p } : c)) });
  return (
    <>
      <MediaUploadField label="Video thumbnail" value={doc.thumbnail} onChange={(thumbnail) => setDoc({ ...doc, thumbnail })} hint="16:9" />
      <label className="mb-2 block">
        <span className="mb-1 block text-xs text-[#6b6b76]">Title</span>
        <textarea value={doc.title} rows={2} onChange={(e) => setDoc({ ...doc, title: e.target.value })} className="w-full resize-none rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-xs text-[#17171c] outline-none focus:border-[#17171c]" />
      </label>
      <div className="flex gap-2">
        <Field label="Views" value={doc.views} onChange={(views) => setDoc({ ...doc, views })} className="w-24" placeholder="248K" />
        <Field label="Age" value={doc.age} onChange={(age) => setDoc({ ...doc, age })} className="flex-1" placeholder="3 days ago" />
      </div>
      <div className="mt-2 flex gap-2">
        <Field label="Channel" value={doc.channel} onChange={(channel) => setDoc({ ...doc, channel })} className="flex-1" />
        <Field label="Subs" value={doc.subscribers} onChange={(subscribers) => setDoc({ ...doc, subscribers })} className="w-20" placeholder="182K" />
      </div>
      <div className="mt-2 flex gap-2">
        <Field label="Likes" value={doc.likes} onChange={(likes) => setDoc({ ...doc, likes })} className="w-24" placeholder="24K" />
        <Field label="Comments count" value={doc.commentCount} onChange={(commentCount) => setDoc({ ...doc, commentCount })} className="flex-1" placeholder="1,204" />
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        <Toggle label="Verified" on={!!doc.verified} onClick={() => setDoc({ ...doc, verified: !doc.verified })} />
        <Toggle label="Subscribed" on={!!doc.subscribed} onClick={() => setDoc({ ...doc, subscribed: !doc.subscribed })} />
      </div>
      <div className="mt-3">
        <SliderRow label="Watch progress" value={Math.round((doc.progress ?? 0) * 100)} min={0} max={100} format={(v) => `${Math.round(v)}%`} onChange={(v) => setDoc({ ...doc, progress: v / 100 })} />
      </div>
      <div className="mt-3">
        <span className="mb-1 block text-xs text-[#6b6b76]">Comments</span>
        <div className="flex flex-col gap-2">
          {doc.comments.map((cm, i) => (
            <div key={i} className="rounded-xl border border-[#ececf2] p-1.5">
              <div className="mb-1.5 flex items-center gap-1.5">
                <AvatarUploadButton value={cm.avatar} onChange={(avatar) => patchC(i, { avatar })} />
                <input value={cm.handle} placeholder="@handle" onChange={(e) => patchC(i, { handle: e.target.value })} className="min-w-0 flex-1 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] font-medium outline-none focus:border-[#17171c]" />
                <input title="Time" value={cm.time} onChange={(e) => patchC(i, { time: e.target.value })} className="w-16 shrink-0 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#17171c]" />
                <input type="number" title="Likes" value={cm.likes} onChange={(e) => patchC(i, { likes: Number(e.target.value) || 0 })} className="w-14 shrink-0 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] tabular-nums outline-none focus:border-[#17171c]" />
                <button title="Remove" onClick={() => setDoc({ ...doc, comments: doc.comments.filter((_, j) => j !== i) })} className="fk-press shrink-0 rounded-md p-1 text-[#b0b0ba] hover:bg-black/6 hover:text-[#17171c]"><Trash2 size={12} /></button>
              </div>
              <input value={cm.text} placeholder="comment text" onChange={(e) => patchC(i, { text: e.target.value })} className="mb-1.5 w-full rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#17171c]" />
              <div className="flex flex-wrap items-center gap-1">
                <Toggle label="Pinned" on={!!cm.pinned} onClick={() => patchC(i, { pinned: !cm.pinned })} />
                <Toggle label="❤ Hearted" on={!!cm.hearted} onClick={() => patchC(i, { hearted: !cm.hearted })} />
                <Toggle label="Verified" on={!!cm.verified} onClick={() => patchC(i, { verified: !cm.verified })} />
                <input type="number" title="Reply count (0 = none)" value={cm.replyCount ?? 0} onChange={(e) => patchC(i, { replyCount: Number(e.target.value) || undefined })} className="w-14 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[10.5px] tabular-nums outline-none focus:border-[#17171c]" placeholder="replies" />
              </div>
            </div>
          ))}
        </div>
        <button onClick={() => setDoc({ ...doc, comments: [...doc.comments, { handle: "@user", text: "", time: "1 day ago", likes: 0 }] })} className="fk-press mt-2 w-full rounded-lg border border-dashed border-[#c9c9d4] py-1.5 text-[11px] font-semibold text-[#6b6b76] hover:border-[#17171c] hover:text-[#17171c]">+ Add comment</button>
      </div>
    </>
  );
}

const HINGE_VITAL_ICONS: HingeVital["icon"][] = ["age", "height", "location", "job", "school", "pronouns", "religion", "drinking"];

function HingeFields({ doc, setDoc }: { doc: HingeDoc; setDoc: (d: ScreenDoc) => void }) {
  const patchCard = (i: number, c: HingeCard) => setDoc({ ...doc, cards: doc.cards.map((x, j) => (j === i ? c : x)) });
  const removeCard = (i: number) =>
    setDoc({ ...doc, cards: doc.cards.filter((_, j) => j !== i), liked: (doc.liked ?? []).filter((x) => x !== i).map((x) => (x > i ? x - 1 : x)) });
  const toggleLike = (i: number) => {
    const liked = doc.liked ?? [];
    setDoc({ ...doc, liked: liked.includes(i) ? liked.filter((x) => x !== i) : [...liked, i] });
  };
  const patchV = (i: number, p: Partial<HingeVital>) => setDoc({ ...doc, vitals: doc.vitals.map((v, j) => (j === i ? { ...v, ...p } : v)) });
  return (
    <>
      <div className="flex gap-2">
        <Field label="Name" value={doc.name} onChange={(name) => setDoc({ ...doc, name })} className="flex-1" />
        <NumField label="Age" value={doc.age} onChange={(age) => setDoc({ ...doc, age })} />
        <div className="flex flex-col justify-end pb-0.5">
          <Toggle label="Verified" on={!!doc.verified} onClick={() => setDoc({ ...doc, verified: !doc.verified })} />
        </div>
      </div>
      <div className="mt-3">
        <span className="mb-1 block text-xs text-[#6b6b76]">Vitals</span>
        <div className="flex flex-col gap-1.5">
          {doc.vitals.map((v, i) => (
            <div key={i} className="flex items-center gap-1.5">
              <select value={v.icon} onChange={(e) => patchV(i, { icon: e.target.value as HingeVital["icon"] })} className="w-24 shrink-0 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#17171c]">
                {HINGE_VITAL_ICONS.map((ic) => (<option key={ic} value={ic}>{ic}</option>))}
              </select>
              <input value={v.text} placeholder="value" onChange={(e) => patchV(i, { text: e.target.value })} className="min-w-0 flex-1 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#17171c]" />
              <button title="Remove" onClick={() => setDoc({ ...doc, vitals: doc.vitals.filter((_, j) => j !== i) })} className="fk-press shrink-0 rounded-md p-1 text-[#b0b0ba] hover:bg-black/6 hover:text-[#17171c]"><Trash2 size={12} /></button>
            </div>
          ))}
        </div>
        <button onClick={() => setDoc({ ...doc, vitals: [...doc.vitals, { icon: "location", text: "" }] })} className="fk-press mt-1.5 w-full rounded-lg border border-dashed border-[#c9c9d4] py-1 text-[11px] font-semibold text-[#6b6b76] hover:border-[#17171c] hover:text-[#17171c]">+ Add vital</button>
      </div>
      <div className="mt-3">
        <span className="mb-1 block text-xs text-[#6b6b76]">Cards (photos &amp; prompts)</span>
        <div className="flex flex-col gap-2">
          {doc.cards.map((card, i) => {
            const liked = (doc.liked ?? []).includes(i);
            return (
              <div key={i} className="rounded-xl border border-[#ececf2] p-1.5">
                <div className="mb-1.5 flex items-center gap-1.5">
                  <span className="rounded-md bg-[#f4f4f8] px-1.5 py-1 text-[10px] font-bold uppercase text-[#6b6b76]">{card.type}</span>
                  <span className="flex-1" />
                  <button title="Liked (purple heart)" onClick={() => toggleLike(i)} className={`fk-press rounded-md px-1.5 py-1 text-[11px] font-bold ${liked ? "bg-[#67295f] text-white" : "border border-[#e4e4ec] text-[#6b6b76]"}`}>♥</button>
                  <button title="Remove" onClick={() => removeCard(i)} className="fk-press rounded-md p-1 text-[#b0b0ba] hover:bg-black/6 hover:text-[#17171c]"><Trash2 size={12} /></button>
                </div>
                {card.type === "photo" ? (
                  <MediaUploadField label="Photo" value={card.image} onChange={(image) => patchCard(i, { type: "photo", image })} />
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <input value={card.label} placeholder="Prompt (e.g. The way to win me over is)" onChange={(e) => patchCard(i, { type: "prompt", label: e.target.value, answer: card.answer })} className="w-full rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] text-[#8c8a85] outline-none focus:border-[#17171c]" />
                    <textarea value={card.answer} rows={2} placeholder="Answer" onChange={(e) => patchCard(i, { type: "prompt", label: card.label, answer: e.target.value })} className="w-full resize-none rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] text-[#17171c] outline-none focus:border-[#17171c]" />
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-2 flex gap-2">
          <button onClick={() => setDoc({ ...doc, cards: [...doc.cards, { type: "photo" }] })} className="fk-press flex-1 rounded-lg border border-dashed border-[#c9c9d4] py-1.5 text-[11px] font-semibold text-[#6b6b76] hover:border-[#17171c] hover:text-[#17171c]">+ Photo</button>
          <button onClick={() => setDoc({ ...doc, cards: [...doc.cards, { type: "prompt", label: "My simple pleasures", answer: "" }] })} className="fk-press flex-1 rounded-lg border border-dashed border-[#c9c9d4] py-1.5 text-[11px] font-semibold text-[#6b6b76] hover:border-[#17171c] hover:text-[#17171c]">+ Prompt</button>
        </div>
      </div>
    </>
  );
}

const STORY_STICKERS = ["none", "location", "mention", "poll", "question", "music"] as const;

function StoryFields({ doc, setDoc }: { doc: StoryDoc; setDoc: (d: ScreenDoc) => void }) {
  const stickerType = doc.sticker?.type ?? "none";
  return (
    <>
      <MediaUploadField label="Story background" value={doc.background} onChange={(background) => setDoc({ ...doc, background })} hint="full-bleed" />
      <div className="flex gap-2">
        <Field label="Username" value={doc.username} onChange={(username) => setDoc({ ...doc, username })} className="flex-1" />
        <Field label="Time" value={doc.timeAgo} onChange={(timeAgo) => setDoc({ ...doc, timeAgo })} className="w-16" placeholder="5h" />
      </div>
      <div className="mt-2 flex gap-2">
        <NumField label="Segments" value={doc.storyCount} onChange={(storyCount) => setDoc({ ...doc, storyCount: Math.max(1, storyCount) })} />
        <NumField label="Active #" value={doc.activeIndex} onChange={(activeIndex) => setDoc({ ...doc, activeIndex })} />
      </div>
      <div className="mt-3">
        <SliderRow label="Active fill" value={Math.round((doc.activeProgress ?? 0) * 100)} min={0} max={100} format={(v) => `${Math.round(v)}%`} onChange={(v) => setDoc({ ...doc, activeProgress: v / 100 })} />
      </div>
      <div className="mt-2">
        <Field label="Caption (optional)" value={doc.caption ?? ""} onChange={(caption) => setDoc({ ...doc, caption: caption || undefined })} placeholder="shipping day 🚀" />
      </div>
      <div className="mt-3 flex gap-2">
        <Select
          label="Sticker"
          value={stickerType}
          options={STORY_STICKERS.map((s) => ({ value: s, label: s === "none" ? "— none —" : s }))}
          onChange={(t) => setDoc({ ...doc, sticker: t === "none" ? undefined : { type: t as Exclude<typeof stickerType, "none">, text: doc.sticker?.text || (t === "location" ? "New York, NY" : t === "mention" ? "@mockframe" : t === "music" ? "Sunflower" : "Ask me anything"), secondaryText: doc.sticker?.secondaryText } })}
          className="w-32"
        />
        {stickerType !== "none" && (
          <Field label="Sticker text" value={doc.sticker?.text ?? ""} onChange={(text) => setDoc({ ...doc, sticker: { type: doc.sticker!.type, text, secondaryText: doc.sticker?.secondaryText } })} className="flex-1" />
        )}
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-[#b0b0ba]">Upload a background above — without one, the story uses the Instagram gradient. Chrome stays white either way.</p>
    </>
  );
}

const GH_LEVELS = ["#ebedf0", "#9be9a8", "#40c463", "#30a14e", "#216e39"];

/** Paint the contribution squares directly — pick a shade and click/drag. */
function GithubPaintGrid({ cells, onChange }: { cells: number[]; onChange: (c: number[]) => void }) {
  const [brush, setBrush] = useState(2);
  const painting = useRef(false);
  const COLS = 53;
  const ROWS = 7;
  const cell = 5;
  const gap = 1.3;
  const paint = (idx: number) => {
    if (cells[idx] === brush) return;
    const next = cells.slice();
    next[idx] = brush;
    onChange(next);
  };
  return (
    <div className="mt-3">
      <span className="mb-1.5 block text-xs text-[#6b6b76]">Paint the graph</span>
      <div className="mb-1.5 flex items-center gap-1.5">
        {[0, 1, 2, 3, 4].map((l) => (
          <button
            key={l}
            onClick={() => setBrush(l)}
            title={l === 0 ? "Eraser" : `Level ${l}`}
            className={`grid h-6 w-6 place-items-center rounded-md border-2 ${brush === l ? "border-[#17171c]" : "border-[#e4e4ec]"}`}
            style={{ background: GH_LEVELS[l] }}
          >
            {l === 0 && <X size={10} className="text-[#9a9aa4]" />}
          </button>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${COLS * (cell + gap)} ${ROWS * (cell + gap)}`}
        className="w-full touch-none rounded-lg border border-[#e4e4ec] bg-white p-1"
        onPointerDown={() => (painting.current = true)}
        onPointerUp={() => (painting.current = false)}
        onPointerLeave={() => (painting.current = false)}
      >
        {Array.from({ length: COLS * ROWS }).map((_, idx) => {
          const col = Math.floor(idx / ROWS);
          const row = idx % ROWS;
          return (
            <rect
              key={idx}
              x={col * (cell + gap)}
              y={row * (cell + gap)}
              width={cell}
              height={cell}
              rx={1.2}
              fill={GH_LEVELS[cells[idx] ?? 0]}
              style={{ cursor: "crosshair" }}
              onPointerDown={() => {
                painting.current = true;
                paint(idx);
              }}
              onPointerEnter={() => {
                if (painting.current) paint(idx);
              }}
            />
          );
        })}
      </svg>
    </div>
  );
}

function ChartCardSizeFields({
  doc,
  setDoc,
}: {
  doc: GithubDoc | StripeDoc;
  setDoc: (d: ScreenDoc) => void;
}) {
  if (!doc.standalone) return null;
  const isGithub = doc.app === "github";
  const presets = isGithub
    ? [
        { label: "Compact", width: 680, height: 270 },
        { label: "GitHub", width: 960, height: 260 },
        { label: "Wide", width: 1160, height: 330 },
      ]
    : [
        { label: "Compact", width: 420, height: 330 },
        { label: "Dashboard", width: 560, height: 400 },
        { label: "Wide", width: 760, height: 400 },
      ];
  const patch = (values: Partial<Pick<GithubDoc, "cardWidth" | "cardHeight" | "contentScale">>) =>
    setDoc({ ...doc, ...values } as ScreenDoc);

  return (
    <div className="mb-4 mt-3 rounded-xl border border-[#e7e7ee] bg-[#f8f8fb] p-3">
      <div className="mb-2.5 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#7d7d88]">Card dimensions</span>
        <span className="text-[10px] tabular-nums text-[#9a9aa4]">{Math.round(doc.cardWidth ?? (isGithub ? 960 : 560))} × {Math.round(doc.cardHeight ?? (isGithub ? 260 : 400))}</span>
      </div>
      <div className="mb-3 grid grid-cols-3 gap-1.5">
        {presets.map((preset) => {
          const active = (doc.cardWidth ?? (isGithub ? 960 : 560)) === preset.width && (doc.cardHeight ?? (isGithub ? 260 : 400)) === preset.height;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => patch({ cardWidth: preset.width, cardHeight: preset.height })}
              className={`fk-press rounded-lg border px-1 py-1.5 text-[10px] font-semibold ${active ? "border-[#17171c] bg-[#17171c] text-white" : "border-[#dedee7] bg-white text-[#656570] hover:border-[#9a9aa4]"}`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      <SliderRow label="Width" value={doc.cardWidth ?? (isGithub ? 960 : 560)} min={isGithub ? 520 : 320} max={isGithub ? 1200 : 900} step={2} format={(v) => `${Math.round(v)} px`} onChange={(cardWidth) => patch({ cardWidth: Math.round(cardWidth) })} />
      <SliderRow label="Height" value={doc.cardHeight ?? (isGithub ? 260 : 400)} min={isGithub ? 240 : 260} max={isGithub ? 560 : 640} step={2} format={(v) => `${Math.round(v)} px`} onChange={(cardHeight) => patch({ cardHeight: Math.round(cardHeight) })} />
      <SliderRow label="Content size" value={Math.round((doc.contentScale ?? (isGithub ? 1 : 1.1)) * 100)} min={65} max={160} format={(v) => `${Math.round(v)}%`} onChange={(contentScale) => patch({ contentScale: contentScale / 100 })} />
    </div>
  );
}

function GithubFields({ doc, setDoc }: { doc: GithubDoc; setDoc: (d: ScreenDoc) => void }) {
  const cells = doc.cells && doc.cells.length === 371 ? doc.cells : githubCells(doc);
  const [fetching, setFetching] = useState(false);
  const runFetch = async () => {
    if (fetching || !doc.login.trim()) return;
    setFetching(true);
    try {
      const r = await fetchGithubContributions(doc.login, doc.range === "calendar-year" ? doc.year : "last");
      setDoc({ ...doc, cells: r.cells, contributions: r.contributions, login: r.login });
      toast(`Loaded @${r.login}'s real graph ✨`);
    } catch (e) {
      toast(e instanceof Error ? e.message : "Fetch failed");
    } finally {
      setFetching(false);
    }
  };
  return (
    <>
      <ChartCardSizeFields doc={doc} setDoc={setDoc} />
      <div className="flex gap-2">
        <Field label="Name" value={doc.name} onChange={(name) => setDoc({ ...doc, name })} className="flex-1" />
        <Field label="Username" value={doc.login} onChange={(login) => setDoc({ ...doc, login })} className="flex-1" />
      </div>
      {/* pull the user's REAL last-year heatmap (PostSpark /github-contributions) */}
      <button
        onClick={runFetch}
        disabled={fetching || !doc.login.trim()}
        className="fk-press mt-2 w-full rounded-lg border border-[#e4e4ec] bg-white py-1.5 text-[11px] font-semibold text-[#17171c] hover:border-[#17171c] disabled:opacity-40"
      >
        {fetching ? "Fetching…" : `Fetch real graph for @${doc.login.trim() || "…"}`}
      </button>
      <label className="mt-2 block">
        <span className="mb-1 block text-xs text-[#6b6b76]">Bio</span>
        <textarea value={doc.bio ?? ""} rows={2} onChange={(e) => setDoc({ ...doc, bio: e.target.value || undefined })} className="w-full resize-none rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-[11px] text-[#17171c] outline-none focus:border-[#17171c]" />
      </label>
      <div className="mt-2 flex gap-2">
        <Field label="Followers" value={doc.followers ?? ""} onChange={(followers) => setDoc({ ...doc, followers })} className="flex-1" placeholder="1.2k" />
        <Field label="Following" value={doc.following ?? ""} onChange={(following) => setDoc({ ...doc, following })} className="flex-1" placeholder="180" />
      </div>
      <div className="mt-2 flex gap-2">
        <Field label="Contributions" value={doc.contributions} onChange={(contributions) => setDoc({ ...doc, contributions })} className="flex-1" placeholder="1,247" />
        <Field label="Year" value={doc.year} onChange={(year) => setDoc({ ...doc, year })} className="w-20" placeholder="2025" />
      </div>
      <div className="mt-2 flex gap-2">
        <Select
          label="Range"
          value={doc.range ?? "last-year"}
          options={[
            { value: "last-year", label: "Last year" },
            { value: "calendar-year", label: "Calendar year" },
          ]}
          onChange={(range) => setDoc({ ...doc, range: range as GithubDoc["range"], startMonth: range === "calendar-year" ? 0 : doc.startMonth ?? 6 })}
          className="flex-1"
        />
        {(doc.range ?? "last-year") === "last-year" && (
          <Select
            label="Starts"
            value={String(doc.startMonth ?? 6)}
            options={["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"].map((label, index) => ({ value: String(index), label }))}
            onChange={(startMonth) => setDoc({ ...doc, startMonth: Number(startMonth) })}
            className="w-24"
          />
        )}
      </div>
      {doc.standalone && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          <Toggle label="Year rail" on={doc.showYearRail ?? true} onClick={() => setDoc({ ...doc, showYearRail: !(doc.showYearRail ?? true) })} />
          <Toggle label="Settings" on={doc.showSettings ?? true} onClick={() => setDoc({ ...doc, showSettings: !(doc.showSettings ?? true) })} />
          <Toggle label="Legend" on={doc.showLegend ?? true} onClick={() => setDoc({ ...doc, showLegend: !(doc.showLegend ?? true) })} />
          <Toggle label="Learn link" on={doc.showLearnLink ?? true} onClick={() => setDoc({ ...doc, showLearnLink: !(doc.showLearnLink ?? true) })} />
        </div>
      )}
      <GithubPaintGrid cells={cells} onChange={(c) => setDoc({ ...doc, cells: c })} />
      <div className="mt-3">
        <SliderRow label="Graph density" value={Math.round((doc.density ?? 0) * 100)} min={0} max={100} format={(v) => `${Math.round(v)}%`} onChange={(v) => setDoc({ ...doc, density: v / 100, cells: undefined })} />
      </div>
      <div className="mt-3 flex gap-2">
        <button onClick={() => setDoc({ ...doc, seed: Math.floor(Math.random() * 100000), cells: undefined })} className="fk-press flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#e4e4ec] bg-white py-2 text-[11px] font-semibold text-[#17171c] hover:border-[#17171c]">
          <Shuffle size={12} /> Shuffle
        </button>
        {doc.cells && (
          <button onClick={() => setDoc({ ...doc, cells: undefined })} className="fk-press rounded-lg border border-[#e4e4ec] bg-white px-3 py-2 text-[11px] font-semibold text-[#6b6b76] hover:border-[#17171c] hover:text-[#17171c]">
            Reset paint
          </button>
        )}
      </div>
    </>
  );
}

/** Drag the chart line — each point is a handle you pull up or down. */
function SparkEditor({ series, onChange, color }: { series: number[]; onChange: (s: number[]) => void; color: string }) {
  const ref = useRef<SVGSVGElement>(null);
  const [frozenDm, setFrozenDm] = useState<number | null>(null);
  const W = 288;
  const H = 116;
  const PAD = 12;
  const plotW = W - PAD * 2;
  const plotH = H - PAD * 2;
  const n = series.length;
  const domainMax = frozenDm ?? Math.max(10, ...series) * 1.25;
  const seriesRef = useRef(series);
  seriesRef.current = series;
  const xAt = (i: number) => PAD + (n <= 1 ? 0 : (i / (n - 1)) * plotW);
  const yAt = (v: number) => PAD + plotH - (Math.min(Math.max(v, 0), domainMax) / domainMax) * plotH;
  const path = series.map((v, i) => `${i ? "L" : "M"}${xAt(i).toFixed(1)} ${yAt(v).toFixed(1)}`).join(" ");
  const beginDrag = (i: number) => (e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const dm = Math.max(10, ...seriesRef.current) * 1.25;
    setFrozenDm(dm);
    const move = (ev: PointerEvent) => {
      if (!ref.current) return;
      const r = ref.current.getBoundingClientRect();
      const rel = (ev.clientY - r.top) / r.height; // 0 top .. 1 bottom (viewBox maps 1:1)
      const relPlot = (rel * H - PAD) / plotH;
      const v = Math.max(0, Math.min(dm, dm * (1 - relPlot)));
      onChange(seriesRef.current.map((sv, j) => (j === i ? Math.round(v * 10) / 10 : sv)));
    };
    const up = () => {
      setFrozenDm(null);
      window.removeEventListener("pointermove", move);
      window.removeEventListener("pointerup", up);
    };
    window.addEventListener("pointermove", move);
    window.addEventListener("pointerup", up);
  };
  return (
    <div className="mt-3">
      <span className="mb-1.5 block text-xs text-[#6b6b76]">Drag the line to shape it</span>
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="w-full touch-none rounded-lg border border-[#e4e4ec] bg-white" style={{ height: 124 }}>
        <path d={`${path} L ${xAt(n - 1).toFixed(1)} ${(H - PAD).toFixed(1)} L ${PAD} ${(H - PAD).toFixed(1)} Z`} fill={color} opacity={0.12} />
        <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
        {series.map((v, i) => (
          <circle key={i} cx={xAt(i)} cy={yAt(v)} r={5.5} fill="#fff" stroke={color} strokeWidth={2} style={{ cursor: "ns-resize" }} onPointerDown={beginDrag(i)} />
        ))}
      </svg>
    </div>
  );
}

/** A pleasant, upward-drifting random series for the Stripe chart shuffle. */
function genStripeSeries(n = 28): number[] {
  const out: number[] = [];
  let v = 8 + Math.random() * 4;
  for (let i = 0; i < n; i++) {
    v += (Math.random() - 0.32) * 3 + 0.6;
    out.push(Math.max(1, Math.round(v * 10) / 10));
  }
  return out;
}

function StripeFields({ doc, setDoc }: { doc: StripeDoc; setDoc: (d: ScreenDoc) => void }) {
  return (
    <>
      <ChartCardSizeFields doc={doc} setDoc={setDoc} />
      <div className="flex gap-2">
        <Field label="Metric" value={doc.metric} onChange={(metric) => setDoc({ ...doc, metric })} className="flex-1" placeholder="Gross volume" />
        <label className="w-16 shrink-0">
          <span className="mb-1 block text-xs text-[#6b6b76]">Color</span>
          <input type="color" value={doc.color ?? "#635bff"} onChange={(e) => setDoc({ ...doc, color: e.target.value })} className="h-9 w-full cursor-pointer rounded-lg border border-[#e4e4ec]" />
        </label>
      </div>
      <div className="mt-2 flex gap-2">
        <Field label="Amount" value={doc.amount} onChange={(amount) => setDoc({ ...doc, amount })} className="flex-1" placeholder="$24,392.81" />
        <Field label="Delta" value={doc.delta} onChange={(delta) => setDoc({ ...doc, delta })} className="w-24" placeholder="12.4%" />
      </div>
      <div className="mt-3 flex items-end gap-2">
        <Field label="Range" value={doc.range} onChange={(range) => setDoc({ ...doc, range })} className="flex-1" placeholder="Last 7 days" />
        <Toggle label={doc.deltaUp === false ? "▼ Down" : "▲ Up"} on={doc.deltaUp !== false} onClick={() => setDoc({ ...doc, deltaUp: doc.deltaUp === false })} />
      </div>
      <SparkEditor series={doc.series} onChange={(series) => setDoc({ ...doc, series })} color={doc.color ?? "#635bff"} />
      <div className="mt-2 flex items-center gap-2">
        <button onClick={() => setDoc({ ...doc, series: genStripeSeries(), prevSeries: doc.prevSeries ? genStripeSeries().map((v) => v * 0.8) : undefined })} className="fk-press flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-[#e4e4ec] bg-white py-2 text-[11px] font-semibold text-[#17171c] hover:border-[#17171c]">
          <Shuffle size={12} /> Shuffle chart
        </button>
        <Toggle label="Compare line" on={!!doc.prevSeries} onClick={() => setDoc({ ...doc, prevSeries: doc.prevSeries ? undefined : doc.series.map((v) => v * 0.8) })} />
      </div>
      <details className="mt-2">
        <summary className="cursor-pointer text-[11px] text-[#9a9aa4]">Edit data as numbers</summary>
        <textarea value={doc.series.join(", ")} rows={2} onChange={(e) => setDoc({ ...doc, series: e.target.value.split(",").map((s) => parseFloat(s.trim())).filter((n) => !isNaN(n)) })} className="mt-1.5 w-full resize-none rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-[11px] tabular-nums text-[#17171c] outline-none focus:border-[#17171c]" />
      </details>
    </>
  );
}

function TikTokFields({ doc, setDoc }: { doc: TikTokDoc; setDoc: (d: ScreenDoc) => void }) {
  const patchAt = (i: number, p: Partial<TikTokDoc["comments"][number]>) =>
    setDoc({ ...doc, comments: doc.comments.map((cm, j) => (j === i ? { ...cm, ...p } : cm)) });
  return (
    <>
      <Field label="Comment count (header)" value={doc.count} onChange={(count) => setDoc({ ...doc, count })} className="w-32" />
      <div className="mt-3">
        <span className="mb-1 block text-xs text-[#6b6b76]">Comments</span>
        <div className="flex flex-col gap-2">
          {doc.comments.map((cm, i) => (
            <div key={i} className="rounded-xl border border-[#ececf2] p-1.5">
              <div className="mb-1.5 flex items-center gap-1.5">
                <AvatarUploadButton value={cm.avatar} onChange={(avatar) => patchAt(i, { avatar })} />
                <input
                  value={cm.user}
                  placeholder="username"
                  onChange={(e) => patchAt(i, { user: e.target.value })}
                  className="min-w-0 flex-1 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] font-medium outline-none focus:border-[#17171c]"
                />
                <input
                  title="Time"
                  value={cm.time}
                  onChange={(e) => patchAt(i, { time: e.target.value })}
                  className="w-10 shrink-0 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#17171c]"
                />
                <input
                  title="Likes"
                  type="number"
                  min={0}
                  value={cm.likes}
                  onChange={(e) => patchAt(i, { likes: Math.max(0, Number(e.target.value) || 0) })}
                  className="w-14 shrink-0 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] tabular-nums outline-none focus:border-[#17171c]"
                />
                <button
                  title="Remove comment"
                  onClick={() => setDoc({ ...doc, comments: doc.comments.filter((_, j) => j !== i) })}
                  className="fk-press shrink-0 rounded-md p-1 text-[#b0b0ba] hover:bg-black/6 hover:text-[#17171c]"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <div className="flex items-center gap-1.5">
                <input
                  value={cm.text}
                  placeholder="comment text"
                  onChange={(e) => patchAt(i, { text: e.target.value })}
                  className="min-w-0 flex-1 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#17171c]"
                />
                <button
                  title="Liked by creator"
                  onClick={() => patchAt(i, { creatorLiked: !cm.creatorLiked })}
                  className={`fk-press shrink-0 rounded-md border px-1.5 py-1 text-[11px] ${
                    cm.creatorLiked ? "border-[#fe2c55] text-[#fe2c55]" : "border-[#e4e4ec] text-[#b0b0ba]"
                  }`}
                >
                  ♥
                </button>
              </div>
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            setDoc({ ...doc, comments: [...doc.comments, { user: "", text: "", time: "1h", likes: 0 }] })
          }
          className="fk-press mt-2 w-full rounded-lg border border-dashed border-[#c9c9d4] py-1.5 text-[11px] font-semibold text-[#6b6b76] hover:border-[#17171c] hover:text-[#17171c]"
        >
          + Add comment
        </button>
      </div>
    </>
  );
}

/** Comments/replies editor for X post & Social post. */
function CommentRows({ comments, onChange, handles }: { comments: PostComment[]; onChange: (c: PostComment[]) => void; handles?: boolean }) {
  const patchAt = (i: number, p: Partial<PostComment>) => onChange(comments.map((c, j) => (j === i ? { ...c, ...p } : c)));
  return (
    <div className="mt-3">
      <span className="mb-1 block text-xs text-[#6b6b76]">Comments</span>
      <div className="flex flex-col gap-2">
        {comments.map((cm, i) => (
          <div key={i} className="rounded-xl border border-[#ececf2] p-1.5">
            <div className="mb-1.5 flex items-center gap-1.5">
              <AvatarUploadButton value={cm.avatar} onChange={(avatar) => patchAt(i, { avatar })} />
              <input
                value={cm.user}
                placeholder="name"
                onChange={(e) => patchAt(i, { user: e.target.value })}
                className="min-w-0 flex-1 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] font-medium outline-none focus:border-[#17171c]"
              />
              <input value={cm.time ?? ""} placeholder="1h" onChange={(e) => patchAt(i, { time: e.target.value })} className="w-10 shrink-0 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#17171c]" />
              <input type="number" min={0} value={cm.likes ?? 0} onChange={(e) => patchAt(i, { likes: Math.max(0, Number(e.target.value) || 0) })} className="w-12 shrink-0 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] tabular-nums outline-none focus:border-[#17171c]" />
              {handles && (
                <button title="Verified" onClick={() => patchAt(i, { verified: !cm.verified })} className={`fk-press shrink-0 rounded-md border px-1.5 py-1 text-[11px] ${cm.verified ? "border-[#1d9bf0] text-[#1d9bf0]" : "border-[#e4e4ec] text-[#b0b0ba]"}`}>✓</button>
              )}
              <button title="Remove comment" onClick={() => onChange(comments.filter((_, j) => j !== i))} className="fk-press shrink-0 rounded-md p-1 text-[#b0b0ba] hover:bg-black/6 hover:text-[#17171c]">
                <Trash2 size={12} />
              </button>
            </div>
            <input
              value={cm.text}
              placeholder="comment text"
              onChange={(e) => patchAt(i, { text: e.target.value })}
              className="w-full rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#17171c]"
            />
          </div>
        ))}
      </div>
      <button
        onClick={() => onChange([...comments, { user: "", text: "", time: "1h", likes: 0 }])}
        className="fk-press mt-2 w-full rounded-lg border border-dashed border-[#c9c9d4] py-1.5 text-[11px] font-semibold text-[#6b6b76] hover:border-[#17171c] hover:text-[#17171c]"
      >
        + Add comment
      </button>
    </div>
  );
}

/* ------------------------------- Social post --------------------------------- */

const SOCIAL_NETS: SocialNetwork[] = ["facebook", "linkedin", "threads"];

function SocialFields({ doc, setDoc }: { doc: SocialPostDoc; setDoc: (d: ScreenDoc) => void }) {
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const networkOptions = Array.from(new Set<SocialNetwork>([doc.network, ...SOCIAL_NETS]));
  const runImport = async () => {
    if (!importUrl.trim() || importing) return;
    setImporting(true);
    try {
      const fields = await importPostUrl(importUrl);
      setDoc({ ...doc, ...fields, standalone: doc.standalone });
      setImportUrl("");
      toast("Post imported into a MockFrame card");
    } catch (error) {
      toast(error instanceof Error ? error.message : "Post import failed");
    } finally {
      setImporting(false);
    }
  };
  return (
    <>
      <div className="mb-3 rounded-xl border border-[#dedee8] bg-[#f8f8fb] p-2.5">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#777783]">Paste a public post URL</span>
        <div className="flex gap-1.5">
          <input
            value={importUrl}
            placeholder="X, Bluesky, Threads, LinkedIn or Mastodon"
            onChange={(event) => setImportUrl(event.target.value)}
            onKeyDown={(event) => event.key === "Enter" && runImport()}
            className="min-w-0 flex-1 rounded-lg border border-[#e0e0e8] bg-white px-2 py-2 text-[10.5px] text-[#17171c] outline-none focus:border-[#7c3aed]"
          />
          <button type="button" onClick={runImport} disabled={importing || !importUrl.trim()} className="fk-press rounded-lg bg-[#17171c] px-3 py-2 text-[10.5px] font-semibold text-white disabled:opacity-40">{importing ? "Importing" : "Import"}</button>
        </div>
        <p className="mt-1.5 text-[9.5px] leading-4 text-[#9999a3]">Public posts only. The result uses MockFrame&apos;s own card design.</p>
      </div>
      {doc.standalone && <PostLayoutControls doc={doc} setDoc={setDoc} />}
      <span className="mb-1 block text-xs text-[#6b6b76]">Network</span>
      <Seg
        id="so-net"
        options={networkOptions.map((n) => ({ value: n, label: SOCIAL_LABELS[n] }))}
        value={doc.network}
        onChange={(network) => setDoc({ ...doc, network })}
      />
      <div className="flex gap-2">
        <Field label="Name" value={doc.name} onChange={(name) => setDoc({ ...doc, name })} className="flex-1" />
        <Field label="Time" value={doc.time} onChange={(time) => setDoc({ ...doc, time })} className="w-20" />
      </div>
      <div className="mt-3">
        <Field
          label={doc.network === "linkedin" ? "Headline" : doc.network === "threads" ? "@handle" : "Subtitle (optional)"}
          value={doc.subtitle}
          onChange={(subtitle) => setDoc({ ...doc, subtitle })}
        />
      </div>
      <div className="mt-3 mb-1 flex items-center justify-between">
        <span className="text-xs text-[#6b6b76]">Post text</span>
        <Toggle label="Verified" on={!!doc.verified} onClick={() => setDoc({ ...doc, verified: !doc.verified })} />
      </div>
      <textarea
        value={doc.text}
        rows={4}
        onChange={(e) => setDoc({ ...doc, text: e.target.value })}
        className="mb-3 w-full resize-none rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-xs text-[#17171c] outline-none focus:border-[#17171c]"
      />
      <div className="flex gap-2">
        {(
          [
            ["Likes", "likes"],
            ["Comments", "comments"],
            ["Shares", "shares"],
          ] as const
        ).map(([label, key]) => (
          <NumField key={key} label={label} value={doc[key]} onChange={(n) => setDoc({ ...doc, [key]: n })} />
        ))}
      </div>
      <CommentRows comments={doc.commentList ?? []} onChange={(commentList) => setDoc({ ...doc, commentList })} />
    </>
  );
}

/* ----------------------------------- X post ---------------------------------- */

function PostLayoutControls({
  doc,
  setDoc,
}: {
  doc: XPostDoc | BlueskyDoc | SocialPostDoc;
  setDoc: (d: ScreenDoc) => void;
}) {
  const scene = useSceneStore((s) => s.scene);
  const setScene = useSceneStore((s) => s.setScene);
  const presets = [
    { label: "Compact", cardWidth: 520, postFontSize: 17, postPadding: 14 },
    { label: "Readable", cardWidth: 420, postFontSize: 24, postPadding: 20 },
    { label: "Story", cardWidth: 340, postFontSize: 28, postPadding: 26 },
  ];
  const sizes = [
    { label: "1:1", width: 1080, height: 1080 },
    { label: "4:5", width: 1080, height: 1350 },
    { label: "9:16", width: 1080, height: 1920 },
  ];
  const patch = (values: Partial<Pick<XPostDoc, "cardWidth" | "postFontSize" | "postPadding" | "cardRadius" | "cardShadow">>) => setDoc({ ...doc, ...values });
  const setCanvas = (width: number, height: number) => {
    setScene((current) => ({ ...current, canvas: { ...current.canvas, width, height } }));
    window.dispatchEvent(new CustomEvent("framekit:fit"));
  };

  return (
    <div className="mb-3 rounded-xl border border-[#e5e5ed] bg-[#fafafc] p-2.5">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-[#8f8f9a]">Post layout</span>
        <div className="flex gap-1">
          {sizes.map((size) => (
            <button
              key={size.label}
              type="button"
              onClick={() => setCanvas(size.width, size.height)}
              className={`fk-press rounded-md px-2 py-1 text-[10px] font-semibold ${scene.canvas.width === size.width && scene.canvas.height === size.height ? "bg-[#17171c] text-white" : "bg-white text-[#6b6b76] ring-1 ring-[#e1e1e8]"}`}
            >
              {size.label}
            </button>
          ))}
        </div>
      </div>
      <div className="mb-2 grid grid-cols-3 gap-1.5">
        {presets.map((preset) => {
          const active = (doc.cardWidth ?? 402) === preset.cardWidth && (doc.postFontSize ?? (doc.app === "xpost" ? 21 : 18)) === preset.postFontSize && (doc.postPadding ?? 16) === preset.postPadding;
          return (
            <button
              key={preset.label}
              type="button"
              onClick={() => patch(preset)}
              className={`fk-press rounded-lg border px-2 py-1.5 text-[10.5px] font-semibold ${active ? "border-[#17171c] bg-[#17171c] text-white" : "border-[#e2e2e9] bg-white text-[#5f5f6a] hover:border-[#bdbdc8]"}`}
            >
              {preset.label}
            </button>
          );
        })}
      </div>
      {doc.standalone && (
        <SliderRow label="Card width" value={doc.cardWidth ?? 402} min={300} max={620} step={2} format={(value) => `${Math.round(value)}px`} onChange={(cardWidth) => patch({ cardWidth: Math.round(cardWidth) })} />
      )}
      <SliderRow label="Text size" value={doc.postFontSize ?? (doc.app === "xpost" ? 21 : 18)} min={14} max={34} step={1} format={(value) => `${Math.round(value)}px`} onChange={(postFontSize) => patch({ postFontSize: Math.round(postFontSize) })} />
      <SliderRow label="Padding" value={doc.postPadding ?? 16} min={8} max={40} step={1} format={(value) => `${Math.round(value)}px`} onChange={(postPadding) => patch({ postPadding: Math.round(postPadding) })} />
      {doc.standalone && (
        <>
          <SliderRow label="Roundness" value={doc.cardRadius ?? 15} min={0} max={40} step={1} format={(value) => `${Math.round(value)}px`} onChange={(cardRadius) => patch({ cardRadius: Math.round(cardRadius) })} />
          <SliderRow label="Shadow" value={doc.cardShadow ?? 1} min={0} max={2} step={0.05} format={(value) => (value < 0.05 ? "None" : `${value.toFixed(2)}×`)} onChange={(cardShadow) => patch({ cardShadow: Math.round(cardShadow * 20) / 20 })} />
        </>
      )}
    </div>
  );
}

function XPostFields({ doc, setDoc }: { doc: XPostDoc; setDoc: (d: ScreenDoc) => void }) {
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const runImport = async () => {
    if (!importUrl.trim() || importing) return;
    setImporting(true);
    try {
      const fields = await importXPost(importUrl.trim());
      setDoc({ ...doc, ...fields });
      toast("Post imported ✨");
      setImportUrl("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };
  return (
    <>
      {/* import a real post by URL — via our /api/xpost proxy */}
      <div className="mb-3 rounded-xl border border-[#ececf2] bg-[#fafafc] p-2">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#9a9aa4]">Import from URL</span>
        <div className="flex gap-1.5">
          <input
            value={importUrl}
            placeholder="x.com/…/status/…"
            onChange={(e) => setImportUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runImport()}
            className="min-w-0 flex-1 rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-[11px] text-[#17171c] outline-none focus:border-[#17171c]"
          />
          <button
            onClick={runImport}
            disabled={importing || !importUrl.trim()}
            className="fk-press rounded-lg bg-[#17171c] px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
          >
            {importing ? "…" : "Import"}
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <Field label="Name" value={doc.name} onChange={(name) => setDoc({ ...doc, name })} className="flex-1" />
        <Field label="Handle" value={doc.handle} onChange={(handle) => setDoc({ ...doc, handle: handle.replace(/^@/, "") })} className="w-28" />
      </div>
      <div className="mt-3">
        <span className="mb-1 block text-xs text-[#6b6b76]">Verified badge</span>
        <Seg
          id="x-badge"
          options={[
            { value: "none", label: "None" },
            { value: "blue", label: "Blue" },
            { value: "gold", label: "Gold" },
          ]}
          value={doc.badge}
          onChange={(badge) => setDoc({ ...doc, badge })}
        />
      </div>
      <label className="mb-3 block">
        <span className="mb-1 block text-xs text-[#6b6b76]">Post text</span>
        <textarea
          value={doc.text}
          rows={3}
          onChange={(e) => setDoc({ ...doc, text: e.target.value })}
          className="w-full resize-none rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-xs text-[#17171c] outline-none focus:border-[#17171c]"
        />
      </label>
      <PostLayoutControls doc={doc} setDoc={setDoc} />
      <div className="flex gap-2">
        <Field label="Date" value={doc.date} onChange={(date) => setDoc({ ...doc, date })} className="flex-1" />
        <Field label="Views" value={doc.views} onChange={(views) => setDoc({ ...doc, views })} className="w-20" />
      </div>
      <div className="mt-3 flex gap-2">
        {(
          [
            ["Replies", "replies"],
            ["Reposts", "reposts"],
            ["Likes", "likes"],
          ] as const
        ).map(([label, key]) => (
          <NumField key={key} label={label} value={doc[key]} onChange={(n) => setDoc({ ...doc, [key]: n })} />
        ))}
      </div>
      <div className="mt-3">
        <span className="mb-1 block text-xs text-[#6b6b76]">Theme</span>
        <Seg
          id="x-theme"
          options={[
            { value: "light", label: "Light" },
            { value: "dim", label: "Dim" },
            { value: "dark", label: "Dark" },
          ]}
          value={doc.theme}
          onChange={(theme) => setDoc({ ...doc, theme })}
        />
      </div>
      <PhotoGridField images={doc.images ?? []} onChange={(images) => setDoc({ ...doc, images: images.length ? images : undefined })} />
      <CommentRows handles comments={doc.comments ?? []} onChange={(comments) => setDoc({ ...doc, comments })} />
    </>
  );
}

/** Up to 4 photos → the X media grid. Compact thumbnail row with add/remove. */
function PhotoGridField({ images, onChange }: { images: string[]; onChange: (ids: string[]) => void }) {
  const fileRef = useRef<HTMLInputElement>(null);
  return (
    <div className="mt-3">
      <span className="mb-1.5 block text-xs text-[#6b6b76]">
        Photos <span className="ml-1 text-[10px] text-[#b0b0ba]">up to 4 · media grid</span>
      </span>
      <div className="flex flex-wrap gap-1.5">
        {images.map((id, i) => {
          const url = resolveAsset(id)?.url;
          return (
            <div key={i} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="h-12 w-12 rounded-lg border border-[#e4e4ec] object-cover" />
              <button
                title="Remove"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-[#17171c] text-white"
              >
                <X size={9} />
              </button>
            </div>
          );
        })}
        {images.length < 4 && (
          <button
            onClick={() => fileRef.current?.click()}
            className="fk-press grid h-12 w-12 place-items-center rounded-lg border border-dashed border-[#c9c9d4] bg-[#f7f7fb] text-[#9a9aa4] hover:border-[#17171c] hover:text-[#17171c]"
          >
            <ImagePlus size={14} />
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          const a = await ingestFile(f);
          onChange([...images, a.id].slice(0, 4));
          e.target.value = "";
        }}
      />
    </div>
  );
}

/* --------------------------------- Bluesky ----------------------------------- */

function BlueskyFields({ doc, setDoc }: { doc: BlueskyDoc; setDoc: (d: ScreenDoc) => void }) {
  const [importUrl, setImportUrl] = useState("");
  const [importing, setImporting] = useState(false);
  const runImport = async () => {
    if (!importUrl.trim() || importing) return;
    setImporting(true);
    try {
      const fields = await importBlueskyPost(importUrl.trim());
      setDoc({ ...doc, ...fields });
      toast("Post imported ✨");
      setImportUrl("");
    } catch (e) {
      toast(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };
  const toggleLink = () =>
    setDoc({
      ...doc,
      link: doc.link
        ? undefined
        : { title: "The Engagement Is Better on Bluesky - Bluesky", desc: "Bluesky is the lobby to the open web.", domain: "bsky.social" },
    });
  return (
    <>
      {/* import a real post by URL — PostSpark parity, via Bluesky's public API */}
      <div className="mb-3 rounded-xl border border-[#ececf2] bg-[#fafafc] p-2">
        <span className="mb-1 block text-[10px] font-semibold uppercase tracking-wider text-[#9a9aa4]">Import from URL</span>
        <div className="flex gap-1.5">
          <input
            value={importUrl}
            placeholder="bsky.app/profile/…/post/…"
            onChange={(e) => setImportUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && runImport()}
            className="min-w-0 flex-1 rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-[11px] text-[#17171c] outline-none focus:border-[#17171c]"
          />
          <button
            onClick={runImport}
            disabled={importing || !importUrl.trim()}
            className="fk-press rounded-lg bg-[#17171c] px-2.5 py-1.5 text-[11px] font-semibold text-white disabled:opacity-40"
          >
            {importing ? "…" : "Import"}
          </button>
        </div>
      </div>
      <div className="flex gap-2">
        <Field label="Name" value={doc.name} onChange={(name) => setDoc({ ...doc, name })} className="flex-1" />
        <Field label="Handle" value={doc.handle} onChange={(handle) => setDoc({ ...doc, handle: handle.replace(/^@/, "") })} className="w-32" />
      </div>
      <label className="mb-0 mt-3 block">
        <span className="mb-1 block text-xs text-[#6b6b76]">Post text</span>
        <textarea
          value={doc.text}
          rows={4}
          onChange={(e) => setDoc({ ...doc, text: e.target.value })}
          className="w-full resize-none rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-xs text-[#17171c] outline-none focus:border-[#17171c]"
        />
      </label>
      <div className="mt-3">
        <PostLayoutControls doc={doc} setDoc={setDoc} />
      </div>
      <Field label="Timestamp" value={doc.time} onChange={(time) => setDoc({ ...doc, time })} className="mt-3" />
      <div className="mt-3 flex gap-2">
        {(
          [
            ["Replies", "replies"],
            ["Reposts", "reposts"],
            ["Likes", "likes"],
          ] as const
        ).map(([label, key]) => (
          <NumField key={key} label={label} value={doc[key]} onChange={(n) => setDoc({ ...doc, [key]: n })} />
        ))}
      </div>
      <div className="mt-3 flex items-center justify-between rounded-lg border border-[#ececf2] bg-[#fafafc] px-2.5 py-2">
        <span className="text-xs font-medium text-[#17171c]">Embedded link card</span>
        <button
          onClick={toggleLink}
          className={`fk-press rounded-lg px-2.5 py-1 text-[11px] font-semibold ${doc.link ? "bg-[#17171c] text-white" : "border border-[#e4e4ec] bg-white text-[#6b6b76]"}`}
        >
          {doc.link ? "On" : "Off"}
        </button>
      </div>
      {doc.link && (
        <div className="mt-2 rounded-xl border border-[#ececf2] bg-[#fafafc] p-2.5">
          <MediaUploadField label="Card image" value={doc.link.image} onChange={(image) => setDoc({ ...doc, link: { ...doc.link!, image } })} hint="else Bluesky gradient" />
          <Field label="Title" value={doc.link.title} onChange={(title) => setDoc({ ...doc, link: { ...doc.link!, title } })} className="mt-2" />
          <Field label="Description" value={doc.link.desc} onChange={(desc) => setDoc({ ...doc, link: { ...doc.link!, desc } })} className="mt-2" />
          <Field label="Domain" value={doc.link.domain} onChange={(domain) => setDoc({ ...doc, link: { ...doc.link!, domain } })} className="mt-2" />
        </div>
      )}
    </>
  );
}

/* ----------------------------------- Code ------------------------------------ */

const CODE_THEME_KEYS = Object.keys(CODE_THEME_LABELS);
const CODE_FONT_KEYS = Object.keys(CODE_FONT_LABELS);
const CODE_LANGS = ["diff", "tsx", "jsx", "typescript", "javascript", "python", "rust", "go", "php", "java", "c", "cpp", "ruby", "swift", "kotlin", "html", "css", "json", "bash", "sql"];

function CodeFields({ doc, setDoc }: { doc: CodeDoc; setDoc: (d: ScreenDoc) => void }) {
  return (
    <>
      <label className="mb-0 block">
        <span className="mb-1 block text-xs text-[#6b6b76]">Code</span>
        <textarea
          value={doc.code}
          rows={8}
          spellCheck={false}
          onChange={(e) => setDoc({ ...doc, code: e.target.value })}
          className="w-full resize-y rounded-lg border border-[#e4e4ec] bg-[#fbfbfd] px-2 py-1.5 font-mono text-[11px] leading-relaxed text-[#17171c] outline-none focus:border-[#17171c]"
        />
      </label>
      <div className="mt-3 flex gap-2">
        <Field label="Filename" value={doc.filename} onChange={(filename) => setDoc({ ...doc, filename })} className="flex-1" />
        <Select
          label="Language"
          value={doc.language}
          options={CODE_LANGS.map((l) => ({ value: l, label: l }))}
          onChange={(language) => setDoc({ ...doc, language, diffHighlight: language === "diff" ? true : doc.diffHighlight })}
          className="w-28"
        />
      </div>
      <div className="mt-3 flex gap-2">
        <Select
          label="Syntax theme"
          value={doc.theme}
          options={CODE_THEME_KEYS.map((k) => ({ value: k, label: CODE_THEME_LABELS[k] }))}
          onChange={(theme) => setDoc({ ...doc, theme })}
          className="flex-1"
        />
        <Select
          label="Font"
          value={doc.codeFont}
          options={CODE_FONT_KEYS.map((k) => ({ value: k, label: CODE_FONT_LABELS[k] }))}
          onChange={(codeFont) => setDoc({ ...doc, codeFont })}
          className="flex-1"
        />
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="flex-1">
          <SliderRow label="Font size" value={doc.fontSize ?? 13} min={10} max={18} format={(v) => `${Math.round(v)}px`} onChange={(fontSize) => setDoc({ ...doc, fontSize: Math.round(fontSize) })} />
        </div>
      </div>
      <label className="mt-3 flex cursor-pointer items-center justify-between rounded-lg border border-[#ececf2] bg-[#fafafc] px-2.5 py-2">
        <span className="text-xs font-medium text-[#17171c]">Line numbers</span>
        <input type="checkbox" checked={!!doc.lineNumbers} onChange={(e) => setDoc({ ...doc, lineNumbers: e.target.checked })} className="h-4 w-4 accent-[#17171c]" />
      </label>
      <label className="mt-2 flex cursor-pointer items-center justify-between rounded-lg border border-[#ececf2] bg-[#fafafc] px-2.5 py-2">
        <span>
          <span className="block text-xs font-medium text-[#17171c]">Diff highlighting</span>
          <span className="block text-[10px] text-[#92929d]">Color +, -, and @@ lines</span>
        </span>
        <input type="checkbox" checked={!!doc.diffHighlight} onChange={(e) => setDoc({ ...doc, diffHighlight: e.target.checked })} className="h-4 w-4 accent-[#17171c]" />
      </label>
    </>
  );
}

/* ---------------------------------- AI chat ---------------------------------- */

const AI_MODELS: AiModel[] = ["chatgpt", "claude", "gemini", "grok", "perplexity"];

/** Tool / research / artifact cards under an assistant turn (Claude-style). */
function AiCardEditor({ cards, onChange }: { cards: AiCard[]; onChange: (c: AiCard[]) => void }) {
  const label = (cd: AiCard) => (cd.kind === "tool" ? cd.label : cd.title);
  const setLabel = (cd: AiCard, v: string): AiCard => (cd.kind === "tool" ? { ...cd, label: v } : { ...cd, title: v });
  return (
    <div className="mt-1.5">
      {cards.map((cd, i) => (
        <div key={i} className="mb-1 flex items-center gap-1">
          <span className="w-12 shrink-0 text-[8.5px] font-bold uppercase tracking-wide text-[#9a9aa4]">{cd.kind}</span>
          <input
            value={label(cd)}
            onChange={(e) => onChange(cards.map((c, j) => (j === i ? setLabel(c, e.target.value) : c)))}
            className="min-w-0 flex-1 rounded border border-[#e4e4ec] bg-white px-1.5 py-0.5 text-[10.5px] outline-none focus:border-[#17171c]"
          />
          {cd.kind === "research" && (
            <input
              title="Status line"
              value={cd.status}
              onChange={(e) => onChange(cards.map((c, j) => (j === i && c.kind === "research" ? { ...c, status: e.target.value } : c)))}
              className="w-24 shrink-0 rounded border border-[#e4e4ec] bg-white px-1.5 py-0.5 text-[10px] outline-none focus:border-[#17171c]"
            />
          )}
          <button onClick={() => onChange(cards.filter((_, j) => j !== i))} className="fk-press shrink-0 rounded p-0.5 text-[#b0b0ba] hover:text-[#17171c]">
            <X size={11} />
          </button>
        </div>
      ))}
      <div className="mt-1 flex gap-1">
        {(
          [
            ["+ Tool", { kind: "tool", tool: "drive", label: "Searched Google Drive" } as AiCard],
            ["+ Research", { kind: "research", title: "Deep research", status: "Research complete · 120 sources · 2m 10s" } as AiCard],
            ["+ Doc", { kind: "artifact", title: "New document", subtitle: "Document" } as AiCard],
          ] as const
        ).map(([label2, card]) => (
          <button key={label2} onClick={() => onChange([...cards, card])} className="fk-press rounded border border-dashed border-[#c9c9d4] px-2 py-0.5 text-[10px] font-semibold text-[#6b6b76] hover:border-[#17171c] hover:text-[#17171c]">
            {label2}
          </button>
        ))}
      </div>
    </div>
  );
}

function AiFields({ doc, setDoc }: { doc: AiChatDoc; setDoc: (d: ScreenDoc) => void }) {
  const patchAt = (i: number, text: string) =>
    setDoc({ ...doc, messages: doc.messages.map((m, j) => (j === i ? { ...m, text } : m)) });
  const patchCards = (i: number, cards: AiCard[]) =>
    setDoc({ ...doc, messages: doc.messages.map((m, j) => (j === i ? { ...(m as AiMessage), cards } : m)) });
  return (
    <>
      <span className="mb-1 block text-xs text-[#6b6b76]">Model</span>
      <div className="mb-3 grid grid-cols-3 gap-1.5">
        {AI_MODELS.map((m) => (
          <button
            key={m}
            onClick={() => setDoc({ ...doc, model: m })}
            className={`fk-press rounded-lg px-1 py-1.5 text-[11px] font-semibold ${
              doc.model === m ? "bg-[#17171c] text-white" : "border border-[#e4e4ec] bg-white text-[#6b6b76]"
            }`}
          >
            {AI_MODEL_LABELS[m]}
          </button>
        ))}
      </div>
      <Field
        label="Header title (optional)"
        value={doc.title ?? ""}
        placeholder={AI_MODEL_LABELS[doc.model]}
        onChange={(title) => setDoc({ ...doc, title: title || undefined })}
      />
      <div className="mt-3">
        <span className="mb-1 block text-xs text-[#6b6b76]">
          Turns <em className="not-italic text-[#b0b0ba]">· assistant supports **bold**, `code`, ```blocks```, - bullets</em>
        </span>
        <div className="flex flex-col gap-2">
          {doc.messages.map((m, i) => (
            <div key={i} className="rounded-xl border border-[#ececf2] p-1.5">
              <div className="mb-1 flex items-center gap-1.5">
                <button
                  onClick={() =>
                    setDoc({
                      ...doc,
                      messages: doc.messages.map((mm, j) =>
                        j === i ? { ...mm, from: (mm.from === "me" ? "them" : "me") as "me" | "them" } : mm
                      ),
                    })
                  }
                  className={`fk-press rounded-md px-2 py-1 text-[10px] font-bold ${
                    m.from === "me" ? "bg-[#17171c] text-white" : "bg-[#7c3aed] text-white"
                  }`}
                >
                  {m.from === "me" ? "You" : "AI"}
                </button>
                <span className="flex-1" />
                <button
                  title="Remove turn"
                  onClick={() => setDoc({ ...doc, messages: doc.messages.filter((_, j) => j !== i) })}
                  className="fk-press rounded-md p-1 text-[#b0b0ba] hover:bg-black/6 hover:text-[#17171c]"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <textarea
                value={m.text}
                rows={m.from === "me" ? 2 : 4}
                onChange={(e) => patchAt(i, e.target.value)}
                className="w-full resize-none rounded-md border border-[#e4e4ec] bg-white px-2 py-1.5 text-[11px] text-[#17171c] outline-none focus:border-[#17171c]"
              />
              {m.from === "them" && <AiCardEditor cards={(m as AiMessage).cards ?? []} onChange={(cards) => patchCards(i, cards)} />}
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            setDoc({ ...doc, messages: [...doc.messages, { from: doc.messages.at(-1)?.from === "me" ? "them" : "me", text: "" }] })
          }
          className="fk-press mt-2 w-full rounded-lg border border-dashed border-[#c9c9d4] py-1.5 text-[11px] font-semibold text-[#6b6b76] hover:border-[#17171c] hover:text-[#17171c]"
        >
          + Add turn
        </button>
      </div>
    </>
  );
}

/* ----------------------------------- Email ----------------------------------- */

function EmailFields({ doc, setDoc }: { doc: EmailDoc; setDoc: (d: ScreenDoc) => void }) {
  return (
    <>
      <span className="mb-1 block text-xs text-[#6b6b76]">Provider</span>
      <Seg
        id="em-provider"
        options={[
          { value: "gmail", label: "Gmail" },
          { value: "outlook", label: "Outlook" },
          { value: "apple", label: "Mail" },
        ]}
        value={doc.provider}
        onChange={(provider) => setDoc({ ...doc, provider })}
      />
      <Field label="Subject" value={doc.subject} onChange={(subject) => setDoc({ ...doc, subject })} />
      <div className="mt-3 flex gap-2">
        <Field label="Sender" value={doc.sender} onChange={(sender) => setDoc({ ...doc, sender })} className="flex-1" />
        <Field label="Time" value={doc.time} onChange={(time) => setDoc({ ...doc, time })} className="w-24" />
      </div>
      <div className="mt-3">
        <Field label="From address" value={doc.email} onChange={(email) => setDoc({ ...doc, email })} />
      </div>
      <label className="mt-3 mb-2 block">
        <span className="mb-1 block text-xs text-[#6b6b76]">Body <em className="not-italic text-[#b0b0ba]">· blank line = new paragraph</em></span>
        <textarea
          value={doc.body}
          rows={6}
          onChange={(e) => setDoc({ ...doc, body: e.target.value })}
          className="w-full resize-none rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-[11px] text-[#17171c] outline-none focus:border-[#17171c]"
        />
      </label>
      <Toggle label="Starred" on={!!doc.starred} onClick={() => setDoc({ ...doc, starred: !doc.starred })} />
    </>
  );
}

/* ---------------------------------- Discord ---------------------------------- */

function DiscordFields({ doc, setDoc }: { doc: DiscordDoc; setDoc: (d: ScreenDoc) => void }) {
  const patchAt = (i: number, p: Partial<DiscordDoc["messages"][number]>) =>
    setDoc({ ...doc, messages: doc.messages.map((m, j) => (j === i ? { ...m, ...p } : m)) });
  const isDm = doc.mode === "dm";
  return (
    <>
      {isDm ? (
        <>
          <div className="flex gap-2">
            <Field label="Name" value={doc.dmName ?? ""} onChange={(dmName) => setDoc({ ...doc, dmName })} className="flex-1" />
            <Field label="Username" value={doc.dmUsername ?? ""} onChange={(dmUsername) => setDoc({ ...doc, dmUsername })} className="flex-1" />
          </div>
          <div className="mt-3">
            <Field label="Mutual server (optional)" value={doc.mutualServer ?? ""} onChange={(mutualServer) => setDoc({ ...doc, mutualServer })} />
          </div>
        </>
      ) : (
        <div className="flex gap-2">
          <Field label="Server" value={doc.server} onChange={(server) => setDoc({ ...doc, server })} className="flex-1" />
          <Field label="# Channel" value={doc.channel} onChange={(channel) => setDoc({ ...doc, channel })} className="flex-1" />
        </div>
      )}
      <div className="mt-3">
        <span className="mb-1 block text-xs text-[#6b6b76]">Messages</span>
        <div className="flex flex-col gap-2">
          {doc.messages.map((m, i) => (
            <div key={i} className="rounded-xl border border-[#ececf2] p-1.5">
              <div className="mb-1.5 flex items-center gap-1.5">
                <AvatarUploadButton value={m.avatar} onChange={(avatar) => patchAt(i, { avatar })} />
                <input
                  value={m.sender}
                  placeholder="username"
                  onChange={(e) => patchAt(i, { sender: e.target.value })}
                  className="min-w-0 flex-1 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] font-medium outline-none focus:border-[#17171c]"
                />
                <input
                  title="Timestamp"
                  value={m.time}
                  onChange={(e) => patchAt(i, { time: e.target.value })}
                  className="w-16 shrink-0 rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#17171c]"
                />
                <input
                  type="color"
                  title="Name color"
                  value={m.color ?? "#5865f2"}
                  onChange={(e) => patchAt(i, { color: e.target.value })}
                  className="h-6 w-6 shrink-0 cursor-pointer rounded"
                />
                <button
                  title="Remove message"
                  onClick={() => setDoc({ ...doc, messages: doc.messages.filter((_, j) => j !== i) })}
                  className="fk-press shrink-0 rounded-md p-1 text-[#b0b0ba] hover:bg-black/6 hover:text-[#17171c]"
                >
                  <Trash2 size={12} />
                </button>
              </div>
              <input
                value={m.text}
                placeholder="message"
                onChange={(e) => patchAt(i, { text: e.target.value })}
                className="w-full rounded-md border border-[#e4e4ec] bg-white px-1.5 py-1 text-[11px] outline-none focus:border-[#17171c]"
              />
            </div>
          ))}
        </div>
        <button
          onClick={() =>
            setDoc({
              ...doc,
              messages: [...doc.messages, { sender: doc.messages.at(-1)?.sender ?? "user", text: "", time: "9:41 AM" }],
            })
          }
          className="fk-press mt-2 w-full rounded-lg border border-dashed border-[#c9c9d4] py-1.5 text-[11px] font-semibold text-[#6b6b76] hover:border-[#17171c] hover:text-[#17171c]"
        >
          + Add message
        </button>
      </div>
    </>
  );
}

function NumField({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <label className="block flex-1">
      <span className="mb-1 block text-xs text-[#6b6b76]">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-full rounded-lg border border-[#e4e4ec] bg-white px-2 py-1.5 text-xs tabular-nums text-[#17171c] outline-none focus:border-[#17171c]"
      />
    </label>
  );
}

function Toggle({ label, on, onClick }: { label: string; on: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`fk-press flex-1 rounded-lg px-2 py-1.5 text-[11px] font-semibold ${
        on ? "bg-[#17171c] text-white" : "border border-[#e4e4ec] bg-white text-[#6b6b76]"
      }`}
    >
      {label}
    </button>
  );
}
