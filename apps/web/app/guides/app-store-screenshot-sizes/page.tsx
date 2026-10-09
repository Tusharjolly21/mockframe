import type { Metadata } from "next";
import Link from "next/link";
import { ArticleLayout, H2, H3, P, Table, UL, linkClass } from "@/components/marketing/ArticleLayout";
import { getArticle } from "@/lib/articles";
import { SITE_NAME, socialMeta } from "@/lib/site";

/*
 * Sources (re-check both before bumping `updated` in lib/articles.ts):
 * - https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/
 * - https://support.google.com/googleplay/android-developer/answer/9866151
 * Only sizes read from those pages go in the tables. Don't add sizes from
 * memory or third-party guides — several popular ones are out of date.
 */

const article = getArticle("app-store-screenshot-sizes");
const META_TITLE = "App Store Screenshot Sizes (2026 Guide)";

export const metadata: Metadata = {
  title: META_TITLE,
  description: article.description,
  keywords: ["app store screenshot sizes", "app store screenshot size 2026", "iphone screenshot size app store", "app store connect screenshot sizes", "google play screenshot size", "6.9 inch screenshot size", "6.3 inch screenshot size", "ipad 13 inch screenshot size"],
  alternates: { canonical: `/guides/${article.slug}` },
  ...socialMeta({ path: `/guides/${article.slug}`, title: `${META_TITLE} — ${SITE_NAME}`, description: article.description, type: "article" }),
};

const SECTIONS = [
  { id: "quick-answer", title: "Quick answer" },
  { id: "what-changed", title: "What changed in 2026" },
  { id: "iphone", title: "iPhone screenshot sizes" },
  { id: "ipad", title: "iPad screenshot sizes" },
  { id: "rules", title: "App Store upload rules" },
  { id: "google-play", title: "Google Play screenshot sizes" },
  { id: "make-them", title: "Making every size from one design" },
];

const FAQ = [
  {
    q: "What screenshot size does the App Store require in 2026?",
    a: "Apple's screenshot specification lists one required iPhone size: the 6.3-inch display (iPhone with Dynamic Island, medium), at 1206 × 2622 or 1179 × 2556 pixels in portrait. If your app runs on iPad you also need the 13-inch iPad size, 2064 × 2752 or 2048 × 2732.",
  },
  {
    q: "Can I upload 6.9-inch screenshots to the 6.3-inch slot?",
    a: "No. The 6.3-inch slot only accepts 1206 × 2622 or 1179 × 2556 (or the landscape equivalents). Developers report App Store Connect rejecting 1320 × 2868 images there with “File dimensions are invalid”, so render the 6.3-inch set separately.",
  },
  {
    q: "Do I still need 6.5-inch screenshots?",
    a: "Only if you don't provide 6.9-inch screenshots. Apple marks the 6.5-inch (iPhone with Face ID, large) size as required when the app runs on iPhone and no 6.9-inch screenshots are provided.",
  },
  {
    q: "How many screenshots can I upload to the App Store?",
    a: "At least one and up to 10 per display size, as .jpeg, .jpg or .png, with no transparency or alpha channel.",
  },
  {
    q: "What size are Google Play screenshots?",
    a: "Any size from 320 to 3,840 pixels on each side, with the long side no more than twice the short side, as JPEG or 24-bit PNG. You need at least two to publish and can add up to eight per device type. To be eligible for promotion, apps need at least four screenshots of 1080 pixels or more, such as 1080 × 1920 portrait.",
  },
  {
    q: "What is the iPhone Duo screenshot size?",
    a: "Apple's spec lists 1398 × 2034 for the outer display and 2007 × 2853 for the inner display (and the landscape equivalents). Apple says these screenshots will be required from April 2027 for apps built with the iOS 27.1 SDK or later.",
  },
];

