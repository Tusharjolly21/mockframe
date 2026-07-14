import { NextRequest, NextResponse } from "next/server";
import { assertPublicUrl } from "@/lib/server/ssrf";

export const runtime = "nodejs";

type ImportedPost = {
  provider: "x" | "bluesky" | "threads" | "linkedin" | "mastodon";
  sourceLabel: string;
  sourceUrl: string;
  name: string;
  subtitle: string;
  text: string;
  time: string;
  likes: number;
  comments: number;
  shares: number;
  avatar?: string;
};

function compactDate(value?: string | number) {
  if (!value) return "";
  const date = new Date(typeof value === "number" ? value * 1000 : value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("en", { dateStyle: "medium" }).format(date);
}

function decodeHtml(value: string) {
  return value
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function isSafePublicUrl(url: URL) {
  if (url.protocol !== "https:" || url.port) return false;
  const host = url.hostname.toLowerCase();
  return !(
    host === "localhost" ||
    host.endsWith(".local") ||
    host === "0.0.0.0" ||
    host === "127.0.0.1" ||
    host === "::1" ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host)
  );
}

function meta(html: string, key: string) {
  const tags = html.match(/<meta\s+[^>]*>/gi) ?? [];
  for (const tag of tags) {
    const attrs: Record<string, string> = {};
    for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(["'])(.*?)\2/gi)) attrs[match[1].toLowerCase()] = match[3];
    if (attrs.property?.toLowerCase() === key.toLowerCase() || attrs.name?.toLowerCase() === key.toLowerCase()) return decodeHtml(attrs.content ?? "").trim();
  }
  return "";
}

async function importX(url: URL): Promise<ImportedPost> {
  const match = url.pathname.match(/^\/([^/]+)\/status\/(\d+)/i);
  if (!match) throw new Error("Paste a public X post URL");
  const response = await fetch(`https://api.fxtwitter.com/status/${match[2]}`, { headers: { "user-agent": "MockFrame/1.0 (+https://mockframe.app)" }, signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("That X post could not be read");
  const data = (await response.json()) as { tweet?: { text?: string; created_timestamp?: number; replies?: number; retweets?: number; likes?: number; author?: { name?: string; screen_name?: string; avatar_url?: string } } };
  const post = data.tweet;
  if (!post) throw new Error("That X post could not be read");
  return { provider: "x", sourceLabel: "X", sourceUrl: url.href, name: post.author?.name || "X author", subtitle: `@${post.author?.screen_name || match[1]}`, text: post.text || "", time: compactDate(post.created_timestamp), likes: post.likes || 0, comments: post.replies || 0, shares: post.retweets || 0, avatar: post.author?.avatar_url };
}

async function importBluesky(url: URL): Promise<ImportedPost> {
  const match = url.pathname.match(/^\/profile\/([^/]+)\/post\/([a-z0-9]+)/i);
  if (!match) throw new Error("Paste a public Bluesky post URL");
  let did = decodeURIComponent(match[1]);
  if (!did.startsWith("did:")) {
    const identity = await fetch(`https://public.api.bsky.app/xrpc/com.atproto.identity.resolveHandle?handle=${encodeURIComponent(did)}`, { signal: AbortSignal.timeout(10_000) });
    if (!identity.ok) throw new Error("That Bluesky handle could not be resolved");
    did = ((await identity.json()) as { did: string }).did;
  }
  const uri = `at://${did}/app.bsky.feed.post/${match[2]}`;
  const response = await fetch(`https://public.api.bsky.app/xrpc/app.bsky.feed.getPostThread?uri=${encodeURIComponent(uri)}&depth=0`, { signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("That Bluesky post could not be read");
  const post = ((await response.json()) as { thread?: { post?: { author?: { displayName?: string; handle?: string; avatar?: string }; record?: { text?: string; createdAt?: string }; replyCount?: number; repostCount?: number; quoteCount?: number; likeCount?: number } } }).thread?.post;
  if (!post) throw new Error("That Bluesky post could not be read");
  return { provider: "bluesky", sourceLabel: "Bluesky", sourceUrl: url.href, name: post.author?.displayName || post.author?.handle || "Bluesky author", subtitle: `@${post.author?.handle || "bsky.app"}`, text: post.record?.text || "", time: compactDate(post.record?.createdAt), likes: post.likeCount || 0, comments: post.replyCount || 0, shares: (post.repostCount || 0) + (post.quoteCount || 0), avatar: post.author?.avatar };
}

async function importMastodon(url: URL): Promise<ImportedPost> {
  const match = url.pathname.match(/^\/@([^/]+)\/(\d+)/) || url.pathname.match(/^\/users\/([^/]+)\/statuses\/(\d+)/);
  if (!match) throw new Error("Paste a public Mastodon status URL");
  // Mastodon is the one branch that fetches an ARBITRARY user-supplied origin,
  // so resolve+block internal addresses before touching it (SSRF guard).
  await assertPublicUrl(url);
  const response = await fetch(`${url.origin}/api/v1/statuses/${match[2]}`, { headers: { accept: "application/json" }, redirect: "error", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error("That Mastodon status could not be read");
  const post = (await response.json()) as { content?: string; created_at?: string; replies_count?: number; reblogs_count?: number; favourites_count?: number; account?: { display_name?: string; username?: string; acct?: string } };
  return { provider: "mastodon", sourceLabel: "Mastodon", sourceUrl: url.href, name: post.account?.display_name || post.account?.username || match[1], subtitle: `@${post.account?.acct || match[1]}`, text: decodeHtml(post.content || ""), time: compactDate(post.created_at), likes: post.favourites_count || 0, comments: post.replies_count || 0, shares: post.reblogs_count || 0 };
}

async function importOpenGraph(url: URL, provider: "threads" | "linkedin"): Promise<ImportedPost> {
  const response = await fetch(url, { headers: { "user-agent": "Mozilla/5.0 (compatible; MockFrameBot/1.0; +https://mockframe.app)" }, redirect: "error", signal: AbortSignal.timeout(10_000) });
  if (!response.ok) throw new Error(`That ${provider === "threads" ? "Threads" : "LinkedIn"} post is not publicly readable`);
  const type = response.headers.get("content-type") || "";
  if (!type.includes("text/html")) throw new Error("The URL did not return a public post page");
  const html = (await response.text()).slice(0, 1_500_000);
  const title = meta(html, "og:title") || meta(html, "twitter:title");
  const description = meta(html, "og:description") || meta(html, "twitter:description");
  const author = meta(html, "author") || title.split(" on ")[0] || (provider === "threads" ? "Threads author" : "LinkedIn member");
  if (!description) throw new Error("The provider did not expose post text for this public URL");
  return { provider, sourceLabel: provider === "threads" ? "Threads" : "LinkedIn", sourceUrl: url.href, name: author.slice(0, 100), subtitle: url.hostname, text: description.slice(0, 10_000), time: "", likes: 0, comments: 0, shares: 0 };
}

export async function GET(request: NextRequest) {
  let url: URL;
  try { url = new URL(request.nextUrl.searchParams.get("url") || ""); } catch { return NextResponse.json({ error: "Paste a complete public post URL" }, { status: 400 }); }
  if (!isSafePublicUrl(url)) return NextResponse.json({ error: "Only public HTTPS post URLs are supported" }, { status: 400 });
  const host = url.hostname.toLowerCase().replace(/^www\./, "");
  try {
    let post: ImportedPost;
    if (host === "x.com" || host === "twitter.com") post = await importX(url);
    else if (host === "bsky.app") post = await importBluesky(url);
    else if (host === "threads.net") post = await importOpenGraph(url, "threads");
    else if (host === "linkedin.com" || host.endsWith(".linkedin.com")) post = await importOpenGraph(url, "linkedin");
    else post = await importMastodon(url);
    return NextResponse.json(post, { headers: { "cache-control": "private, max-age=60" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "The post could not be imported" }, { status: 422 });
  }
}
