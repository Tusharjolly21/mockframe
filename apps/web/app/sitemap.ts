import type { MetadataRoute } from "next";
import { listDevices } from "@framekit/devices";
import { SITE_URL } from "@/lib/site";
import { TOOL_PAGES } from "@/lib/toolPages";
import { GUIDES } from "@/lib/guides";
import { SCENE_GROUPS } from "@/lib/sceneGroups";

// Google only trusts <lastmod> when it's "consistently and verifiably accurate".
// Stamping every URL with `new Date()` on each build made the whole site's
// lastmod read as "now" on every deploy, which makes Google ignore the field
// entirely. Instead we pin honest, per-content-group dates and bump the one
// that changed when its content actually changes.
const UPDATED = {
  site: new Date("2026-07-16"), // marketing shell / homepage
  tools: new Date("2026-07-19"), // + 5 new chat tool pages (discord/slack/signal/line/teams)
  packStudio: new Date("2026-07-16"), // App Store screenshot pack studio landing page + FAQ
  ai: new Date("2026-07-17"), // AI pack generator landing page
  guides: new Date("2026-06-20"),
  templates: new Date("2026-06-01"),
  devices: new Date("2026-06-01"),
} as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: UPDATED.site, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/mockups`, lastModified: UPDATED.devices, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/app-store-screenshots`, lastModified: UPDATED.packStudio, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/ai`, lastModified: UPDATED.ai, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/tools`, lastModified: UPDATED.tools, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/launch-kit`, lastModified: UPDATED.tools, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/chat`, lastModified: UPDATED.tools, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/templates`, lastModified: UPDATED.templates, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/pricing`, lastModified: UPDATED.site, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/developers/api`, lastModified: UPDATED.site, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/developers/embed`, lastModified: UPDATED.site, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/developers/automations`, lastModified: UPDATED.site, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/extensions`, lastModified: UPDATED.site, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/guides`, lastModified: UPDATED.guides, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/changelog`, lastModified: UPDATED.site, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: UPDATED.site, changeFrequency: "yearly", priority: 0.3 },
    // NOTE: /editor is intentionally omitted — it's noindex (an app screen).
  ];

  const templateCollections: MetadataRoute.Sitemap = SCENE_GROUPS.map((g) => ({
    url: `${SITE_URL}/templates/collection/${g.id}`,
    lastModified: UPDATED.templates,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  const devicePages: MetadataRoute.Sitemap = listDevices().map((d) => ({
    url: `${SITE_URL}/mockups/${d.id}`,
    lastModified: UPDATED.devices,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  const toolPages: MetadataRoute.Sitemap = TOOL_PAGES.map((tool) => ({
    url: `${SITE_URL}/tools/${tool.slug}`,
    lastModified: UPDATED.tools,
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  const guidePages: MetadataRoute.Sitemap = GUIDES.map((guide) => ({
    url: `${SITE_URL}/guides/${guide.slug}`,
    lastModified: UPDATED.guides,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  return [...staticPages, ...toolPages, ...guidePages, ...templateCollections, ...devicePages];
}
