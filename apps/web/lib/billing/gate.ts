"use client";

import { useViewStore } from "../store";

/**
 * Client-side Pro gating. The entitlement mirror is the view store's
 * removeWatermark flag (set by useEntitlementSync from /api/billing/status).
 * UI gates are a courtesy — anything that costs real money (renders,
 * full-page captures) is ALSO enforced server-side.
 *
 * Free tier stays deliberately generous: editor, all devices, custom devices,
 * drafts + cloud sync, bulk export, share links, icons, glare, 1–3× exports,
 * standard URL capture. Pro: watermark-free/custom watermark, video & GIF
 * export, realistic photo renders, 4K/6K exports, full-page capture.
 */

export function useIsPro(): boolean {
  return useViewStore((s) => s.removeWatermark);
}

/**
 * Open the upgrade modal from anywhere in the editor.
 *
 * `reason` names what the user was reaching for and is rendered as
 * "<reason> are part of Pro." — so pass a plural noun phrase ("Batch exports",
 * "Telegram screens"). Omit it for generic entry points and the modal keeps its
 * default headline.
 */
export function openUpgrade(reason?: string): void {
  window.dispatchEvent(new CustomEvent("framekit:upgrade", { detail: reason ? { reason } : undefined }));
}
