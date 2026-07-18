/**
 * Pure, dependency-free site-copy extractor for the AI URL import flow.
 * Regex/string based (no DOM, no jsdom) so it runs anywhere — server route,
 * edge, tests. Never throws: any failure degrades to the URL hostname and
 * an empty description.
 */

const MAX_APP_NAME = 60;
const MAX_DESCRIPTION = 600;
const MIN_PARAGRAPH_LENGTH = 40;
const MAX_PARAGRAPHS = 3;

export function extractSiteCopy(html: string, url: string): { appName: string; description: string } {
  const hostname = safeHostname(url);

  try {
    const cleaned = stripScriptsAndStyles(typeof html === "string" ? html : "");
    const metaTags = findSelfClosingTags(cleaned, "meta");

    const ogSiteName = pickMetaContent(metaTags, "property", "og:site_name");
    const ogTitleMeta = pickMetaContent(metaTags, "property", "og:title");
    const titleTag = firstTagContent(cleaned, "title");

    const rawName = ogSiteName ?? ogTitleMeta ?? titleTag ?? "";
    const decodedName = stripTrailingSeparator(cleanText(rawName));
    const appName = decodedName ? decodedName.slice(0, MAX_APP_NAME) : hostname;

    const metaDescRaw = pickMetaContent(metaTags, "name", "description");
    const ogDescRaw = pickMetaContent(metaTags, "property", "og:description");
    const metaDesc = metaDescRaw ? cleanText(metaDescRaw) : "";
    const ogDesc = ogDescRaw ? cleanText(ogDescRaw) : "";

    let base = "";
    if (metaDesc && ogDesc) {
      base = metaDesc.length >= ogDesc.length ? metaDesc : ogDesc;
    } else {
      base = metaDesc || ogDesc;
    }

    const parts: string[] = [];
    if (base) parts.push(base);

    const tryAppend = (text: string): boolean => {
      if (!text) return false;
      const combined = parts.join(" ");
      if (combined.includes(text)) return false;
      parts.push(text);
      return true;
    };

    const h1Raw = firstTagContent(cleaned, "h1");
    if (h1Raw) tryAppend(cleanText(h1Raw));

    const paragraphs = allTagContents(cleaned, "p");
    let added = 0;
    for (const pRaw of paragraphs) {
      if (added >= MAX_PARAGRAPHS) break;
      const text = cleanText(pRaw);
      if (text.length <= MIN_PARAGRAPH_LENGTH) continue;
      if (tryAppend(text)) added++;
    }

    const description = parts.join(" ").slice(0, MAX_DESCRIPTION);

    return { appName, description };
  } catch {
    return { appName: hostname, description: "" };
  }
}

