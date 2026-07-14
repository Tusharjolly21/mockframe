export interface ToolPage {
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  editorHref: string;
  cta: string;
  image: string;
  imageAlt: string;
  accent: string;
  steps: [string, string][];
  benefits: [string, string][];
}

export const TOOL_PAGES: ToolPage[] = [
  {
    slug: "website-screenshot",
    name: "Website Screenshot Generator",
    eyebrow: "Capture any public URL",
    description: "Capture desktop or mobile pages, wait for lazy-loaded images, place the result in a browser or device, and export it at social-ready sizes.",
    editorHref: "/editor?capture=1",
    cta: "Capture a website",
    image: "/hero/lib-macbook.webp",
    imageAlt: "Website screenshot shown in a MacBook mockup",
    accent: "#22d3ee",
    steps: [["Paste a URL", "Choose desktop or mobile and whether to capture the full page."], ["Let the page settle", "MockFrame scrolls lazy pages and waits for images before capture."], ["Frame and export", "Use a browser, phone, tablet or laptop and export the finished scene."]],
    benefits: [["Lazy-load support", "Capture images and sections that normally appear only after scrolling."], ["Public-target protection", "Private network addresses and unsafe redirects are rejected server-side."], ["Real device output", "Move from a raw page capture to a believable marketing mockup in one workflow."]],
  },
  {
    slug: "code-screenshot",
    name: "Code Screenshot Generator",
    eyebrow: "Readable code for social and docs",
    description: "Turn code and diffs into crisp, syntax-highlighted cards with adjustable font size, width, chrome, background and export ratio.",
    editorHref: "/templates/code",
    cta: "Create a code image",
    image: "/hero/hero-iphone.webp",
    imageAlt: "Polished content shown inside a device mockup",
    accent: "#a78bfa",
    steps: [["Paste code", "Choose from common languages or use the dedicated diff highlighter."], ["Make it readable", "Adjust font, editor width, line spacing, theme and window chrome."], ["Export anywhere", "Create a landscape post, square card, story or custom-size asset."]],
    benefits: [["Diff highlighting", "Added and removed lines remain visually distinct."], ["Multiple code fonts", "Use clear monospace families designed for small and large exports."], ["Reusable styling", "Save the finished composition as a personal template or shared theme."]],
  },
  {
    slug: "tweet-screenshot",
    name: "X Post Screenshot Generator",
    eyebrow: "Paste a post URL",
    description: "Import an X post, adjust its readable width and text scale, then present it as a clean standalone card or inside a device mockup.",
    editorHref: "/templates/post",
    cta: "Create an X post image",
    image: "/hero/lib-iphone-desert.webp",
    imageAlt: "Social post displayed in a photoreal phone",
    accent: "#f4f4f5",
    steps: [["Paste the post", "Import author, content, media and engagement details from its URL."], ["Choose the layout", "Control post width, text size, metrics, media and standalone mode."], ["Style the scene", "Apply a theme, background, device and target social aspect ratio."]],
    benefits: [["Readable story exports", "Increase text size and shorten line length for 9:16 sharing."], ["Media grids", "Present posts containing one to four attached images."], ["Standalone or device", "Export the post card alone or place it inside a phone."]],
  },
  {
    slug: "bluesky-screenshot",
    name: "Bluesky Post Screenshot Generator",
    eyebrow: "Import from Bluesky",
    description: "Convert a Bluesky post into a polished, readable image for stories, feeds, articles and presentations.",
    editorHref: "/templates/post",
    cta: "Create a Bluesky image",
    image: "/hero/lib-ipad.webp",
    imageAlt: "Social content presented in an iPad mockup",
    accent: "#38bdf8",
    steps: [["Paste a Bluesky URL", "MockFrame imports the public post and embedded link information."], ["Resize the post", "Adjust card width and typography instead of scaling the whole card down."], ["Export for the destination", "Pick story, square, landscape or a custom canvas."]],
    benefits: [["Public API import", "No Bluesky password or private account access is required."], ["Text-first controls", "Make long posts genuinely readable on mobile."], ["Link previews", "Keep useful embedded link context in the finished image."]],
  },
  {
    slug: "app-store-screenshot",
    name: "App Store Screenshot Generator",
    eyebrow: "Build a consistent screenshot set",
    description: "Create device-framed App Store and Play Store images, reuse one visual system, and export multiple independently edited screenshots together.",
    editorHref: "/editor",
    cta: "Build an App Store set",
    image: "/hero/lib-ipad-flat.webp",
    imageAlt: "App screenshot shown in an iPad mockup",
    accent: "#34d399",
    steps: [["Add your screens", "Upload each product screen as its own shot in the batch."], ["Compose independently", "Use one, two or three devices and different angles on each shot."], ["Export the set", "Download every finished shot together as a ZIP."]],
    benefits: [["Independent scenes", "One shot can be minimal while another uses multiple devices."], ["Shared visual system", "Apply themes and personal templates across the whole campaign."], ["Bulk export", "Keep filenames and output dimensions consistent across a release."]],
  },
];

export function toolPage(slug: string): ToolPage | undefined {
  return TOOL_PAGES.find((tool) => tool.slug === slug);
}