export default function AppStoreScreenshotSizesPage() {
  return (
    <ArticleLayout
      article={article}
      sections={SECTIONS}
      faq={FAQ}
      intro={
        <>
          <p>
            Apple and Google both publish exact screenshot specifications, and both change them as new devices ship.
            This guide lists every size from the two official pages — Apple&apos;s{" "}
            <a href="https://developer.apple.com/help/app-store-connect/reference/app-information/screenshot-specifications/" className={linkClass} rel="noopener">
              screenshot specifications
            </a>{" "}
            and Google&apos;s{" "}
            <a href="https://support.google.com/googleplay/android-developer/answer/9866151" className={linkClass} rel="noopener">
              preview asset requirements
            </a>{" "}
            — as of the date above, with the one change in 2026 that catches people out.
          </p>
        </>
      }
    >
      <H2 id="quick-answer">Quick answer</H2>
      <P>If you ship an iPhone and iPad app to both stores, this is the minimum set that covers every required slot:</P>
      <Table
        caption="Minimum screenshot sizes for both stores"
        head={["Slot", "Portrait size (px)", "Required?"]}
        rows={[
          ["iPhone 6.3-inch (Dynamic Island, medium)", "1206 × 2622 or 1179 × 2556", "Yes, if your app runs on iPhone"],
          ["iPhone 6.9-inch (Dynamic Island, large)", "1320 × 2868, 1290 × 2796 or 1260 × 2736", "No, but provide it or 6.5-inch"],
          ["iPhone 6.5-inch (Face ID, large)", "1284 × 2778 or 1242 × 2688", "Only if no 6.9-inch screenshots"],
          ["iPad 13-inch", "2064 × 2752 or 2048 × 2732", "Yes, if your app runs on iPad"],
          ["Google Play phone", "1080 × 1920 (9:16) recommended", "At least 2; 4+ at 1080 px for promotion"],
          ["Google Play feature graphic", "1024 × 500", "Yes"],
        ]}
      />

      <H2 id="what-changed">What changed in 2026</H2>
      <P>
        Through 2025 and most of 2026, many guides — and many screenshot tools — treated the 6.9-inch size
        (1320 × 2868) as the one you needed, with App Store Connect scaling it down for smaller iPhones. Apple&apos;s specification
        now lists the <strong className="text-white">6.3-inch display</strong> (iPhone with Dynamic Island, medium) as the
        required iPhone size, and that slot only accepts 1206 × 2622 or 1179 × 2556. A 6.9-inch image is not accepted
        there, so a set made only at 6.9-inch leaves the required slot empty.
      </P>
      <P>
        Apple&apos;s page is not fully consistent: the summary at the top names the 6.3-inch size as required, while
        the table itself only marks the 6.5-inch size as conditionally required. Until Apple tidies it up, the safe
        choice is to upload a 6.3-inch set <em>and</em> a 6.9-inch set. Apple also added an{" "}
        <strong className="text-white">iPhone Duo</strong> entry with its own outer and inner display sizes, which
        becomes required in April 2027 for apps built with the iOS 27.1 SDK or later.
      </P>

      <H2 id="iphone">iPhone screenshot sizes</H2>
      <P>
        Apple groups iPhones by display type rather than by model. The inch labels are the common shorthand; App Store
        Connect uses the display names in the first column. Landscape sizes are the same numbers swapped.
      </P>
      <Table
        caption="iPhone App Store screenshot sizes"
        head={["Display (App Store Connect name)", "Portrait sizes (px)", "Notes"]}
        rows={[
          ["iPhone Duo — outer display", "1398 × 2034", "Required from April 2027 with the iOS 27.1 SDK or later"],
          ["iPhone Duo — inner display", "2007 × 2853", "Required from April 2027 with the iOS 27.1 SDK or later"],
          ["Dynamic Island, large (6.9″)", "1320 × 2868, 1290 × 2796, 1260 × 2736", "If missing, scaled from Face ID large"],
          ["Face ID, large (6.5″)", "1284 × 2778, 1242 × 2688", "Required if the app runs on iPhone and no 6.9″ screenshots are provided"],
          ["Dynamic Island, medium (6.3″ / 6.1″)", "1206 × 2622, 1179 × 2556", "Listed as required in Apple's summary"],
          ["Face ID, medium (5.8″)", "1170 × 2532, 1125 × 2436, 1080 × 2340", "Optional; scaled from Dynamic Island medium"],
          ["Home Button, large (5.5″)", "1242 × 2208", "Optional"],
          ["Home Button, medium (4.7″)", "750 × 1334", "Optional"],
          ["Home Button, 4″", "640 × 1136 (640 × 1096 without status bar)", "Optional"],
          ["Home Button, 3.5″", "640 × 960 (640 × 920 without status bar)", "Optional"],
        ]}
      />
      <H3>Which iPhones are in each group?</H3>
      <UL
        items={[
          "6.3-inch / 6.1-inch (1206 × 2622 and 1179 × 2556): the standard and Pro models with Dynamic Island, such as iPhone 16 Pro and iPhone 17 Pro.",
          "6.9-inch (1320 × 2868): the largest Pro Max models, such as iPhone 16 Pro Max and iPhone 17 Pro Max.",
          "6.5-inch (1284 × 2778): older large Face ID models, such as the Plus and Pro Max phones before Dynamic Island.",
        ]}
      />

      <H2 id="ipad">iPad screenshot sizes</H2>
      <Table
        caption="iPad App Store screenshot sizes"
        head={["Display", "Portrait sizes (px)", "Notes"]}
        rows={[
          ["iPad 13-inch", "2064 × 2752, 2048 × 2732", "Required if your app runs on iPad"],
          ["iPad 12.9-inch (iPad Pro 2nd gen)", "2048 × 2732", "Optional; scaled from 13-inch if missing"],
        ]}
      />
      <P>Smaller iPad sizes (11-inch, 10.5-inch, 9.7-inch) are optional and are scaled from the larger sets when you don&apos;t provide them.</P>

      <H2 id="rules">App Store upload rules</H2>
      <UL
        items={[
          "At least one screenshot, and up to 10, per display size.",
          "Formats: .jpeg, .jpg or .png.",
          "No transparency: images can't contain an alpha channel. Export PNGs flattened onto a solid background.",
          "Portrait and landscape are both accepted; the landscape size is the portrait size swapped.",
          "Screenshots must follow the App Store Review Guidelines — they should show the app in use, not just a title card.",
        ]}
      />

      <H2 id="google-play">Google Play screenshot sizes</H2>
      <P>Google Play is more flexible than Apple: it sets limits rather than exact sizes.</P>
      <Table
        caption="Google Play graphic asset requirements"
        head={["Asset", "Size", "Rules"]}
        rows={[
          ["Phone screenshots", "320–3,840 px per side; long side ≤ 2× short side", "JPEG or 24-bit PNG, no alpha. At least 2 to publish, up to 8 per device type"],
          ["Screenshots for promotion", "1080 × 1920 (9:16) or 1920 × 1080 (16:9) minimum", "Apps need 4 or more at 1080 px+; games 3 or more"],
          ["Tablet / Chromebook", "1,080–7,680 px, 16:9 or 9:16", "At least 4"],
          ["Wear OS", "1:1, at least 384 × 384", "No transparency or masking"],
          ["Feature graphic", "1024 × 500", "JPEG or 24-bit PNG, no alpha"],
          ["App icon", "512 × 512", "32-bit PNG with alpha, up to 1,024 KB"],
        ]}
      />

      <H2 id="make-them">Making every size from one design</H2>
      <P>
        Exporting each size by hand is where most of the time goes: the 6.3-inch, 6.9-inch and 6.5-inch sets are all
        slightly different shapes, and Google Play wants a different ratio again. MockFrame&apos;s{" "}
        <Link href="/app-store-screenshots" className={linkClass}>
          App Store screenshot generator
        </Link>{" "}
        takes 3–10 raw screenshots and one design and exports the 6.3-inch, 6.9-inch and 6.5-inch iPhone sets, iPad
        13-inch, Google Play phone screenshots and the feature graphic in one zip, with a README that says which folder
        goes in which App Store Connect slot. You can export your first full pack free to try it.
      </P>
      <P>
        Comparing tools? See{" "}
        <Link href="/guides/best-app-store-screenshot-generators" className={linkClass}>
          the best App Store screenshot generators in 2026
        </Link>
        , or{" "}
        <Link href="/guides/design-app-store-screenshots" className={linkClass}>
          how to design a screenshot set
        </Link>{" "}
        that converts.
      </P>
    </ArticleLayout>
  );
}
