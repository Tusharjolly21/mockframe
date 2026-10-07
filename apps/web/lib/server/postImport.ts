import { assertPublicUrl } from "./ssrf";

/**
 * Post URL import for the "Post from URL" card. Pure parsers (one per
 * provider, unit-tested against real API shapes) plus a thin fetch layer.
 * Images (avatar + up to four post photos) are downloaded here and returned
 * as data URLs, so the client never needs a per-provider image allowlist and
 * Mastodon instances on any domain work.
 */

export type PostProvider = "x" | "bluesky" | "threads" | "linkedin" | "mastodon";

export interface ImportedPost {
  provider: PostProvider;
  sourceLabel: string;
  sourceUrl: string;
  name: string;
  subtitle: string;
  verified: boolean;
  text: string;
  time: string;
  likes: number;
  comments: number;
  shares: number;
  /** false when the provider doesn't expose counts (Threads, LinkedIn) */
  hasMetrics: boolean;
  /** remote URLs — swapped for data URLs before the response leaves the server */
  avatar?: string;
  images: string[];
}

export class PostImportError extends Error {}

const LABEL: Record<PostProvider, string> = { x: "X", bluesky: "Bluesky", threads: "Threads", linkedin: "LinkedIn", mastodon: "Mastodon" };
const MAX_TEXT = 4000;

/* --------------------------------- helpers ---------------------------------- */

/** HTML → plain text: paragraphs and <br> become newlines, all entities decoded (&amp; last). */
export function htmlToText(value: string): string {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>\s*<p[^>]*>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => safeCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => safeCodePoint(parseInt(dec, 10)))
    .replace(/&nbsp;/gi, " ")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function safeCodePoint(n: number): string {
  try {
    return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
  } catch {
    return "";
  }
}

/** "3:42 PM · Mar 4, 2025" — how X, Bluesky and Mastodon print a post's time. */
export function postTime(value?: string | number): string {
  if (value === undefined || value === null || value === "") return "";
  const date = new Date(typeof value === "number" ? (value < 1e12 ? value * 1000 : value) : value);
  if (Number.isNaN(date.getTime())) return "";
  const time = new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: "UTC" }).format(date);
  const day = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(date);
  return `${time} · ${day}`;
}

const clean = (s: string | undefined | null, max = 120) => (s ?? "").replace(/\s+/g, " ").trim().slice(0, max);
const num = (n: unknown) => (typeof n === "number" && Number.isFinite(n) && n > 0 ? Math.round(n) : 0);

function metaTag(html: string, key: string): string {
  const tags = html.match(/<meta\s+[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attrs: Record<string, string> = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])([\s\S]*?)\2/gi)) attrs[match[1].toLowerCase()] = match[3];
    const k = key.toLowerCase();
    if (attrs.property?.toLowerCase() === k || attrs.name?.toLowerCase() === k) return htmlToText(attrs.content ?? "");
  }
  return "";
}

/* ---------------------------------- routing --------------------------------- */

export type PostTarget =
  | { provider: "x"; id: string; handle: string }
  | { provider: "bluesky"; actor: string; rkey: string }
  | { provider: "threads" | "linkedin"; url: URL }
  | { provider: "mastodon"; url: URL; id: string; acct: string };

const X_HOSTS = new Set(["x.com", "twitter.com", "mobile.twitter.com", "mobile.x.com", "fxtwitter.com", "vxtwitter.com", "fixupx.com", "fixvx.com"]);
const THREADS_HOSTS = new Set(["threads.net", "threads.com"]);

