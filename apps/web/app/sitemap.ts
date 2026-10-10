import type { MetadataRoute } from "next";
import { listDevices } from "@framekit/devices";
import { SITE_URL } from "@/lib/site";
import { TOOL_PAGES } from "@/lib/toolPages";
import { GUIDES } from "@/lib/guides";
import { SCENE_GROUPS } from "@/lib/sceneGroups";
import { DEVICE_PAGES_UPDATED, isCanonicalDevicePage } from "@/lib/deviceSeo";
import { COMPARISONS } from "@/lib/comparisons";
import { ARTICLES } from "@/lib/articles";

// Google only trusts <lastmod> when it's "consistently and verifiably accurate".
// Stamping every URL with `new Date()` on each build made the whole site's
// lastmod read as "now" on every deploy, which makes Google ignore the field
// entirely. Instead we pin honest, per-content-group dates and bump the one
// that changed when its content actually changes.
const UPDATED = {
  site: new Date("2026-10-07"), // homepage + marketing metadata refresh
  pricing: new Date("2026-10-07"), // Pro commercial license, premium layouts, team libraries
  legal: new Date("2026-10-07"), // /license created, privacy covers fonts + teams
  tools: new Date("2026-10-07"), // tool copy (post import) + metadata refresh
  launchKit: new Date("2026-10-07"),
  packStudio: new Date("2026-10-09"), // 6.3-inch size, 2026 size table
  ai: new Date("2026-10-07"), // title/description refresh
  compare: new Date("2026-10-09"), // Previewed, AppLaunchpad, Shots pages + index
  developers: new Date("2026-07-14"),
  changelog: new Date("2026-07-14"),
  guides: new Date("2026-10-09"), // reference articles listed on the index
  templates: new Date("2026-10-07"), // premium layouts + photoreal collections
  videoTemplates: new Date("2026-10-10"), // promo video gallery (3D + multi-device)
  devices: new Date(DEVICE_PAGES_UPDATED), // per-device FAQ, "Free" titles, scene galleries
  recorder: new Date("2026-10-07"), // auto-zoom screen recorder launch
  figma: new Date("2026-10-07"), // Figma plugin launch
} as const;

export default function sitemap(): MetadataRoute.Sitemap {
  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: UPDATED.site, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/mockups`, lastModified: UPDATED.devices, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/app-store-screenshots`, lastModified: UPDATED.packStudio, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/ai`, lastModified: UPDATED.ai, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/screen-recorder`, lastModified: UPDATED.recorder, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/figma-plugin`, lastModified: UPDATED.figma, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/compare`, lastModified: UPDATED.compare, changeFrequency: "monthly", priority: 0.6 },
    ...COMPARISONS.map((c) => ({ url: `${SITE_URL}/compare/${c.slug}`, lastModified: UPDATED.compare, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${SITE_URL}/tools`, lastModified: UPDATED.tools, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/launch-kit`, lastModified: UPDATED.launchKit, changeFrequency: "weekly", priority: 0.9 },
    // /chat is intentionally omitted — a noindexed mobile builder (the WhatsApp / iMessage tool pages carry the SEO)
    { url: `${SITE_URL}/templates`, lastModified: UPDATED.templates, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/templates/video`, lastModified: UPDATED.videoTemplates, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE_URL}/pricing`, lastModified: UPDATED.pricing, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/developers/api`, lastModified: UPDATED.developers, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/developers/embed`, lastModified: UPDATED.developers, changeFrequency: "monthly", priority: 0.7 },
    { url: `${SITE_URL}/developers/automations`, lastModified: UPDATED.developers, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/extensions`, lastModified: UPDATED.developers, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/guides`, lastModified: UPDATED.guides, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/changelog`, lastModified: UPDATED.changelog, changeFrequency: "weekly", priority: 0.5 },
    { url: `${SITE_URL}/privacy`, lastModified: UPDATED.legal, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/license`, lastModified: UPDATED.legal, changeFrequency: "yearly", priority: 0.4 },
    // NOTE: /editor is intentionally omitted — it's noindex (an app screen).
  ];

  const templateCollections: MetadataRoute.Sitemap = SCENE_GROUPS.map((g) => ({
    url: `${SITE_URL}/templates/collection/${g.id}`,
    lastModified: UPDATED.templates,
    changeFrequency: "monthly",
    priority: 0.6,
  }));

  // photo-scene variants canonicalise to their family page, so only list the family page
  const devicePages: MetadataRoute.Sitemap = listDevices().filter(isCanonicalDevicePage).map((d) => ({
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

  // reference articles carry their own verified-on date
  const articlePages: MetadataRoute.Sitemap = ARTICLES.map((a) => ({
    url: `${SITE_URL}/guides/${a.slug}`,
    lastModified: new Date(a.updated),
    changeFrequency: "monthly",
    priority: 0.8,
  }));

  return [...staticPages, ...toolPages, ...articlePages, ...guidePages, ...templateCollections, ...devicePages];
}
