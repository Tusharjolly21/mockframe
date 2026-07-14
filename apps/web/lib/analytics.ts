"use client";

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
