import type { Metadata } from "next";
import { socialMeta } from "@/lib/site";

// Section metadata for /templates (the page itself is a client component, so it
// can't export metadata). The index was previously title-less and inherited the
// site default; this gives it a real, keyword-targeted title/description and a
// canonical. Child routes ([slug], collection/[group]) override as needed.
export const metadata: Metadata = {
  // a template keeps "— MockFrame" on child pages (collections, sets) that set their own title
  title: { default: "Mockup & App Screen Templates", template: "%s — MockFrame" },
  description: "Premium launch layouts, App Store screenshot sets, photoreal iPhone, iPad, Mac and Watch scenes, and code, post and data cards — all editable.",
  alternates: { canonical: "/templates" },
  ...socialMeta({
    path: "/templates",
    title: "Mockup & App Screen Templates — MockFrame",
    description: "Premium launch layouts, App Store screenshot sets, photoreal device scenes and content cards — all editable.",
    image: "/templates/premium/launch-hero.webp",
  }),
};

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
