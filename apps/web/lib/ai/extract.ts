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

    const ogSiteName = firstMetaContent(cleaned, "property", "og:site_name");
    const ogTitleMeta = firstMetaContent(cleaned, "property", "og:title");
    const titleTag = firstTagContent(cleaned, "title");

    const rawName = ogSiteName ?? ogTitleMeta ?? titleTag ?? "";
    const decodedName = stripTrailingSeparator(cleanText(rawName));
    const appName = decodedName ? decodedName.slice(0, MAX_APP_NAME) : hostname;

    const metaDescRaw = firstMetaContent(cleaned, "name", "description");
    const ogDescRaw = firstMetaContent(cleaned, "property", "og:description");
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

function stripScriptsAndStyles(html: string): string {
  return html
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, " ");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Extracts content="..." from the first <meta> tag whose given attribute
 *  (property/name) matches the given value. Order-independent (content can
 *  come before or after property/name) and quote-style independent. */
function firstMetaContent(html: string, attrName: "property" | "name", attrValue: string): string | null {
  const metaTagRe = /<meta\b[^>]*>/gi;
  const attrRe = new RegExp(`\\b${attrName}\\s*=\\s*["']${escapeRegExp(attrValue)}["']`, "i");
  const contentRe = /\bcontent\s*=\s*"([^"]*)"|\bcontent\s*=\s*'([^']*)'/i;

  let match: RegExpExecArray | null;
  while ((match = metaTagRe.exec(html))) {
    const tag = match[0];
    if (!attrRe.test(tag)) continue;
    const contentMatch = contentRe.exec(tag);
    if (!contentMatch) continue;
    return contentMatch[1] !== undefined ? contentMatch[1] : contentMatch[2];
  }
  return null;
}

function firstTagContent(html: string, tag: string): string | null {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i");
  const match = re.exec(html);
  return match ? match[1] : null;
}

function allTagContents(html: string, tag: string): string[] {
  const re = new RegExp(`<${tag}\\b[^>]*>([\\s\\S]*?)<\\/${tag}>`, "gi");
  const results: string[] = [];
  let match: RegExpExecArray | null;
  while ((match = re.exec(html))) {
    results.push(match[1]);
  }
  return results;
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
