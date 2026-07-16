import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { SITE_NAME, SITE_URL } from "@/lib/site";

const GOOGLE_ANALYTICS_ID = "G-CN1PEZYM0L";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    // keyword-led default (used for any page without its own title), brand last
    // per Google's title guidance; page-level titles override via the template.
    default: "MockFrame — Device Mockup & Screenshot Generator",
    template: `%s — ${SITE_NAME}`,
  },
  description:
    "Free device mockup generator. Drop any screenshot into a photoreal iPhone, MacBook or browser frame, add chat and app screens, style the scene, and export a share-ready image in seconds — no design tools, right in your browser.",
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: { index: true, follow: true },
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    url: SITE_URL,
    locale: "en_US",
  },
  twitter: { card: "summary_large_image" },
};

/** Global Organization + WebSite JSON-LD — establishes the brand as an entity
 *  (knowledge panel eligibility). No competitor in this niche emits either.
 *  NOTE: no SearchAction/sitelinks-searchbox — that requires a real site-search
 *  endpoint returning results, which we don't have; claiming it would be false. */
const ORG_AND_SITE_JSONLD = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: `${SITE_URL}/icon.svg`,
    },
    {
      "@type": "WebSite",
      "@id": `${SITE_URL}/#website`,
      name: SITE_NAME,
      url: SITE_URL,
      publisher: { "@id": `${SITE_URL}/#organization` },
    },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GOOGLE_ANALYTICS_ID}`}
          strategy="afterInteractive"
        />
        <Script id="google-analytics" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GOOGLE_ANALYTICS_ID}');
          `}
        </Script>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* crossOrigin makes cssRules readable so the client exporter can inline @font-face */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;700&family=IBM+Plex+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;600&family=Lora:wght@400;500;600;700&family=Manrope:wght@400;500;600;700;800&family=Merriweather:wght@400;700&family=Outfit:wght@400;500;600;700&family=Playfair+Display:wght@400;600;700&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Sora:wght@400;500;600;700&family=Space+Grotesk:wght@400;500;700&display=swap"
          rel="stylesheet"
          crossOrigin="anonymous"
        />
      </head>
      {/* suppressHydrationWarning: browser extensions (ColorZilla's
          cz-shortcut-listen, Grammarly, etc.) mutate <body> before React
          hydrates — this silences that attribute-only noise, nothing else. */}
      <body className="bg-zinc-950 text-zinc-200 antialiased" suppressHydrationWarning>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(ORG_AND_SITE_JSONLD) }}
        />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
