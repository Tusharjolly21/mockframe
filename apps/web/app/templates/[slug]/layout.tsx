import type { Metadata } from "next";

// /templates/[slug] deep-links straight into the editor with a template loaded —
// it's an app screen, not indexable content, so noindex it (the /templates
// index and /templates/collection/[group] listings carry the SEO instead).
export const metadata: Metadata = {
  title: "Template editor",
  robots: { index: false, follow: true },
  // don't inherit /templates as the canonical of a noindexed editor page
  alternates: { canonical: null },
};

export default function TemplateSlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
