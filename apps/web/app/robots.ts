import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/site";

export default function robots(): MetadataRoute.Robots {
  return {
    // NOTE: /editor and /embed/editor are NOT disallowed — they carry a
    // `noindex` meta tag instead, which Google can only honor if it's allowed to
    // crawl them. /dashboard is auth-only and /calibrate/dev is an internal tool.
    rules: [{ userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/calibrate/dev"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
