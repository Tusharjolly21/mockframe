// Server-safe scene-group data (NO "use client"). screenTemplates.ts is a
// client module, so its exports become client-reference stubs when imported
// into server contexts (sitemap, route metadata) — importing SCENE_GROUPS from
// there crashed the sitemap with "SCENE_GROUPS.map is not a function". This
// module holds the data so both server (sitemap, generateMetadata) and the
// client screenTemplates module can consume it.

export type SceneGroupId = "iphone" | "ipad" | "mac" | "watch" | "android";

export interface SceneGroup {
  id: SceneGroupId;
  label: string;
  blurb: string;
  accent: string;
}

/** Category cards on /templates. Only those with ≥1 template are shown. */
export const SCENE_GROUPS: SceneGroup[] = [
  { id: "iphone", label: "iPhone", blurb: "Photoreal iPhone 16 Pro and in-hand iPhone 17 Pro scenes.", accent: "#c9b8a4" },
  { id: "ipad", label: "iPad", blurb: "Calibrated iPad Pro scenes, flat and angled, in silver and space black.", accent: "#9fb4c9" },
  { id: "mac", label: "Mac", blurb: "MacBook Air studio mockups — realistic, clay and clean vector.", accent: "#c9c2b4" },
  { id: "watch", label: "Apple Watch", blurb: "Apple Watch Ultra with Ocean, Alpine and Trail bands, plus on-wrist.", accent: "#c4b4c9" },
  { id: "android", label: "Android", blurb: "Galaxy S24 Ultra photoreal scenes in three titanium finishes.", accent: "#a9c9b4" },
];
