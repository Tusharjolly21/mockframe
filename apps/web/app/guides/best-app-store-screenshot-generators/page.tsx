import type { Metadata } from "next";
import Link from "next/link";
import { ArticleLayout, H2, H3, P, Table, UL, linkClass } from "@/components/marketing/ArticleLayout";
import { getArticle } from "@/lib/articles";
import { SITE_NAME, socialMeta } from "@/lib/site";

/*
 * Competitor facts must match lib/comparisons.ts (same sources, same dates).
 * Previewed and AppLaunchpad were read from their own pricing pages in October
 * 2026; AppScreens details are the July 2026 reading. Don't add prices you
 * haven't read on the vendor's own site.
 */

const article = getArticle("best-app-store-screenshot-generators");
const META_TITLE = "Best App Store Screenshot Generators (2026)";

export const metadata: Metadata = {
  title: META_TITLE,
  description: article.description,
  keywords: ["best app store screenshot generator", "app store screenshot generator", "app store screenshot tools", "app screenshot maker", "applaunchpad alternative", "appscreens alternative", "previewed alternative", "fastlane frameit"],
  alternates: { canonical: `/guides/${article.slug}` },
  ...socialMeta({ path: `/guides/${article.slug}`, title: `${META_TITLE} — ${SITE_NAME}`, description: article.description, type: "article" }),
};

const SECTIONS = [
  { id: "at-a-glance", title: "At a glance" },
  { id: "how-we-compared", title: "How we compared them" },
  { id: "mockframe", title: "MockFrame" },
  { id: "applaunchpad", title: "AppLaunchpad" },
  { id: "appscreens", title: "AppScreens" },
  { id: "previewed", title: "Previewed" },
  { id: "frameit", title: "fastlane frameit" },
  { id: "figma", title: "Figma templates" },
  { id: "which", title: "Which one should you use?" },
];

const FAQ = [
  {
    q: "What is the best free App Store screenshot generator?",
    a: "It depends on how much you'll export. MockFrame's free plan exports your first full store pack — every required App Store and Google Play size — with no watermark, though publishing it in a store listing needs the Pro commercial license. Previewed's free plan exports unlimited 2D images at 720p under a Creative Commons attribution license. fastlane frameit and Figma templates are free but take more manual work.",
  },
  {
    q: "Do I need a paid tool to make App Store screenshots?",
    a: "No. You can design screenshots in Figma or frame them with fastlane frameit for free. Paid tools save time by generating every required size from one design, writing captions and handling localization.",
  },
  {
    q: "Which tool handles the 2026 iPhone size change?",
    a: "Check that a tool exports the 6.3-inch iPhone size (1206 × 2622), which Apple's spec now lists as the required iPhone slot and which won't accept 6.9-inch images. MockFrame exports 6.3-inch, 6.9-inch and 6.5-inch sets from one design.",
  },
  {
    q: "Is MockFrame biased in this list?",
    a: "We make MockFrame, so yes, read it with that in mind. We've tried to say plainly where other tools are better — for example AppLaunchpad's template library, AppScreens' extra storefronts and Previewed's 3D — and every competitor detail is dated so you can check it.",
  },
];

