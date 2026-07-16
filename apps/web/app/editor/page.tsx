import type { Metadata } from "next";
import { EditorShell } from "@/components/editor/EditorShell";

// The editor is the app itself, not indexable content — it was ranking on the
// generic default title (duplicate-title risk). noindex,follow keeps it out of
// the index while still following its links. Not robots-disallowed, so Google
// can crawl the page and actually SEE this directive.
export const metadata: Metadata = {
  title: "Editor",
  robots: { index: false, follow: true },
};

/**
 * The editor. `?device=<id>` deep-links a specific device (from the /mockups
 * pSEO pages' "Open in editor" CTA); EditorShell injects a matching scene.
 * `?calibrate=1` (the /calibrate entry) opens the custom-mockup calibration
 * modal on load.
 */
export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ device?: string; screen?: string; calibrate?: string; upgrade?: string; capture?: string; plan?: string; promo?: string }>;
}) {
  const { device, screen, calibrate, upgrade, capture, plan, promo } = await searchParams;
  return <EditorShell initialDeviceId={device} initialScreenApp={screen} openCalibrate={calibrate === "1"} openUpgradeOnLoad={upgrade === "1"} upgradePlan={plan} openCaptureOnLoad={capture === "1"} openPromoOnLoad={promo === "1"} />;
}
