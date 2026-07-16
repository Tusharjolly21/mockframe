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
  { id: "ipad", label: "iPad", blurb: "Clean floating iPad scenes for app, portfolio & product shots.", accent: "#9fb4c9" },
  { id: "mac", label: "Mac", blurb: "MacBook Pro & Air mockups in premium studio angles.", accent: "#c9c2b4" },
  { id: "watch", label: "Apple Watch", blurb: "Apple Watch Ultra mockups — drop your watchOS screen in.", accent: "#c4b4c9" },
  { id: "android", label: "Android", blurb: "Pixel & Galaxy device mockups. Coming soon.", accent: "#a9c9b4" },
];
