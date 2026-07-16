import type { Metadata } from "next";

// /dashboard is a signed-in app screen (saved scenes), not indexable content.
// The page itself is a client component so it can't export metadata; this
// segment layout carries the noindex directive.
export const metadata: Metadata = {
  title: "My scenes",
  robots: { index: false, follow: false },
};

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return children;
}
