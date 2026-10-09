/**
 * Search and "what is it for" filters for the template gallery. Pure, so it
 * can be tested without the page.
 */

export type TemplateUse = "app-store" | "social" | "website" | "chat" | "video";

export const TEMPLATE_USES: { id: TemplateUse; label: string }[] = [
  { id: "app-store", label: "App Store" },
  { id: "social", label: "Social post" },
  { id: "website", label: "Website" },
  { id: "chat", label: "Chat" },
  { id: "video", label: "Video" },
];

export interface TemplateFilter {
  query: string;
  use: TemplateUse | null;
}

export const NO_FILTER: TemplateFilter = { query: "", use: null };

export interface Searchable {
  /** names, descriptions and anything else worth matching */
  text: (string | undefined)[];
  uses: TemplateUse[];
}

const normalize = (s: string) =>
  s
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** Every word of the query appears somewhere in the item, and the use matches. */
export function matchesTemplate(filter: TemplateFilter, item: Searchable): boolean {
  if (filter.use && !item.uses.includes(filter.use)) return false;
  const words = normalize(filter.query).split(" ").filter(Boolean);
  if (!words.length) return true;
  const labels = item.uses.map((u) => TEMPLATE_USES.find((x) => x.id === u)?.label ?? "");
  const hay = ` ${normalize([...item.text, ...labels].filter(Boolean).join(" "))} `;
  // "post" should match "posts" and "poster", but a lone "a" shouldn't match everything
  return words.every((w) => (w.length < 2 ? hay.includes(` ${w} `) : hay.includes(w)));
}

export const isFiltering = (f: TemplateFilter) => !!f.use || !!f.query.trim();

/* ------------------------------ what each is for ----------------------------- */

export const PREMIUM_USES: Record<string, TemplateUse[]> = {
  "launch-hero": ["website", "social"],
  "feature-trio": ["website", "video"],
  "clay-studio": ["social", "website"],
  "keynote-stage": ["video", "website"],
  "product-hunt": ["website", "social"],
  "before-after": ["social"],
  "whats-new": ["social", "app-store"],
  "reel-cover": ["social", "video"],
  "late-shift": ["social"],
  "signal-poster": ["social"],
  "glass-slab": ["website"],
  "two-tone": ["website", "social"],
  "field-notes": ["social", "website"],
  "fanned": ["social"],
  "zoom-tour": ["video", "website"],
  "turntable": ["video", "social"],
  "depth-story": ["video", "social"],
  "feature-tour": ["video", "website"],
};

export const STORE_SET_USES: TemplateUse[] = ["app-store"];
export const POST_USES: TemplateUse[] = ["social"];

export const APP_SCREEN_USES: Record<string, TemplateUse[]> = {
  Messaging: ["chat", "app-store", "social"],
  Dating: ["chat", "app-store"],
  Social: ["social", "app-store"],
  AI: ["chat", "app-store"],
  "Apps & Store": ["app-store"],
};

export const CARD_USES: Record<string, TemplateUse[]> = {
  code: ["social", "website"],
  social: ["social"],
  github: ["social", "website"],
  stripe: ["social", "website"],
  testimonial: ["social", "website"],
  "ios-notification": ["app-store", "social"],
  spotify: ["social"],
  appstore: ["app-store", "website"],
  "appstore-promo": ["app-store", "social"],
  googlemaps: ["social"],
  googleplay: ["app-store", "website"],
};

export const SCENE_GROUP_USES: Record<string, TemplateUse[]> = {
  iphone: ["app-store", "social", "website"],
  ipad: ["app-store", "website"],
  mac: ["website"],
  watch: ["app-store", "social"],
  android: ["app-store", "social"],
};
