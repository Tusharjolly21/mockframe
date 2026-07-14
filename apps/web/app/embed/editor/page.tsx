import { EditorShell } from "@/components/editor/EditorShell";

export const metadata = { title: "Embedded editor", robots: { index: false, follow: false } };

export default function EmbeddedEditorPage() {
  return <EditorShell embedded />;
}