function safeHostname(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./i, "");
  } catch {
    return (typeof url === "string" ? url : "")
      .replace(/^[a-z][a-z0-9+.-]*:\/\//i, "")
      .replace(/^www\./i, "")
      .split(/[/?#]/)[0];
  }
}

/** True when `char` can continue a tag name (so "<scriptx" doesn't get
 *  mistaken for a "<script" boundary). `char` is already lowercased. */
function isTagNameChar(char: string | undefined): boolean {
  if (!char) return false;
  return (char >= "a" && char <= "z") || (char >= "0" && char <= "9");
}

/**
 * Strips <script>/<style> blocks in O(n): each opener is located with
 * `indexOf` (not a lazy regex quantifier), and its matching closer is
 * located with a single further `indexOf` from that point — so the scan
 * cursor only ever moves forward and no region is rescanned.
 *
 * If an opener has NO closer, the entire remainder of the document (from
 * that opener to EOF) is dropped rather than left in place: an unterminated
 * <script>/<style> swallows everything after it under real HTML parsing
 * too, and leaving it in place both re-introduces the O(n^2) rescan and lets
 * inline JS (attacker-controlled decoy markup, secrets, etc.) leak into the
 * extracted description that gets forwarded to the LLM.
 */
function stripBlockTag(html: string, tagLower: string): string {
  const lower = html.toLowerCase();
  const openToken = "<" + tagLower;
  const closeToken = "</" + tagLower;
  let result = "";
  let pos = 0;

  while (pos < html.length) {
    const openIdx = lower.indexOf(openToken, pos);
    if (openIdx === -1) {
      result += html.slice(pos);
      return result;
    }
    if (isTagNameChar(lower[openIdx + openToken.length])) {
      // Not a real boundary (e.g. "<scriptx") — keep the literal text and
      // resume scanning right after it, no rescanning of prior ground.
      result += html.slice(pos, openIdx + openToken.length);
      pos = openIdx + openToken.length;
      continue;
    }
    result += html.slice(pos, openIdx);

    const openTagEnd = html.indexOf(">", openIdx);
    if (openTagEnd === -1) return result; // opening tag itself never terminates

    const closeIdx = lower.indexOf(closeToken, openTagEnd);
    if (closeIdx === -1) return result; // unclosed block: drop opener..EOF

    const closeTagEnd = html.indexOf(">", closeIdx);
    result += " ";
    pos = closeTagEnd === -1 ? html.length : closeTagEnd + 1;
  }
  return result;
}

function stripScriptsAndStyles(html: string): string {
  return stripBlockTag(stripBlockTag(html, "script"), "style");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Finds every self-closing-style tag (e.g. `<meta ...>`) in O(n): for each
 * opener located via `indexOf`, only the tag's own closing '>' is searched
 * for (also via `indexOf`, from that point). If it's missing, the remainder
 * of the document is malformed/unreachable and scanning stops — bounding
 * total work to O(n) even under adversarial "<meta<meta<meta..." input.
 */
function findSelfClosingTags(html: string, tagLower: string): string[] {
  const lower = html.toLowerCase();
  const openToken = "<" + tagLower;
  const results: string[] = [];
  let pos = 0;

  while (pos < html.length) {
    const openIdx = lower.indexOf(openToken, pos);
    if (openIdx === -1) break;
    if (isTagNameChar(lower[openIdx + openToken.length])) {
      pos = openIdx + openToken.length;
      continue;
    }
    const closeIdx = html.indexOf(">", openIdx);
    if (closeIdx === -1) break; // unterminated opening tag -> stop, rest unreachable
    results.push(html.slice(openIdx, closeIdx + 1));
    pos = closeIdx + 1;
  }
  return results;
}

/** Extracts content="..." from the first tag (among already-found `<meta>`
 *  tag strings) whose given attribute (property/name) matches the given
 *  value. Order-independent (content can come before or after
 *  property/name) and quote-style independent. */
function pickMetaContent(metaTags: string[], attrName: "property" | "name", attrValue: string): string | null {
  const attrRe = new RegExp(`\\b${attrName}\\s*=\\s*["']${escapeRegExp(attrValue)}["']`, "i");
  const contentRe = /\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i;

  for (const tag of metaTags) {
    if (!attrRe.test(tag)) continue;
    const contentMatch = contentRe.exec(tag);
    if (!contentMatch) continue;
    return contentMatch[1] !== undefined ? contentMatch[1] : contentMatch[2];
  }
  return null;
}

/**
 * Finds the text content of paired tags (e.g. `<p>...</p>`) in O(n), using
 * the same opener/closer `indexOf` two-pointer approach as `stripBlockTag`.
 * If an opener has no closer, the remainder of the document is unreachable
 * and scanning stops (bounds worst case to O(n) instead of O(n^2) on
 * adversarial unclosed-tag repetition).
 */
function findTagContents(html: string, tagLower: string, limit?: number): string[] {
  const lower = html.toLowerCase();
  const openToken = "<" + tagLower;
  const closeToken = "</" + tagLower;
  const results: string[] = [];
  let pos = 0;

  while (pos < html.length) {
    if (limit !== undefined && results.length >= limit) break;
    const openIdx = lower.indexOf(openToken, pos);
    if (openIdx === -1) break;
    if (isTagNameChar(lower[openIdx + openToken.length])) {
      pos = openIdx + openToken.length;
      continue;
    }
    const openTagEnd = html.indexOf(">", openIdx);
    if (openTagEnd === -1) break; // opening tag itself never terminates -> stop

    const closeIdx = lower.indexOf(closeToken, openTagEnd);
    if (closeIdx === -1) break; // unclosed -> rest unreachable, stop

    results.push(html.slice(openTagEnd + 1, closeIdx));
    const closeTagEnd = html.indexOf(">", closeIdx);
    pos = closeTagEnd === -1 ? html.length : closeTagEnd + 1;
  }
  return results;
}

function firstTagContent(html: string, tag: string): string | null {
  return findTagContents(html, tag, 1)[0] ?? null;
}

function allTagContents(html: string, tag: string): string[] {
  return findTagContents(html, tag);
}

/** Strips nested tags (replacing with a space so words don't merge), decodes
 *  common entities, collapses whitespace, and trims. */
function cleanText(raw: string): string {
  const noTags = raw.replace(/<[^>]*>/g, " ");
  const decoded = decodeEntities(noTags);
  return decoded.replace(/\s+/g, " ").trim();
}

function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

/** Strips a trailing " — X" / " | X" / " - X" separator suffix (only the
 *  first occurrence; hyphenated words like "well-known" are untouched since
 *  a real separator requires whitespace on both sides). */
function stripTrailingSeparator(text: string): string {
  return text.replace(/\s+[—|-]\s+.*$/, "").trim();
}
