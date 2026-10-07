export type Guide = {
  slug: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  editorHref: string;
  /** real screenshot of the app shown as the guide hero */
  hero?: string;
  /** the hero is artwork, not an editor capture: show it without browser chrome */
  heroBare?: boolean;
  /** 1200px JPEG of the hero for social cards */
  og?: string;
  /** accent for the guide's card and step markers */
  accent?: string;
  steps: { title: string; body: string; image?: string; imageAlt?: string }[];
  tips: string[];
};

export const GUIDES: Guide[] = [
  {
    slug: "use-a-store-listing-set",
    hero: "/guides/store-sets-hero.webp",
    og: "/guides/store-sets-hero-og.jpg",
    heroBare: true,
    accent: "#ff5a5f",
    title: "Ship App Store screenshots from a ready-made set",
    description: "Pick one of the eight-shot store listing sets, swap in your own screens and export every shot at the size each store asks for.",
    category: "Store listing",
    readTime: "4 min",
    editorHref: "/templates#store-sets",
    steps: [
      { title: "Pick a set and a store", body: "Open Templates and scroll to Store listing sets. Switch between App Store (1320 × 2868) and Google Play (1080 × 1920) to preview each set at that store's size, then choose Use this set.", image: "/guides/templates-gallery.webp", imageAlt: "The templates gallery showing the Stride and Penny store listing sets" },
      { title: "Move through the eight shots", body: "The set opens in the editor with a filmstrip under the canvas. Click any shot to edit it: headlines, colours, phones and cards are ordinary layers, so you can restyle each one.", image: "/guides/editor-set.webp", imageAlt: "A Stride store listing shot open in the editor with the eight-shot filmstrip below the canvas" },
      { title: "Swap in your own screens", body: "Click the image button beside the filmstrip and pick up to eight screenshots, named or ordered 1 to 8. Each one replaces its sample screen everywhere it appears, including the cards lifted out of the phone.", image: "/guides/swap-screens.webp", imageAlt: "The Hush set after swapping in eight new screens, with a confirmation toast" },
      { title: "Export the whole listing", body: "Use the download button on the filmstrip to open Shot batch, then export all eight shots as one ZIP, or open each shot and export it on its own.", image: "/guides/shot-batch.webp", imageAlt: "The Shot batch panel ready to export all eight shots of the Penny set" },
    ],
    tips: ["Google Play shows the first three screenshots without scrolling, so lead with the strongest ones.", "Keep headlines to six words or fewer; they are read at thumbnail size.", "Use the same set for both stores so the listing feels like one product."],
  },
  {
    slug: "create-device-mockup",
    hero: "/guides/chat-editor.webp",
    og: "/guides/chat-editor-og.jpg",
    accent: "#a78bfa",
    title: "Create a polished device mockup",
    description: "Turn a raw app screenshot into a composed phone, tablet, watch or laptop scene in three steps: Content, Style, Export.",
    category: "Mockups",
    readTime: "4 min",
    editorHref: "/editor",
    steps: [
      { title: "Add your screen", body: "In Content, upload, paste or drop a screenshot, capture a website, or generate a realistic app screen. MockFrame keeps the source at its original quality.", image: "/guides/chat-editor.webp", imageAlt: "An iMessage screen inside an iPhone on the MockFrame canvas, with the Content step open" },
      { title: "Choose the real device", body: "Open the Device tab and pick the phone, tablet, watch, laptop or browser that matches your screenshot. Frame colour and shadow live on the same tab.", image: "/guides/device-picker.webp", imageAlt: "The device picker open over a WhatsApp chat mockup, filtered to phones" },
      { title: "Style the scene", body: "In Style, set the canvas size, background, pattern and effects. A quieter backdrop keeps the device's silhouette and the screen text readable.", image: "/guides/style-backgrounds.webp", imageAlt: "The Style step with background swatches, gradients and studio backdrops" },
      { title: "Export at the destination size", body: "The Export step downloads PNG, JPEG or WebP at 1× to 3×, copies to the clipboard, or turns the scene into a video. Pick the platform ratio before exporting instead of cropping afterwards.", image: "/guides/export-step.webp", imageAlt: "The Export step with Download image, Copy and more ways to use the mockup" },
    ],
    tips: ["Use one focal point per scene.", "Match the screenshot orientation to the device.", "Use a quieter backdrop when the screenshot already has many colours."],
  },
  {
    slug: "make-a-content-card",
    hero: "/guides/card-editor.webp",
    og: "/guides/card-editor-og.jpg",
    accent: "#1ed760",
    title: "Make a share-ready card without a device",
    description: "Use the content-card templates for posts, code, charts, notifications, Now Playing and store listings, then edit every word and number.",
    category: "Templates",
    readTime: "3 min",
    editorHref: "/templates#content-cards",
    steps: [
      { title: "Open a card template", body: "Templates → Content cards lists every card. Each opens on its own canvas and background, sized so the card sits comfortably in the frame.", image: "/guides/templates-gallery.webp", imageAlt: "The MockFrame templates gallery" },
      { title: "Edit the content", body: "The Card tab is Screen Studio for that card: titles, names, ratings, progress and colours. Changes render live and stay editable; nothing is flattened.", image: "/guides/card-editor.webp", imageAlt: "The Spotify Now Playing card open in the editor with its fields in the left panel" },
      { title: "Paste a post URL", body: "For posts, paste a public X, Bluesky, Threads, LinkedIn or Mastodon link on the templates page. MockFrame fills in the author, text and counts, and you can still edit all of it.", image: "/guides/post-editor.webp", imageAlt: "A post card on a striped blue background in the editor" },
      { title: "Place it or export it", body: "Export the card on its own with a transparent background, or keep it in a scene beside a phone or browser for a richer composition." },
    ],
    tips: ["Set the canvas to Transparent for a clean cut-out on any page.", "Upload a real avatar or album cover; it makes the card instantly believable.", "Keep numbers plausible; round figures read as fake."],
  },
  {
    slug: "capture-full-web-page",
    hero: "/guides/capture-dialog.webp",
    og: "/guides/capture-dialog-og.jpg",
    accent: "#22d3ee",
    title: "Capture a full-page website screenshot",
    description: "Generate a clean website capture from a URL and wait for content that loads while scrolling.",
    category: "Website capture",
    readTime: "3 min",
    editorHref: "/editor?capture=1",
    steps: [
      { title: "Open website capture", body: "Choose Website in the Content step (or Replace with a website capture on an existing screen) and enter a public HTTPS address.", image: "/guides/capture-dialog.webp", imageAlt: "The Capture a website dialog with desktop and mobile options" },
      { title: "Enable full page and lazy loading", body: "Use Full page when the page runs below the fold, and Load lazy images before capture so the pass scrolls the document before rendering. Add a settle delay for animated pages." },
      { title: "Review the result", body: "Check sticky headers, consent dialogs and dynamic sections. Recapture after closing overlays when the website allows it." },
      { title: "Place it in a frame", body: "Use a browser, laptop or desktop frame and adjust the screenshot fit without stretching the source. The Layouts panel pairs the site with a phone in one click.", image: "/guides/browser-frame.webp", imageAlt: "A captured website inside a browser frame, with web and phone layout presets on the right" },
    ],
    tips: ["Use a stable public URL rather than a logged-in page.", "Long pages may need a taller canvas or a focused crop.", "Capture at desktop width for laptop and browser mockups."],
  },
  {
    slug: "design-app-store-screenshots",
    hero: "/guides/shot-batch.webp",
    og: "/guides/shot-batch-og.jpg",
    accent: "#14b892",
    title: "Design an App Store screenshot set from scratch",
    description: "Build several independent shots, reuse one visual system, and export the set together.",
    category: "Bulk workflow",
    readTime: "5 min",
    editorHref: "/app-store-screenshots",
    steps: [
      { title: "Create one shot per message", body: "Open Shot batch from the More tools menu and add a shot for every message. Each shot keeps its own devices, text and media.", image: "/guides/shot-batch.webp", imageAlt: "The Shot batch panel with an eight-shot set" },
      { title: "Set the first composition", body: "Choose the destination size, device count and backdrop. Make the first shot the visual reference for the rest." },
      { title: "Reuse the look", body: "Save the styling as a theme and apply it to the other shots, then vary only what supports each message. Or start from a store listing set, which is already a consistent system.", image: "/guides/style-backgrounds.webp", imageAlt: "Background and style options in the editor" },
      { title: "Export the batch", body: "Review every shot, then export the complete set as a ZIP when the sequence is ready." },
    ],
    tips: ["Keep typography and backdrop rules consistent across the set.", "Change the device layout only when it helps the story.", "Check the smallest text at real phone size."],
  },
  {
    slug: "share-a-brand-theme",
    hero: "/guides/style-backgrounds.webp",
    accent: "#fbbf24",
    title: "Share a brand theme with your team",
    description: "Move the same backdrop, typography and styling rules between collaborators without manual matching.",
    category: "Themes",
    readTime: "2 min",
    editorHref: "/editor",
    steps: [
      { title: "Finish the reference style", body: "Set the canvas, backdrop, typography, pattern and effects that should stay consistent.", image: "/guides/style-backgrounds.webp", imageAlt: "Background and pattern styling options in the Style step" },
      { title: "Save the theme", body: "Open Themes in the right panel and save the current styling with a clear brand or campaign name." },
      { title: "Export theme JSON", body: "Download the theme and send that small file to a collaborator. Uploaded screenshots are not embedded in it." },
      { title: "Import and apply", body: "The recipient imports the JSON and applies the same styling to their own scenes." },
    ],
    tips: ["Add campaign names or dates to theme names.", "Keep brand assets in a shared team folder.", "Re-export the theme after any brand change so everyone stays in sync."],
  },
  {
    slug: "saas-conversion-screenshot-study",
    hero: "/guides/browser-frame.webp",
    og: "/guides/browser-frame-og.jpg",
    accent: "#38bdf8",
    title: "Why framed screenshots work on SaaS landing pages",
    description: "How presenting your product in realistic browser and device frames builds trust and context on a landing page, and how to test the change on your own site.",
    category: "Playbook",
    readTime: "6 min",
    editorHref: "/editor",
    steps: [
      { title: "Identify visual friction", body: "Raw, unmasked screenshots look generic and fail to stand out. Presenting screenshots in realistic browser or phone frames establishes trust and product context instantly." },
      { title: "Frame your product value", body: "Use MockFrame's Chrome Browser or iPhone 16 Pro frames to place the user inside your actual SaaS experience.", image: "/guides/browser-frame.webp", imageAlt: "A SaaS dashboard presented in a Chrome browser frame" },
      { title: "Align brand aesthetics", body: "Apply cohesive color patterns and mesh gradients to blend the mockup with your landing page design.", image: "/guides/style-backgrounds.webp", imageAlt: "Mesh gradient and pattern styling controls" },
      { title: "Measure the change", body: "Ship the framed visuals as an A/B test against your current screenshots and compare scroll depth and sign-up rate over a few weeks — your own numbers beat any benchmark." },
    ],
    tips: ["Use MockFrame's Zoom Focus to direct reader attention to CTA areas.", "Set transparent canvas backgrounds for seamless cut-outs on light and dark page layouts.", "A quiet, professional gradient backdrop guarantees readable screen text."],
  },
  {
    slug: "create-interactive-product-walkthroughs",
    hero: "/guides/animate-panel.webp",
    accent: "#f472b6",
    title: "Design product replay videos for Product Hunt",
    description: "Learn how to use MockFrame's animation scrubber and camera movement presets to create high-converting video mockups for your next product launch.",
    category: "Guides",
    readTime: "5 min",
    editorHref: "/editor",
    steps: [
      { title: "Plan your feature sequence", body: "Select the specific screenshot cards and messaging blocks that demonstrate your product solving a core pain point step-by-step." },
      { title: "Configure replay timeline", body: "Arrange your chat bubble reveals or UI changes in the timeline. Use the MockFrame scrubber to fine-tune hold and fade timings.", image: "/guides/animate-panel.webp", imageAlt: "The replay timeline scrubber under a chat scene" },
      { title: "Enable 3D camera effects", body: "Toggle Zoom Focus and Tilt Float in the Animate Panel to add realistic, dynamic perspective changes to the preview." },
      { title: "Add sound & export", body: "Turn on typing clicks and the lo-fi music bed, pick 30 or 60 fps and up to 4K, then export an MP4 that's ready for Product Hunt, X and LinkedIn." },
    ],
    tips: ["Keep your video under 15 seconds to maximize completion rates.", "Sync typing indicator dots with sound ticks to make the preview feel organic.", "Include a clear, visually distinct call-to-action on the final frame."],
  },
];

export function getGuide(slug: string) {
  return GUIDES.find((guide) => guide.slug === slug);
}
