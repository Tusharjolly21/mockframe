// zod/v4: @anthropic-ai/sdk zodOutputFormat needs v4 internals (same note as lib/ai/plan.ts)
import { z } from "zod/v4";

/** The six launch surfaces the kit renders. Order = display order. */
export const KIT_SURFACES = [
  { id: "og", label: "Social / OG card", width: 1200, height: 630, file: "social-og-1200x630.png" },
  { id: "x", label: "X / LinkedIn banner", width: 1600, height: 900, file: "x-linkedin-1600x900.png" },
  { id: "ph-gallery", label: "Product Hunt gallery", width: 1270, height: 760, file: "product-hunt-gallery-1270x760.png" },
  { id: "ph-thumb", label: "Product Hunt thumbnail", width: 240, height: 240, file: "product-hunt-thumbnail-240x240.png" },
  { id: "github", label: "GitHub social preview", width: 1280, height: 640, file: "github-social-1280x640.png" },
  { id: "story", label: "Instagram story", width: 1080, height: 1920, file: "instagram-story-1080x1920.png" },
] as const;

export type KitSurfaceId = (typeof KIT_SURFACES)[number]["id"];

/** AI-written launch copy. Shared between the copy endpoint and the wizard. */
export const LaunchCopySchema = z.object({
  tagline: z.string().min(4).max(60).describe("Punchy one-liner for Product Hunt / hero use"),
  subtitle: z.string().min(4).max(30).describe("App Store subtitle, benefit-first"),
  tweet: z.string().min(20).max(280).describe("Launch tweet: hook, what it does, ask for support; no hashtag spam"),
  boilerplate: z.string().min(60).max(400).describe("Press boilerplate paragraph: what it is, who it serves, what makes it different"),
  phComment: z.string().min(80).max(600).describe("Product Hunt maker first-comment: personal, why it was built, what feedback is wanted"),
});
export type LaunchCopy = z.infer<typeof LaunchCopySchema>;

/** Everything the wizard collects. Client state + press-publish payload. */
export interface LaunchKitDoc {
  appName: string;
  category: string; // e.g. "Productivity", used for context + press facts
  accent: string; // #rrggbb
  /** hosted or object URL of the app icon */
  iconUrl: string | null;
  /** screenshots as {url,width,height} — object URLs in the wizard, hosted on publish */
  screenshots: { url: string; width: number; height: number }[];
  links: { site: string; appstore: string; play: string };
  contact: string;
  copy: LaunchCopy;
}

export const PRESS_SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,60}[a-z0-9])?$/;

export function slugifyAppName(name: string): string {
  return (
    name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 60) || "app"
  );
}