/** Which provider a URL belongs to, or a helpful error. */
export function parsePostUrl(raw: string): PostTarget {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    throw new PostImportError("Paste a complete post link, starting with https://");
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") throw new PostImportError("Paste a public https:// post link");
  if (url.port) throw new PostImportError("Paste a public post link");
  const host = url.hostname.toLowerCase().replace(/^www\./, "");

  if (X_HOSTS.has(host)) {
    const m = url.pathname.match(/^\/([^/]+)\/status(?:es)?\/(\d+)/i) || url.pathname.match(/^\/i\/(?:web\/)?status\/(\d+)/i);
    if (!m) throw new PostImportError("That X link isn't a post — open the post and copy its link");
    return m.length === 3 ? { provider: "x", handle: m[1], id: m[2] } : { provider: "x", handle: "", id: m[1] };
  }
  if (host === "bsky.app") {
    const m = url.pathname.match(/^\/profile\/([^/]+)\/post\/([a-z0-9]+)/i);
    if (!m) throw new PostImportError("That Bluesky link isn't a post — open the post and copy its link");
    let actor: string;
    try {
      actor = decodeURIComponent(m[1]);
    } catch {
      throw new PostImportError("That doesn't look like a Bluesky post link");
    }
    return { provider: "bluesky", actor, rkey: m[2] };
  }
  if (THREADS_HOSTS.has(host)) {
    if (!/^\/@[^/]+\/post\/[\w-]+/i.test(url.pathname)) throw new PostImportError("That Threads link isn't a post — open the post and copy its link");
    return { provider: "threads", url: new URL(`https://www.threads.com${url.pathname}`) };
  }
  if (host === "linkedin.com" || host.endsWith(".linkedin.com")) {
    if (!/^\/(posts|feed\/update|pulse)\//i.test(url.pathname)) throw new PostImportError("That LinkedIn link isn't a public post");
    return { provider: "linkedin", url: new URL(`https://www.linkedin.com${url.pathname}`) };
  }
  const m = url.pathname.match(/^\/@([^/]+)\/(\d+)/) || url.pathname.match(/^\/users\/([^/]+)\/statuses\/(\d+)/);
  if (m) return { provider: "mastodon", url: new URL(`https://${url.host}${url.pathname}`), acct: m[1], id: m[2] };
  throw new PostImportError("Paste a public post from X, Bluesky, Threads, LinkedIn or Mastodon");
}

/* ---------------------------------- parsers --------------------------------- */

type FxTweet = {
  text?: string;
  raw_text?: { text?: string };
  created_timestamp?: number;
  created_at?: string;
  replies?: number;
  retweets?: number;
  likes?: number;
  author?: { name?: string; screen_name?: string; avatar_url?: string; verification?: { verified?: boolean } };
  media?: { photos?: { url?: string }[]; videos?: { thumbnail_url?: string }[]; mosaic?: unknown };
};

/** api.fxtwitter.com/status/:id */
export function parseFxTweet(data: { tweet?: FxTweet }, target: { handle: string }, sourceUrl: string): ImportedPost {
  const t = data.tweet;
  if (!t) throw new PostImportError("That X post is private, deleted or age-restricted");
  const photos = (t.media?.photos ?? []).map((p) => p.url).filter((u): u is string => !!u);
  const thumbs = (t.media?.videos ?? []).map((v) => v.thumbnail_url).filter((u): u is string => !!u);
  // media links trail the text as t.co URLs — the photos render instead
  const text = (t.text ?? "").replace(/(\s*https?:\/\/t\.co\/\w+)+\s*$/i, "").trim();
  return {
    provider: "x",
    sourceLabel: LABEL.x,
    sourceUrl,
    name: clean(t.author?.name) || "X user",
    subtitle: `@${clean(t.author?.screen_name || target.handle, 40) || "x"}`,
    verified: !!t.author?.verification?.verified,
    text: text.slice(0, MAX_TEXT),
    time: postTime(t.created_timestamp ?? t.created_at),
    likes: num(t.likes),
    comments: num(t.replies),
    shares: num(t.retweets),
    hasMetrics: true,
    // the API hands out the 48px "_normal" avatar; ask for the 400px one
    avatar: t.author?.avatar_url?.replace(/_normal(\.\w+)$/, "_400x400$1"),
    images: [...photos, ...thumbs].slice(0, 4),
  };
}

type BskyImage = { fullsize?: string; thumb?: string };
type BskyPost = {
  author?: { displayName?: string; handle?: string; avatar?: string; verification?: { verifiedStatus?: string } };
  record?: { text?: string; createdAt?: string };
  embed?: { $type?: string; images?: BskyImage[]; media?: { images?: BskyImage[] }; thumbnail?: string };
  replyCount?: number;
  repostCount?: number;
  quoteCount?: number;
  likeCount?: number;
};

/** app.bsky.feed.getPostThread */
export function parseBlueskyThread(data: { thread?: { post?: BskyPost } }, sourceUrl: string): ImportedPost {
  const p = data.thread?.post;
  if (!p) throw new PostImportError("That Bluesky post couldn't be found");
  const embedImages = p.embed?.images ?? p.embed?.media?.images ?? [];
  // the ~1000px thumb is plenty for a card and keeps the response small
  const images = embedImages.map((i) => i.thumb || i.fullsize).filter((u): u is string => !!u);
  if (!images.length && p.embed?.thumbnail) images.push(p.embed.thumbnail); // video poster
  return {
    provider: "bluesky",
    sourceLabel: LABEL.bluesky,
    sourceUrl,
    name: clean(p.author?.displayName) || clean(p.author?.handle) || "Bluesky user",
    subtitle: `@${clean(p.author?.handle, 80) || "bsky.social"}`,
    verified: p.author?.verification?.verifiedStatus === "valid",
    text: (p.record?.text ?? "").trim().slice(0, MAX_TEXT),
    time: postTime(p.record?.createdAt),
    likes: num(p.likeCount),
    comments: num(p.replyCount),
    shares: num(p.repostCount) + num(p.quoteCount),
    hasMetrics: true,
    avatar: p.author?.avatar,
    images: images.slice(0, 4),
  };
}

type MastodonStatus = {
  content?: string;
  spoiler_text?: string;
  created_at?: string;
  replies_count?: number;
  reblogs_count?: number;
  favourites_count?: number;
  account?: { display_name?: string; username?: string; acct?: string; avatar_static?: string; avatar?: string };
  media_attachments?: { type?: string; url?: string; preview_url?: string }[];
  reblog?: MastodonStatus | null;
};

/** /api/v1/statuses/:id */
export function parseMastodonStatus(data: MastodonStatus, target: { url: URL; acct: string }): ImportedPost {
  const s = data.reblog ?? data;
  const acct = s.account?.acct || target.acct;
  const fullAcct = acct.includes("@") ? acct : `${acct}@${target.url.hostname}`;
  const body = htmlToText(s.content ?? "");
  const text = s.spoiler_text ? `${htmlToText(s.spoiler_text)}\n\n${body}` : body;
  const images = (s.media_attachments ?? [])
    .map((m) => (m.type === "image" ? m.url : m.preview_url))
    .filter((u): u is string => !!u);
  return {
    provider: "mastodon",
    sourceLabel: LABEL.mastodon,
    sourceUrl: target.url.href,
    name: clean(htmlToText(s.account?.display_name ?? "")) || clean(s.account?.username) || target.acct,
    subtitle: `@${clean(fullAcct, 80)}`,
    verified: false,
    text: text.slice(0, MAX_TEXT),
    time: postTime(s.created_at),
    likes: num(s.favourites_count),
    comments: num(s.replies_count),
    shares: num(s.reblogs_count),
    hasMetrics: true,
    avatar: s.account?.avatar_static || s.account?.avatar,
    images: images.slice(0, 4),
  };
}

/** Threads / LinkedIn public pages: the post text lives in OpenGraph tags. */
export function parseOpenGraphPost(html: string, provider: "threads" | "linkedin", sourceUrl: string): ImportedPost {
  const title = metaTag(html, "og:title") || metaTag(html, "twitter:title");
  const description = metaTag(html, "og:description") || metaTag(html, "twitter:description");
  if (!description) {
    throw new PostImportError(
      provider === "threads"
        ? "Threads didn't share this post publicly — check it's public, or paste the text in the editor"
        : "LinkedIn only shows this post to signed-in members — paste the text in the editor instead"
    );
  }
  let name = "";
  let subtitle = "";
  if (provider === "threads") {
    // "Jane Doe (@jane) on Threads"
    const m = title.match(/^(.*?)\s*\(@([\w.]+)\)/);
    name = clean(m?.[1] || title.replace(/\s+on Threads.*$/i, ""));
    subtitle = m?.[2] ? `@${m[2]}` : "";
    if (!subtitle) {
      const path = new URL(sourceUrl).pathname.match(/^\/@([\w.]+)/);
      if (path) subtitle = `@${path[1]}`;
    }
  } else {
    // "Post text… | Jane Doe" or "Jane Doe on LinkedIn: post text…"
    const onLi = title.match(/^(.*?)\s+on LinkedIn\b/i);
    const piped = title.split(" | ");
    name = clean(onLi?.[1] || (piped.length > 1 ? piped[piped.length - 1] : "") || metaTag(html, "author"));
    subtitle = ""; // the LinkedIn mark already says where it's from
  }
  return {
    provider,
    sourceLabel: LABEL[provider],
    sourceUrl,
    name: name || (provider === "threads" ? "Threads user" : "LinkedIn member"),
    subtitle,
    verified: false,
    text: description.slice(0, MAX_TEXT),
    time: "",
    likes: 0,
    comments: 0,
    shares: 0,
    hasMetrics: false,
    images: [],
  };
}

/* ---------------------------------- fetching -------------------------------- */

const UA = "Mozilla/5.0 (compatible; MockFrameBot/1.0; +https://mockframe.app)";

/** Read a response body, giving up (null) once it passes `max` bytes. */
async function readLimited(res: Response, max: number): Promise<Uint8Array | null> {
  const declared = Number(res.headers.get("content-length") || 0);
  if (declared > max) {
    await res.body?.cancel().catch(() => {});
    return null;
  }
  if (!res.body) return new Uint8Array(await res.arrayBuffer());
  const reader = res.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > max) {
      await reader.cancel().catch(() => {});
      return null;
    }
    chunks.push(value);
  }
  const out = new Uint8Array(total);
  let at = 0;
  for (const c of chunks) {
    out.set(c, at);
    at += c.byteLength;
  }
  return out;
}

