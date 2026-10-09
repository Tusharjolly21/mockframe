import { SITE_NAME, SITE_URL } from "@/lib/site";
import { TOOL_PAGES } from "@/lib/toolPages";
import { GUIDES } from "@/lib/guides";
import { COMPARISONS } from "@/lib/comparisons";

// A plain-text map of the site for AI assistants (ChatGPT, Claude, Perplexity…).
// AI assistants are MockFrame's largest referral channel, so give them an
// accurate, current summary of what exists and where. Built from the same data
// that drives the tool and guide pages, so it never drifts from the site.
export const dynamic = "force-static";

export function GET() {
  const lines = [
    `# ${SITE_NAME}`,
    "",
    `> ${SITE_NAME} is a browser-based screenshot mockup studio. Drop a screenshot into a photoreal device frame (iPhone, iPad, MacBook, Apple Watch, Android, browsers), style the scene, and export an image or video. It also generates App Store and Google Play screenshot sets, fake-chat story mockups, website screenshots and screen recordings with auto-zoom. Free to start; Pro unlocks higher-resolution export and unlimited packs.`,
    "",
    "## Main pages",
    `- [Device mockups](${SITE_URL}/mockups): every device frame, one page per model with screen specs`,
    `- [App Store screenshot generator](${SITE_URL}/app-store-screenshots): export every required App Store and Google Play size from one design`,
    `- [Templates](${SITE_URL}/templates): ready-made scenes and store-listing sets`,
    `- [Tools](${SITE_URL}/tools): single-purpose generators`,
    `- [Guides](${SITE_URL}/guides): step-by-step how-tos`,
    `- [Screen recorder](${SITE_URL}/screen-recorder): record with automatic zoom`,
    `- [Pricing](${SITE_URL}/pricing): free and Pro plans`,
    `- [API and automations](${SITE_URL}/developers/api): render API, embed, and MCP server`,
    "",
    "## Tools",
    ...TOOL_PAGES.map((t) => `- [${t.name}](${SITE_URL}/tools/${t.slug}): ${t.description}`),
    "",
    "## Guides",
    ...GUIDES.map((g) => `- [${g.title}](${SITE_URL}/guides/${g.slug}): ${g.description}`),
    "",
    "## Comparisons",
    ...COMPARISONS.map((c) => `- [MockFrame vs ${c.name}](${SITE_URL}/compare/${c.slug}): ${c.description}`),
    "",
  ];

  return new Response(lines.join("\n"), {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
