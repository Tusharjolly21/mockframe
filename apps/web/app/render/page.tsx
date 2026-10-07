import type { Metadata } from "next";
import { RenderHost } from "@/components/render/RenderHost";

export const metadata: Metadata = { title: "Render", robots: { index: false, follow: false } };

/** Internal: the page the API's headless browser renders scenes on. */
export default function RenderPage() {
  return (
    <main style={{ background: "transparent" }}>
      <RenderHost />
    </main>
  );
}
