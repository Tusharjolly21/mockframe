import type { MetadataRoute } from "next";
import { listDevices } from "@framekit/devices";
import { SITE_URL } from "@/lib/site";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE_URL}/mockups`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/templates`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE_URL}/editor`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
  ];

  const devicePages: MetadataRoute.Sitemap = listDevices().map((d) => ({
    url: `${SITE_URL}/mockups/${d.id}`,
    lastModified: now,
    changeFrequency: "monthly",
    priority: 0.7,
  }));

  return [...staticPages, ...devicePages];
}
