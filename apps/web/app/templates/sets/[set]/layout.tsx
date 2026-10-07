import type { Metadata } from "next";

// Opens the editor with a store listing set loaded; an app screen, not content.
export const metadata: Metadata = {
  title: "Store screenshot set",
  robots: { index: false, follow: true },
  alternates: { canonical: null },
};

export default function StoreSetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