const JSON_MAX_BYTES = 2 * 1024 * 1024;

async function getJson<T>(url: string, notFound: string): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, { headers: { accept: "application/json", "user-agent": UA }, redirect: "error", signal: AbortSignal.timeout(10_000) });
  } catch {
    throw new PostImportError("The provider didn't answer in time — try again in a moment");
  }
  if (res.status === 404 || res.status === 403 || res.status === 401) throw new PostImportError(notFound);
  if (res.status === 429) throw new PostImportError("The provider is rate-limiting requests — try again in a minute");
  if (!res.ok) throw new PostImportError("The provider had a problem returning this post — try again shortly");
  const body = await readLimited(res, JSON_MAX_BYTES).catch(() => null);
  if (!body) throw new PostImportError("The provider returned an unexpectedly large response");
  try {
    return JSON.parse(new TextDecoder().decode(body)) as T;
  } catch {
    throw new PostImportError("The provider returned something that isn't a post");
  }
}

/** Fetch a public page, following redirects only within the provider's own hosts. */
async function getHtml(url: URL, allowedHosts: Set<string>): Promise<string> {
  let current = url;
  for (let hop = 0; hop < 4; hop++) {
    let res: Response;
    try {
      res = await fetch(current, { headers: { "user-agent": UA, accept: "text/html" }, redirect: "manual", signal: AbortSignal.timeout(10_000) });
    } catch {
      throw new PostImportError("The provider didn't answer in time — try again in a moment");
    }
    if (res.status >= 300 && res.status < 400) {
      const next = res.headers.get("location");
      if (!next) break;
      const to = new URL(next, current);
      if (to.protocol !== "https:" || !allowedHosts.has(to.hostname.toLowerCase().replace(/^www\./, ""))) {
        throw new PostImportError("This post isn't publicly viewable without signing in");
      }
      current = to;
      continue;
    }
    if (!res.ok) throw new PostImportError("This post isn't publicly viewable without signing in");
    if (!(res.headers.get("content-type") || "").includes("text/html")) throw new PostImportError("That link didn't return a post page");
    return (await res.text()).slice(0, 1_500_000);
  }
  throw new PostImportError("That link redirected too many times");
}

