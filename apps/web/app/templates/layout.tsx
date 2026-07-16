import type { Metadata } from "next";

// Section metadata for /templates (the page itself is a client component, so it
// can't export metadata). The index was previously title-less and inherited the
// site default; this gives it a real, keyword-targeted title/description and a
// canonical. Child routes ([slug], collection/[group]) override as needed.
export const metadata: Metadata = {
  title: "Mockup & App Screen Templates",
  description:
    "Ready-made mockup templates — iPhone, iPad, Mac and Apple Watch scenes, plus code, tweet, App Store and chat-screen cards. Pick one, drop in your screenshot, and export a share-ready image free.",
  alternates: { canonical: "/templates" },
  openGraph: {
    title: "Mockup & App Screen Templates — MockFrame",
    description: "iPhone, iPad, Mac, Watch, code, tweet, App Store and chat templates. Drop in a screenshot, export free.",
    url: "/templates",
  },
};

export default function TemplatesLayout({ children }: { children: React.ReactNode }) {
  return children;
}
