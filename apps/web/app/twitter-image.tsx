// Reuse the same generated card for Twitter/X so summary_large_image previews
// aren't blank either. (Twitter falls back to og:image, but being explicit is
// cheaper than debugging a scraper that doesn't.)
export { default, alt, size, contentType } from "./opengraph-image";