const IMAGE_MAX_BYTES = 3 * 1024 * 1024;
/** all images together: base64 inflates by a third and the JSON reply must stay under the host's 4.5 MB cap */
const IMAGES_TOTAL_BYTES = 3 * 1024 * 1024;

/** Download one image; null on anything unexpected (the card falls back gracefully). */
async function fetchImage(raw: string, checkHost: boolean): Promise<{ type: string; buf: Buffer } | null> {
  try {
    const url = new URL(raw);
    if (url.protocol !== "https:") return null;
    if (checkHost) await assertPublicUrl(url);
    // X serves several renditions; "medium" (≤1200px) is plenty for a card
    if (url.hostname === "pbs.twimg.com" && url.pathname.startsWith("/media/")) url.searchParams.set("name", "medium");
    const res = await fetch(url, { redirect: "error", signal: AbortSignal.timeout(10_000) });
    const type = res.headers.get("content-type") || "";
    if (!res.ok || !/^image\/(png|jpe?g|webp|gif|avif)/i.test(type)) {
      await res.body?.cancel().catch(() => {});
      return null;
    }
    const body = await readLimited(res, IMAGE_MAX_BYTES);
    return body ? { type: type.split(";")[0], buf: Buffer.from(body) } : null;
  } catch {
    return null;
  }
}

