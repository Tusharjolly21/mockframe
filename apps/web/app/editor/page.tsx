import { EditorShell } from "@/components/editor/EditorShell";

/**
 * The editor. `?device=<id>` deep-links a specific device (from the /mockups
 * pSEO pages' "Open in editor" CTA); EditorShell injects a matching scene.
 */
export default async function EditorPage({
  searchParams,
}: {
  searchParams: Promise<{ device?: string }>;
}) {
  const { device } = await searchParams;
  return <EditorShell initialDeviceId={device} />;
}
