"use client";

import { useViewStore } from "../store";

/**
 * Client-side Pro gating. The entitlement mirror is the view store's
 * removeWatermark flag (set by useEntitlementSync from /api/billing/status).
 * UI gates are a courtesy — anything that costs real money (renders,
 * full-page captures) is ALSO enforced server-side.
 *
 * THE SPLIT (decided 2026-10-09 — change this comment and the pricing page
 * together). The rule: free is the whole creative tool; Pro is what costs us
 * money to run, what ships commercially, and the premium curation on top.
 *
 *  Free  — editor, every device and photo scene, custom devices, drafts and
 *          cloud sync, themes, icons, glare, clay, fonts and font uploads,
 *          WhatsApp / WhatsApp group / iMessage screens, 2 premium layouts,
 *          ~85 backgrounds (every solid, gradient, mesh and Unsplash photo,
 *          plus the first swatch of every premium collection), 3 saved
 *          templates, HD export (1×–3×), PNG/JPG/WebP with a small
 *          "Made with MockFrame" badge,
 *          single-shot export, standard website capture (25/day), the screen
 *          recorder, 2 AI generations and 1 store-screenshot pack when
 *          signed in.
 *  Pro   — commercial licence, premium background collections, 6 more
 *          premium layouts and Pro templates, the other chat/DM screens,
 *          photoreal renders, video / GIF / promo video, 4K and 6K output,
 *          full-page capture, badge-free exports, custom watermark, one-click batch ZIP, hosted
 *          share links, up to 24 saved templates and the team library,
 *          39-language store sets, deploy refresh for store packs, recorder
 *          export, the render API + MCP.
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
