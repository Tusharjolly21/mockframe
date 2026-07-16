import type { Metadata } from "next";

// /templates/[slug] deep-links straight into the editor with a template loaded —
// it's an app screen, not indexable content, so noindex it (the /templates
// index and /templates/collection/[group] listings carry the SEO instead).
export const metadata: Metadata = {
  robots: { index: false, follow: true },
};

export default function TemplateSlugLayout({ children }: { children: React.ReactNode }) {
  return children;
}
