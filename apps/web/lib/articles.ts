/*
 * Long-form reference articles under /guides/<slug>. Unlike lib/guides.ts (step
 * by step how-tos rendered by app/guides/[slug]), each article is its own page
 * in app/guides/<slug>/page.tsx because it needs tables and custom sections.
 * This list feeds the guides index, the sitemap and llms.txt.
 *
 * `updated` is the date the facts were last checked — bump it only when you
 * re-verify the content, since it is shown on the page and used as lastmod.
 */
export interface Article {
  slug: string;
  title: string;
  description: string;
  /** ISO date the content was last verified */
  updated: string;
  readTime: string;
}

export const ARTICLES: Article[] = [
  {
    slug: "app-store-screenshot-sizes",
    title: "App Store Screenshot Sizes (2026): Every iPhone, iPad and Google Play Size",
    description:
      "Every App Store and Google Play screenshot size for 2026 from Apple's and Google's specs: the required 6.3-inch iPhone slot, 6.9-inch, 6.5-inch, iPad 13-inch, iPhone Duo, Play rules and limits.",
    updated: "2026-10-09",
    readTime: "7 min",
  },
  {
    slug: "best-app-store-screenshot-generators",
    title: "Best App Store Screenshot Generators in 2026 (Honest Comparison)",
    description:
      "Six ways to make App Store and Google Play screenshots in 2026 — MockFrame, AppLaunchpad, AppScreens, Previewed, fastlane frameit and Figma — with prices, strengths and who each one suits.",
    updated: "2026-10-09",
    readTime: "8 min",
  },
];

export function getArticle(slug: string): Article {
  const article = ARTICLES.find((a) => a.slug === slug);
  if (!article) throw new Error(`unknown article ${slug}`);
  return article;
}

export function formatArticleDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric", timeZone: "UTC" });
}
