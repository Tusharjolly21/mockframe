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
  searchParams: Promise<{ device?: string; calibrate?: string }>;
}) {
  const { device, calibrate } = await searchParams;
  return <EditorShell initialDeviceId={device} openCalibrate={calibrate === "1"} />;
}