export async function importPost(raw: string): Promise<ImportedPost> {
  const target = parsePostUrl(raw);
  let post: ImportedPost;
  switch (target.provider) {
    case "x": {
      const data = await getJson<{ tweet?: FxTweet }>(`https://api.fxtwitter.com/status/${target.id}`, "That X post is private, deleted or age-restricted");
      post = parseFxTweet(data, target, `https://x.com/${target.handle || "i"}/status/${target.id}`);
      break;
    }
    case "bluesky": {
      let did = target.actor;
      if (!did.startsWith("did:")) {
        const id = await getJson<{ did?: string }>(`https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(did)}`, "That Bluesky account couldn't be found");
        if (!id.did) throw new PostImportError("That Bluesky account couldn't be found");
        did = id.did;
      }
      const uri = `at://${did}/app.bsky.feed.post/${target.rkey}`;
      const data = await getJson<{ thread?: { post?: BskyPost } }>(`https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(uri)}&depth=0`, "That Bluesky post couldn't be found");
      post = parseBlueskyThread(data, `https://bsky.app/profile/${target.actor}/post/${target.rkey}`);
      break;
    }
    case "mastodon": {
      // the one branch that reaches an arbitrary origin: block internal addresses first
      try {
        await assertPublicUrl(target.url);
      } catch {
        throw new PostImportError("Paste a public post from X, Bluesky, Threads, LinkedIn or Mastodon");
      }
      const data = await getJson<MastodonStatus>(`${target.url.origin}/api/v1/statuses/${target.id}`, "That Mastodon post couldn't be found — is it public?");
      post = parseMastodonStatus(data, target);
      break;
    }
    case "threads":
      post = parseOpenGraphPost(await getHtml(target.url, THREADS_HOSTS), "threads", target.url.href);
      break;
    case "linkedin":
      post = parseOpenGraphPost(await getHtml(target.url, new Set(["linkedin.com"])), "linkedin", target.url.href);
      break;
  }
  const arbitraryHost = target.provider === "mastodon";
  const fetched = await Promise.all([
    post.avatar ? fetchImage(post.avatar, arbitraryHost) : Promise.resolve(null),
    ...post.images.map((u) => fetchImage(u, arbitraryHost)),
  ]);
  // avatar first, then photos in order, until the size budget is spent
  let budget = IMAGES_TOTAL_BYTES;
  const encoded = fetched.map((img) => {
    if (!img || img.buf.length > budget) return null;
    budget -= img.buf.length;
    return `data:${img.type};base64,${img.buf.toString("base64")}`;
  });
  const [avatar, ...images] = encoded;
  return { ...post, avatar: avatar ?? undefined, images: images.filter((u): u is string => !!u) };
}
