export type Guide = {
  slug: string;
  title: string;
  description: string;
  category: string;
  readTime: string;
  editorHref: string;
  steps: { title: string; body: string }[];
  tips: string[];
};

export const GUIDES: Guide[] = [
  {
    slug: "create-device-mockup",
    title: "Create a polished device mockup",
    description: "Turn a raw app screenshot into a composed phone, tablet, watch or laptop scene.",
    category: "Mockups",
    readTime: "4 min",
    editorHref: "/editor",
    steps: [
      { title: "Add the screenshot", body: "Upload, paste, or drop your screenshot into the first shot. MockFrame keeps the source at its original quality." },
      { title: "Choose the real device", body: "Open Device and select the phone, tablet, watch or laptop that matches your screenshot. Screen geometry is applied by the device template." },
      { title: "Style the composition", body: "Set the canvas ratio, backdrop, pattern and device transform. Keep contrast around the device so its silhouette remains clear." },
      { title: "Export at the destination size", body: "Choose PNG, JPEG or WebP and the required scale. Use the platform ratio before export instead of cropping afterward." },
    ],
    tips: ["Use one visual focal point per scene.", "Match the screenshot orientation to the selected device.", "Use a quieter backdrop when the screenshot already contains many colors."],
  },
  {
    slug: "capture-full-web-page",
    title: "Capture a full website, including lazy-loaded images",
    description: "Generate a clean website capture from a URL and wait for content that loads while scrolling.",
    category: "Website capture",
    readTime: "3 min",
    editorHref: "/editor?capture=1",
    steps: [
      { title: "Open website capture", body: "Start the URL workflow from the editor and enter a public HTTPS address." },
      { title: "Enable full-page and lazy load", body: "Use full-page capture when the page extends below the fold. Enable lazy-load preparation so the capture pass scrolls through the document before rendering." },
      { title: "Review the result", body: "Check sticky headers, consent dialogs and dynamic sections. Recapture after closing overlays when the website exposes them." },
      { title: "Place it in a frame", body: "Use a browser, laptop or desktop frame, then adjust screenshot fit without stretching the source." },
    ],
    tips: ["Use a stable public URL rather than a logged-in page.", "Long pages may need a taller output or a focused crop.", "Capture at desktop width for laptop and browser mockups."],
  },
  {
    slug: "design-app-store-screenshots",
    title: "Design a consistent App Store screenshot set",
    description: "Build several independent shots, reuse a visual system, and export the set together.",
    category: "Bulk workflow",
    readTime: "5 min",
    editorHref: "/tools/app-store-screenshot",
    steps: [
      { title: "Create one shot per message", body: "Add every product screenshot as its own shot. Each shot keeps independent devices, transforms, text and media." },
      { title: "Set the first composition", body: "Choose the destination ratio, device count and backdrop. Make the first screen the visual reference for the set." },
      { title: "Reuse the theme", body: "Save the styling as a personal theme or export its JSON. Apply it to the remaining shots, then vary only what supports each message." },
      { title: "Export the batch", body: "Review every shot in the shot list and export the complete set as a ZIP when the sequence is ready." },
    ],
    tips: ["Keep typography and backdrop rules consistent across the set.", "Use different device layouts only when they improve the story.", "Check the smallest text at actual mobile viewing size."],
  },
  {
    slug: "share-a-brand-theme",
    title: "Share a brand theme with your team",
    description: "Move the same backdrop, typography and styling rules between collaborators without manual matching.",
    category: "Themes",
    readTime: "2 min",
    editorHref: "/editor",
    steps: [
      { title: "Finish the reference style", body: "Set the canvas, backdrop, typography, pattern and effects that should remain consistent." },
      { title: "Save the theme", body: "Create a personal theme with a clear brand or campaign name." },
      { title: "Export theme JSON", body: "Download the theme settings and send that small file to a collaborator. Uploaded screenshots are not embedded in the theme." },
      { title: "Import and apply", body: "The recipient imports the JSON and can apply the same styling to their own scenes." },
    ],
    tips: ["Use read-only file sharing when the source theme should remain controlled.", "Add campaign names or dates to theme names.", "Keep brand assets in a shared team folder."],
  },
  {
    slug: "saas-conversion-screenshot-study",
    title: "Case Study: How High-Fidelity Device Mockups Increased SaaS Conversions by 24%",
    description: "A data-backed study analyzing why visual screenshots in premium frames improve reader trust and increase signup rates compared to raw crop captures.",
    category: "Case Study",
    readTime: "6 min",
    editorHref: "/editor",
    steps: [
      { title: "Identify visual friction", body: "Raw, unmasked screenshots look generic and fail to stand out. Presenting screenshots in realistic browser or phone frames establishes trust and product context instantly." },
      { title: "Frame your product value", body: "Use MockFrame's Chrome Browser or iPhone 16 Pro frames to place the user inside your actual SaaS experience." },
      { title: "Align brand aesthetics", body: "Apply cohesive color patterns and mesh gradients to blend the mockup with your landing page design." },
      { title: "Measure page performance", body: "Deploy premium framed assets and track visitor scroll-depth. High-fidelity visual mockups reduce landing page bounce rates and increase signup conversions." },
    ],
    tips: ["Use MockFrame's Zoom Focus to direct reader attention to CTA areas.", "Set transparent canvas backgrounds for seamless cut-outs on light and dark page layouts.", "A quiet, professional gradient backdrop guarantees readable screen text."],
  },
  {
    slug: "create-interactive-product-walkthroughs",
    title: "Guide: Designing Engaging Product Replay Videos for Product Hunt Launches",
    description: "Learn how to use MockFrame's animation scrubber and camera movement presets to create high-converting video mockups for your next product launch.",
    category: "Guides",
    readTime: "5 min",
    editorHref: "/editor",
    steps: [
      { title: "Plan your feature sequence", body: "Select the specific screenshot cards and messaging blocks that demonstrate your product solving a core pain point step-by-step." },
      { title: "Configure replay timeline", body: "Arrange your chat bubble reveals or UI changes in the timeline. Use the MockFrame scrubber to fine-tune hold and fade timings." },
      { title: "Enable 3D camera effects", body: "Toggle Zoom Focus and Tilt Float in the Animate Panel to add realistic, dynamic perspective changes to the preview." },
      { title: "Generate audio & export", body: "Enable simulated keyboard clicks and relaxing ambient music to deliver a premium feel, then export as a VP9 WebM video." },
    ],
    tips: ["Keep your video under 15 seconds to maximize completion rates.", "Sync typing indicator dots with sound ticks to make the preview feel organic.", "Include a clear, visually distinct call-to-action on the final frame."],
  },
];

export function getGuide(slug: string) {
  return GUIDES.find((guide) => guide.slug === slug);
}
