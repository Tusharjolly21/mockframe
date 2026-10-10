"use client";

import type { ScreenDoc } from "./types";

/**
 * Web versions of the app screens: the same content drawn as a desktop browser
 * page (no browser chrome — the browser / laptop device the page sits in
 * supplies that). 1440×900 keeps the 16:10 shape of the browser and laptop
 * screens, so the page fills them edge to edge.
 */
export const WEB_W = 1440;
export const WEB_H = 900;

/** Screens that have a web page version, and whether this doc is showing it. */
export const WEB_APPS = ["googlemaps", "googleplay", "appstore", "reddit", "xpost", "social"] as const;

export function hasWebVersion(doc: ScreenDoc): boolean {
  return doc.app === "social" ? doc.network === "threads" : (WEB_APPS as readonly string[]).includes(doc.app);
}

export function isWebDoc(doc: ScreenDoc): boolean {
  return hasWebVersion(doc) && !!(doc as { web?: boolean }).web;
}

/** What the browser's address bar shows for each web page. */
export function defaultBrowserUrl(doc: ScreenDoc): string {
  switch (doc.app) {
    case "googlemaps":
      return `google.com/maps/dir/${encodeURIComponent(doc.start)}/${encodeURIComponent(doc.destination)}`;
    case "googleplay":
      return "play.google.com/store/apps/details";
    case "appstore":
      return "apps.apple.com/us/app/" + doc.title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    case "reddit":
      return `reddit.com/r/${doc.subreddit}/comments`;
    case "xpost":
      return `x.com/${doc.handle}/status/1`;
    case "social":
      return `threads.net/${doc.subtitle || "@" + doc.name.toLowerCase()}`;
    default:
      return "mockframe.app";
  }
}
