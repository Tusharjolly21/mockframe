import type { Metadata } from "next";
import { SCENE_GROUPS } from "@/lib/sceneGroups";

// Per-group metadata for the collection listing (the page is client-only). Each
// group gets a unique, keyword-targeted title + description + canonical instead
// of inheriting the section default — this is an indexable pSEO listing.
export async function generateMetadata({ params }: { params: Promise<{ group: string }> }): Promise<Metadata> {
  const { group } = await params;
  const g = SCENE_GROUPS.find((x) => x.id === group);
  if (!g) return { title: "Templates" };
  const title = `${g.label} Mockup Templates`;
  const description = `${g.blurb} Free ${g.label} mockup templates — drop in your screenshot and export a production-ready image, right in your browser.`;
  return {
    title,
    description,
    alternates: { canonical: `/templates/collection/${g.id}` },
    openGraph: { title: `${title} — MockFrame`, description, url: `/templates/collection/${g.id}` },
  };
}

// pre-render the known groups (mirrors the client route's set)
export function generateStaticParams() {
  return SCENE_GROUPS.map((g) => ({ group: g.id }));
}

export default function CollectionGroupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
