/**
 * Serialize an object for a `<script type="application/ld+json">` tag.
 * JSON.stringify leaves `<` alone, so a value like "</script><img onerror=…>"
 * would end the script block and run in the page; escape it (and the two line
 * separators that break older parsers) so the output can never close the tag.
 */
const LINE_SEPARATOR = new RegExp(String.fromCharCode(0x2028), "g");
const PARAGRAPH_SEPARATOR = new RegExp(String.fromCharCode(0x2029), "g");

export function safeJsonLd(value: unknown): string {
  return JSON.stringify(value).replace(/</g, "\\u003c").replace(LINE_SEPARATOR, "\\u2028").replace(PARAGRAPH_SEPARATOR, "\\u2029");
}