export default function BestGeneratorsPage() {
  return (
    <ArticleLayout
      article={article}
      sections={SECTIONS}
      faq={FAQ}
      intro={
        <>
          <p>
            App Store screenshots are the first thing most people judge your app by, and making them is tedious: several
            exact sizes per store, captions that fit at thumbnail size, and the whole set again for every release and
            language. These are the six approaches worth considering in 2026, from dedicated generators to free
            do-it-yourself routes.
          </p>
          <p className="text-[14px] text-white/50">
            Disclosure: we make MockFrame, which is on this list. Competitor details come from each vendor&apos;s own
            site on the dates noted and may have changed since.
          </p>
        </>
      }
    >
      <H2 id="at-a-glance">At a glance</H2>
      <Table
        caption="App Store screenshot generators compared"
        head={["Tool", "Best for", "Free option", "Paid"]}
        rows={[
          ["MockFrame", "Every store size from one design, AI captions, fastlane", "First full pack free to try (personal-use license)", "$9.99/mo or $59.99/yr, commercial license"],
          ["AppLaunchpad", "Huge template library", "Limited exports and assets", "Pro subscription, local-currency pricing"],
          ["AppScreens", "Teams, extra storefronts", "Trial of the editor", "Subscription (see appscreens.com)"],
          ["Previewed", "3D device renders and video", "Unlimited 720p, CC attribution", "$9.99 one-time (10 exports) or $19/mo billed yearly"],
          ["fastlane frameit", "Automated framing in CI", "Free, open source", "—"],
          ["Figma templates", "Full design control", "Free", "—"],
        ]}
      />

      <H2 id="how-we-compared">How we compared them</H2>
      <UL
        items={[
          <>Does it produce every size the stores require — including Apple&apos;s 6.3-inch iPhone slot (see the <Link href="/guides/app-store-screenshot-sizes" className={linkClass}>2026 size guide</Link>)?</>,
          "How long does it take to go from raw screenshots to an uploadable set?",
          "What does the free option actually let you export, and at what resolution or license?",
          "Localization: can it translate captions and export per language?",
          "Does it fit a release workflow (fastlane, re-running for the next version)?",
        ]}
      />

      <H2 id="mockframe">1. MockFrame</H2>
      <P>
        MockFrame&apos;s{" "}
        <Link href="/app-store-screenshots" className={linkClass}>
          App Store screenshot generator
        </Link>{" "}
        turns 3–10 raw screenshots into a framed, captioned set and exports every App Store and Google Play size in one
        zip — iPhone 6.3-inch, 6.9-inch and 6.5-inch, iPad 13-inch, Play phone screenshots and the feature graphic — with
        a README that maps each folder to its upload slot, or a fastlane deliver/supply layout. The{" "}
        <Link href="/ai" className={linkClass}>
          AI generator
        </Link>{" "}
        drafts the captions and layout from a one-sentence description of your app.
      </P>
      <UL
        items={[
          "Strengths: one design to every required size; AI-written captions; translation into 39 store languages on Pro; the same plan covers device mockups, promo videos and screen recordings.",
          "Weaknesses: eight pack styles rather than hundreds of templates; Apple and Google only (no Microsoft or Amazon storefronts).",
          "Price: your first full pack exports free to try; Pro ($9.99 a month or $59.99 a year) adds the commercial license a store listing needs, plus unlimited packs.",
        ]}
      />

      <H2 id="applaunchpad">2. AppLaunchpad</H2>
      <P>
        AppLaunchpad is a dedicated screenshot builder with a very large library: its Pro plan lists 1,000+ templates,
        10K+ graphics and 700+ fonts, AI translation, and frames for the newest devices including iPhone 18 and iPhone
        Duo (checked October 2026).
      </P>
      <UL
        items={[
          "Strengths: the biggest template library here; quick to support new devices; brand asset management across projects.",
          "Weaknesses: the free plan limits exports and assets; prices are shown in local currency, so compare carefully.",
          <>Compared in detail: <Link href="/compare/applaunchpad" className={linkClass}>MockFrame vs AppLaunchpad</Link>.</>,
        ]}
      />

      <H2 id="appscreens">3. AppScreens</H2>
      <P>
        AppScreens is one of the longest-running screenshot generators, with a template editor that scales a design
        across device sizes, bulk localization, and support for storefronts beyond Apple and Google such as Microsoft
        and Amazon (as of July 2026).
      </P>
      <UL
        items={[
          "Strengths: mature localization; extra storefronts; suited to teams shipping often.",
          "Weaknesses: full-resolution output is on paid plans.",
          <>Compared in detail: <Link href="/compare/appscreens" className={linkClass}>MockFrame vs AppScreens</Link>.</>,
        ]}
      />

      <H2 id="previewed">4. Previewed</H2>
      <P>
        Previewed is a browser mockup tool whose standout is real 3D: rotate and light a device, then animate it for a
        promo video. It also has panoramic App Store screenshot templates. Its free Lite plan exports unlimited 2D images
        at 720p under a CC attribution license; Plus is $9.99 one-time for 10 exports at 1080p+, and Pro is $19 a month
        billed $228 a year (checked October 2026).
      </P>
      <UL
        items={[
          "Strengths: true 3D snapshots and animations; a one-time option for occasional use.",
          "Weaknesses: free exports are 720p with attribution; generating every store size is less automated.",
          <>Compared in detail: <Link href="/compare/previewed" className={linkClass}>MockFrame vs Previewed</Link>.</>,
        ]}
      />

      <H2 id="frameit">5. fastlane frameit</H2>
      <P>
        frameit is part of fastlane, the open-source iOS and Android release tool. It puts device frames around
        screenshots you&apos;ve already captured (for example with fastlane snapshot) and can add a title and background
        from a config file, so framing runs automatically in your release pipeline.
      </P>
      <UL
        items={[
          "Strengths: free; fully automated once configured; screenshots regenerate with every build.",
          "Weaknesses: setup takes developer time; styling is basic; frames depend on the device set frameit ships, which can lag new iPhones.",
        ]}
      />

      <H2 id="figma">6. Figma templates</H2>
      <P>
        Designing screenshots in Figma from a community template gives you complete control and costs nothing if you
        already use Figma. The work is in the details: one frame per required size, exporting each one, and repeating
        it for every language and release.
      </P>
      <UL
        items={[
          "Strengths: unlimited design freedom; easy hand-off with the rest of your design work.",
          "Weaknesses: manual resizing and exporting for every slot; no built-in translation or store-ready zip.",
          <>
            Tip: MockFrame&apos;s <Link href="/figma-plugin" className={linkClass}>Figma plugin</Link> can turn
            frames from your file into a store listing set.
          </>,
        ]}
      />

      <H2 id="which">Which one should you use?</H2>
      <H3>Indie developer shipping to both stores</H3>
      <P>Use a generator that exports every size from one design. MockFrame lets you export a full pack free to check the result before paying for Pro.</P>
      <H3>Team that lives in templates</H3>
      <P>AppLaunchpad&apos;s library is the largest here; AppScreens if you also publish to Microsoft or Amazon storefronts.</P>
      <H3>App launch video with 3D devices</H3>
      <P>Previewed&apos;s 3D animation is the strongest option.</P>
      <H3>Fully automated releases</H3>
      <P>fastlane frameit, or a generator with a fastlane export (MockFrame&apos;s pack zip drops into fastlane&apos;s folders).</P>
    </ArticleLayout>
  );
}
