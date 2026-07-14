import { EditorShell } from "@/components/editor/EditorShell";

/**
 * The editor. `?device=<id>` deep-links a specific device (from the /mockups
 * pSEO pages' "Open in editor" CTA); EditorShell injects a matching scene.
 * `?calibrate=1` (the /calibrate entry) opens the custom-mockup calibration
 * modal on load.
 */
export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ device?: string; calibrate?: string; upgrade?: string; capture?: string; plan?: string }>;
}) {
  const { device, calibrate, upgrade, capture, plan } = await searchParams;
  return <EditorShell initialDeviceId={device} openCalibrate={calibrate === "1"} openUpgradeOnLoad={upgrade === "1"} upgradePlan={plan} openCaptureOnLoad={capture === "1"} />;
}
