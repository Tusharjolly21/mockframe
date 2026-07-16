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

  /* --- chat / DM screen generators --------------------------------------
     These target the "fake <app> chat" search demand, but every page is
     framed for legitimate uses — product demos, UI design, tutorials,
     marketing and app-store screenshots — and each highlights the free
     "fictional" disclosure label so mockups can be shared honestly. */
  {
    slug: "fake-whatsapp-chat-generator",
    name: "Fake WhatsApp Chat Generator",
    eyebrow: "Design realistic WhatsApp mockups",
    description:
      "Build a realistic WhatsApp chat mockup for demos, tutorials and UI design. Write both sides of the conversation, set the contact, time and delivery ticks, and export it inside a photoreal iPhone — free, no sign-up.",
    editorHref: "/editor?screen=whatsapp",
    cta: "Make a WhatsApp mockup",
    image: "/hero/hero-iphone.webp",
    imageAlt: "A WhatsApp chat mockup shown in a photoreal iPhone",
    accent: "#25d366",
    steps: [
      ["Write the conversation", "Add messages from you and the contact, with emoji, replies and date separators."],
      ["Match the WhatsApp look", "Set the contact name, status, time, single/double/blue ticks, wallpaper and light or dark mode."],
      ["Frame and export", "Drop it into an iPhone or Android frame, style the background and export at HD or higher."],
    ],
    benefits: [
      ["Pixel-accurate details", "Ticks, timestamps, voice notes and reactions match the real app so demos read as authentic."],
      ["Built for demos & design", "Perfect for product walkthroughs, onboarding docs, app-store screenshots and design reviews."],
      ["Honest by default", "One click adds a “fictional” disclosure label, so recreated chats are clearly marked as mockups."],
    ],
  },
  {
    slug: "fake-imessage-generator",
    name: "Fake iMessage Generator",
    eyebrow: "Design realistic iMessage mockups",
    description:
      "Create a realistic iMessage (blue-bubble) chat mockup for demos, ads and tutorials. Add both sides, toggle iMessage or SMS, show a typing indicator and read receipts, then export inside a photoreal iPhone.",
    editorHref: "/editor?screen=imessage",
    cta: "Make an iMessage mockup",
    image: "/hero/lib-iphone-desert.webp",
    imageAlt: "A fake text message conversation shown in an iPhone",
    accent: "#34c759",
    steps: [
      ["Write the texts", "Add blue and grey bubbles, a date header and a typing indicator."],
      ["Match the iOS look", "Switch between iMessage and SMS, set the contact, time and “Delivered / Read” status."],
      ["Frame and export", "Place it in an iPhone, style the scene and export a share-ready image."],
    ],
    benefits: [
      ["True-to-iOS styling", "Bubble tails, delivery states and the status bar match the real Messages app."],
      ["Great for stories & ads", "Export tall 9:16 versions for reels, ads and app-store previews."],
      ["Clearly a mockup", "Add the free “fictional” label so recreated text threads aren’t mistaken for real ones."],
    ],
  },
  {
    slug: "fake-instagram-dm-generator",
    name: "Fake Instagram DM Generator",
    eyebrow: "Design realistic Instagram mockups",
    description:
      "Mock up an Instagram DM conversation for content, campaigns and UI design. Set the username, presence and “Seen” status, add reactions, and export the chat inside a photoreal iPhone — free.",
    editorHref: "/editor?screen=instagram",
    cta: "Make an Instagram DM",
    image: "/hero/hero-iphone.webp",
    imageAlt: "An Instagram direct message mockup shown in an iPhone",
    accent: "#e4405f",
    steps: [
      ["Compose the DM", "Add messages from both people, with emoji reactions on any bubble."],
      ["Match the Instagram look", "Set the username, verified badge, “Active now” presence and a “Seen” caption."],
      ["Frame and export", "Drop it in a device, style the background and export for feed or stories."],
    ],
    benefits: [
      ["Authentic DM styling", "Header, presence and reaction bubbles mirror the real Instagram inbox."],
      ["Made for creators", "Ideal for meme layouts, brand campaigns, tutorials and UI concepts."],
      ["Marked as fictional", "The optional disclosure label keeps recreated DMs transparent."],
    ],
  },
  {
    slug: "fake-telegram-chat-generator",
    name: "Fake Telegram Chat Generator",
    eyebrow: "Design realistic Telegram mockups",
    description:
      "Generate a realistic Telegram chat mockup for demos, docs and design. Write the conversation, set the contact, presence, wallpaper and ticks, and export it inside a photoreal iPhone or Android frame.",
    editorHref: "/editor?screen=telegram",
    cta: "Make a Telegram mockup",
    image: "/hero/lib-iphone-desert.webp",
    imageAlt: "A Telegram chat mockup shown in a photoreal phone",
    accent: "#26a5e4",
    steps: [
      ["Write the conversation", "Add messages from both sides, with replies and attachments."],
      ["Match the Telegram look", "Set the contact, “last seen” status, wallpaper and delivery ticks."],
      ["Frame and export", "Place it in a device, style the scene and export at any size."],
    ],
    benefits: [
      ["Accurate Telegram styling", "Bubbles, ticks and wallpapers match the real app for believable demos."],
      ["For product & support docs", "Show a feature or a bot flow without exposing a real conversation."],
      ["Transparent mockups", "Add the free “fictional” label to recreated chats in one tap."],
    ],
  },
  {
    slug: "fake-snapchat-generator",
    name: "Fake Snapchat Generator",
    eyebrow: "Design realistic Snapchat mockups",
    description:
      "Create a Snapchat chat mockup for content and design — set the friend name, streak count and Delivered / Opened / Screenshot status, and export it inside a photoreal iPhone. Free, no account.",
    editorHref: "/editor?screen=snapchat",
    cta: "Make a Snapchat mockup",
    image: "/hero/hero-iphone.webp",
    imageAlt: "A Snapchat conversation mockup shown in an iPhone",
    accent: "#f5c518",
    steps: [
      ["Add the chat", "Write messages between you and a friend."],
      ["Match the Snapchat look", "Set the friend name, 🔥 streak count and the status line (Delivered, Opened, Screenshot…)."],
      ["Frame and export", "Drop it into a device, style the scene and export for stories or feed."],
    ],
    benefits: [
      ["Snapchat-accurate details", "Streaks, status colours and the header match the real app."],
      ["Made for content & UI", "Great for skits, mockups, tutorials and interface concepts."],
      ["Clearly fictional", "The optional disclosure label keeps recreated snaps honest."],
    ],
  },
  {
    slug: "fake-messenger-chat-generator",
    name: "Fake Messenger Chat Generator",
    eyebrow: "Design realistic Messenger mockups",
    description:
      "Mock up a Facebook Messenger conversation for demos, ads and UI design. Set the contact, presence and reactions, then export the chat inside a photoreal iPhone — free and without sign-up.",
    editorHref: "/editor?screen=messenger",
    cta: "Make a Messenger mockup",
    image: "/hero/lib-iphone-desert.webp",
    imageAlt: "A Facebook Messenger chat mockup shown in an iPhone",
    accent: "#0a7cff",
    steps: [
      ["Write the messages", "Add bubbles from both people, with emoji reactions."],
      ["Match the Messenger look", "Set the contact name, verified badge and “Active” presence."],
      ["Frame and export", "Place it in a device, style the background and export a finished image."],
    ],
    benefits: [
      ["Authentic Messenger styling", "Rounded bubbles, presence and reactions mirror the real app."],
      ["For marketing & design", "Show a support flow, a campaign concept or a UI idea cleanly."],
      ["Honest recreations", "Add the free “fictional” disclosure label so mockups aren’t mistaken for real chats."],
    ],
  },
];

export function toolPage(slug: string): ToolPage | undefined {
  return TOOL_PAGES.find((tool) => tool.slug === slug);
}
