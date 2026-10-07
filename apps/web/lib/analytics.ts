"use client";

/*
 * Funnel events (Google Analytics). Read them in order to see where people drop off:
 *
 *   editor_opened / editor_first_open   landed in the editor
 *   starter_choice {choice}             picked a tile in "What do you want to make?"
 *   first_media_added                   added their own screenshot
 *   export_completed / first_export     exported an image or video
 *   draft_resumed                       came back to an autosaved scene
 *   pack_exported {screens, languages, layout}   exported a store screenshot pack
 *   pack_translated {languages}         AI-translated a pack's captions
 *   upgrade_viewed {reason}             saw the Pro modal, and what they reached for
 *   upgrade_signin                      had to sign in before paying
 *   checkout_started {plan}             pressed pay
 *   checkout_opened / checkout_closed / checkout_failed {plan}   the payment overlay
 *   checkout_pay_clicked {plan}         pressed pay inside the overlay
 *   checkout_finished {plan}            the overlay is sending them back to the editor
 *   purchase_confirmed / purchase_pending   Pro unlocked (or still waiting on the webhook)
 *   purchase_cancelled                  came back from checkout without paying
 */

type EventParams = Record<string, string | number | boolean | undefined>;
type AnalyticsWindow = Window & {
  dataLayer?: unknown[];
  gtag?: (command: "event", name: string, params?: EventParams) => void;
};

/** Small, failure-proof analytics boundary. Product behavior never depends on GA. */
export function track(name: string, params: EventParams = {}): void {
  if (typeof window === "undefined") return;
  const w = window as AnalyticsWindow;
  if (typeof w.gtag === "function") w.gtag("event", name, params);
  else {
    w.dataLayer = w.dataLayer ?? [];
    w.dataLayer.push({ event: name, ...params });
  }
}

/** Record a milestone once per browser, useful for activation metrics. */
export function trackOnce(name: string, params: EventParams = {}): void {
  if (typeof window === "undefined") return;
  const key = `mockframe:analytics:${name}`;
  try {
    if (window.localStorage.getItem(key)) return;
    window.localStorage.setItem(key, new Date().toISOString());
  } catch {
    // Privacy modes can block storage; the event is still useful for this visit.
  }
  track(name, params);
}
