"use client";

import type { SceneDocument } from "@framekit/scene";
import { decodeScreenAsset } from "../screens";
import { SCREEN_APP_LABELS, type ScreenApp } from "../screens/types";
import { openUpgrade } from "./gate";

/**
 * Chat & DM screens are the Pro line — the thing no competitor ships, and the
 * reason the paywall doesn't need to touch output quality. Exports themselves
 * are clean for everyone (see exportWatermarkOpts); what you pay for is
 * capability: the chat set, video/GIF, 4K/6K, photoreal, full-page capture.
 *
 * WhatsApp + iMessage stay free deliberately — they're the top-of-funnel hook
 * the landing pages rank for. A crippled hook doesn't hook, so the free apps
 * are FULLY featured (voice notes, reactions, attachments, calls).
 *
 * The gate bites at EXPORT, never in the picker: free users open any chat app,
 * compose the whole conversation, and watch it render live. They only meet the
 * wall when they ask for the file — the moment they most want it, and after
 * they've already done the work.
 */
export const FREE_CHAT_APPS = new Set<ScreenApp>(["whatsapp", "whatsapp-group", "imessage"]);

export const PRO_CHAT_APPS = new Set<ScreenApp>([
  "instagram",
  "messenger",
  "telegram",
  "snapchat",
  "signal",
  "line",
  "discord",
  "slack",
  "teams",
  "ai",
  "dating",
  "hinge",
]);

export function isProScreenApp(app: ScreenApp): boolean {
  return PRO_CHAT_APPS.has(app);
}

/**
 * Pro chat apps used anywhere in a scene, de-duped in layer order.
 *
 * Checks `media.assetId` (the normal case) and `render.sourceAssetId` — a
 * Realistic render bakes the screen into a flat composite, so without the
 * second lookup a photoreal Telegram chat would export ungated.
 */
export function sceneProScreenApps(scene: SceneDocument | SceneDocument[]): ScreenApp[] {
  const found = new Set<ScreenApp>();
  for (const doc of Array.isArray(scene) ? scene : [scene]) {
    for (const layer of doc.layers) {
      if (layer.type !== "mockup") continue;
      for (const id of [layer.media?.assetId, layer.render?.sourceAssetId]) {
        const screen = id ? decodeScreenAsset(id) : undefined;
        if (screen && isProScreenApp(screen.app)) found.add(screen.app);
      }
    }
  }
  return [...found];
}

/** "Telegram screens" · "Telegram and Slack screens" · "A, B and C screens" */
export function proScreenLabel(apps: ScreenApp[]): string {
  const names = apps.map((a) => SCREEN_APP_LABELS[a]);
  if (names.length === 0) return "chat screens";
  if (names.length === 1) return `${names[0]} screens`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]} screens`;
}

/**
 * Export-time guard. Returns true when the export may proceed; otherwise opens
 * the upgrade modal and returns false. Accepts a batch of scenes so bulk/ZIP
 * paths can't slip a Pro screen through. Pass `isPro` from the entitlement
 * mirror. Server-side cost centres (renders, captures) enforce separately.
 */
export function guardProScreens(scene: SceneDocument | SceneDocument[], isPro: boolean): boolean {
  if (isPro) return true;
  const apps = sceneProScreenApps(scene);
  if (apps.length === 0) return true;
  openUpgrade(proScreenLabel(apps));
  return false;
}
