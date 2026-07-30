export interface ToolPage {
  slug: string;
  name: string;
  eyebrow: string;
  description: string;
  /** A distinct, longer paragraph (not a rephrase of `description`) that gives
   *  each page genuinely unique on-page content — the anti-thin-content bar for
   *  programmatic pages is real per-page value, not word padding. */
  overview: string;
  editorHref: string;
  /** phone-optimised flow for this tool, offered to small screens */
  mobileHref?: string;
  cta: string;
  image: string;
  imageAlt: string;
  accent: string;
  steps: [string, string][];
  benefits: [string, string][];
  /** Real, on-page Q&As — also emitted as FAQPage structured data. */
  faq: [string, string][];
  /** Slugs of sibling tools to cross-link (internal-linking hub). */
  related: string[];
}

export const TOOL_PAGES: ToolPage[] = [
  {
    slug: "website-screenshot",
    name: "Website Screenshot Generator",
    eyebrow: "Capture any public URL",
    description: "Capture desktop or mobile pages, wait for lazy-loaded images, place the result in a browser or device, and export it at social-ready sizes.",
    overview:
      "A raw browser screenshot rarely looks like something you can put on a landing page or in a pitch deck. MockFrame captures the live page for you — scrolling through lazy sections so nothing renders half-loaded — and then hands you the same editor used for device mockups, so you can drop the capture into a browser window, laptop or phone, add a backdrop, and export at the exact ratio each platform wants. The capture runs server-side against public HTTPS URLs, with private-network and unsafe-redirect targets rejected before anything is fetched.",
    editorHref: "/editor?capture=1",
    cta: "Capture a website",
    image: "/hero/lib-macbook.webp",
    imageAlt: "Website screenshot shown in a MacBook mockup",
    accent: "#22d3ee",
    steps: [["Paste a URL", "Choose desktop or mobile and whether to capture the full page."], ["Let the page settle", "MockFrame scrolls lazy pages and waits for images before capture."], ["Frame and export", "Use a browser, phone, tablet or laptop and export the finished scene."]],
    benefits: [["Lazy-load support", "Capture images and sections that normally appear only after scrolling."], ["Public-target protection", "Private network addresses and unsafe redirects are rejected server-side."], ["Real device output", "Move from a raw page capture to a believable marketing mockup in one workflow."]],
    faq: [
      ["Can it capture content that only loads while scrolling?", "Yes. The capture pass scrolls the full document and waits for images before rendering, so lazy-loaded sections and below-the-fold content appear in the result."],
      ["Does it work on pages behind a login?", "No — captures run against public HTTPS URLs only. For a private or authenticated page, take a normal browser screenshot and drop that image into the editor to frame it."],
      ["What sizes can I export at?", "Any social-ready ratio (landscape, square, story) plus custom canvases. 4K and 6K output are available on Pro."],
    ],
    related: ["app-promo-video-maker", "code-screenshot", "tweet-screenshot"],
  },
  {
    slug: "code-screenshot",
    name: "Code Screenshot Generator",
    eyebrow: "Readable code for social and docs",
    description: "Turn code and diffs into crisp, syntax-highlighted cards with adjustable font size, width, chrome, background and export ratio.",
    overview:
      "Screenshots of code pasted straight from an editor are usually too small to read once they're scaled down for a feed. This tool renders your snippet as a self-contained card you fully control — font family and size, editor width, line spacing, window chrome and background — so the code stays legible at the size people actually view it. A dedicated diff mode keeps added and removed lines visually distinct, which is what makes before/after posts and pull-request highlights read at a glance.",
    editorHref: "/templates/code",
    cta: "Create a code image",
    image: "/hero/hero-iphone.webp",
    imageAlt: "Polished content shown inside a device mockup",
    accent: "#a78bfa",
    steps: [["Paste code", "Choose from common languages or use the dedicated diff highlighter."], ["Make it readable", "Adjust font, editor width, line spacing, theme and window chrome."], ["Export anywhere", "Create a landscape post, square card, story or custom-size asset."]],
    benefits: [["Diff highlighting", "Added and removed lines remain visually distinct."], ["Multiple code fonts", "Use clear monospace families designed for small and large exports."], ["Reusable styling", "Save the finished composition as a personal template or shared theme."]],
    faq: [
      ["Which languages are supported?", "All common languages are syntax-highlighted, and there's a separate diff highlighter for showing changes."],
      ["Can I show a git diff?", "Yes. Diff mode keeps added and removed lines colour-coded so before/after changes are easy to follow."],
      ["Can I reuse the same style across posts?", "Save the composition as a personal template or export its theme JSON, then apply it to future code cards for a consistent look."],
    ],
    related: ["website-screenshot", "tweet-screenshot", "app-promo-video-maker"],
  },
  {
    slug: "tweet-screenshot",
    name: "X Post Screenshot Generator",
    eyebrow: "Paste a post URL",
    description: "Import an X post, adjust its readable width and text scale, then present it as a clean standalone card or inside a device mockup.",
    overview:
      "Native X screenshots crop awkwardly and shrink to nothing in a vertical story. Paste a post URL and MockFrame imports the author, text, attached media and engagement counts into an editable card, then lets you scale the text and shorten the line length rather than squashing the whole thing. Present it as a clean standalone card or place it inside a phone — either way you control the width, the visible metrics and the target aspect ratio before exporting.",
    editorHref: "/templates/post",
    cta: "Create an X post image",
    image: "/hero/lib-iphone-desert.webp",
    imageAlt: "Social post displayed in a photoreal phone",
    accent: "#f4f4f5",
    steps: [["Paste the post", "Import author, content, media and engagement details from its URL."], ["Choose the layout", "Control post width, text size, metrics, media and standalone mode."], ["Style the scene", "Apply a theme, background, device and target social aspect ratio."]],
    benefits: [["Readable story exports", "Increase text size and shorten line length for 9:16 sharing."], ["Media grids", "Present posts containing one to four attached images."], ["Standalone or device", "Export the post card alone or place it inside a phone."]],
    faq: [
      ["Do I need X (Twitter) API access?", "No. Paste the public post URL and MockFrame imports the content for you — no developer account or API key required."],
      ["Can I include the images attached to a post?", "Yes, posts with one to four attached images render as a proper media grid inside the card."],
      ["How do I make a post readable in a vertical story?", "Increase the text size and reduce the card width instead of scaling the whole card down — the text reflows so it stays legible at 9:16."],
    ],
    related: ["bluesky-screenshot", "code-screenshot", "website-screenshot"],
  },
  {
    slug: "bluesky-screenshot",
    name: "Bluesky Post Screenshot Generator",
    eyebrow: "Import from Bluesky",
    description: "Convert a Bluesky post into a polished, readable image for stories, feeds, articles and presentations.",
    overview:
      "Bluesky posts share the same problem as any social screenshot: the native crop is fine on the app and unreadable everywhere else. Paste a public Bluesky URL and the post — text, author and any embedded link card — comes in as an editable object. Resize by adjusting the card width and typography, not by scaling a fixed image down, so a long post stays genuinely readable on mobile. Import uses the public API, so no password or private-account access is involved.",
    editorHref: "/templates/post",
    cta: "Create a Bluesky image",
    image: "/hero/lib-ipad.webp",
    imageAlt: "Social content presented in an iPad mockup",
    accent: "#38bdf8",
    steps: [["Paste a Bluesky URL", "MockFrame imports the public post and embedded link information."], ["Resize the post", "Adjust card width and typography instead of scaling the whole card down."], ["Export for the destination", "Pick story, square, landscape or a custom canvas."]],
    benefits: [["Public API import", "No Bluesky password or private account access is required."], ["Text-first controls", "Make long posts genuinely readable on mobile."], ["Link previews", "Keep useful embedded link context in the finished image."]],
    faq: [
      ["Do I need to log in to Bluesky?", "No. Import uses the public API, so no password or private-account access is needed — just the public post URL."],
      ["Are embedded link cards preserved?", "Yes, the link preview that appears under a post is imported so the finished image keeps that context."],
      ["What export sizes are available?", "Story, square, landscape and fully custom canvases, so the same post fits a feed, an article or a presentation slide."],
    ],
    related: ["tweet-screenshot", "code-screenshot", "website-screenshot"],
  },
  // NOTE: there is deliberately no "app-store-screenshot" tool page — it would
  // cannibalize /app-store-screenshots (the pack studio), which owns the
  // "app store screenshot generator" query cluster. The old /tools URL 301s
  // there (next.config.ts).
  {
    slug: "app-promo-video-maker",
    name: "App Promo Video Maker",
    eyebrow: "Animated ads for Instagram & Facebook",
    description:
      "Turn an app screenshot into a short, animated promo video for Instagram Reels, Stories and Facebook — pick a template, drop in your screen, edit the text, and export an MP4. No editing software.",
    overview:
      "A still screenshot doesn't stop the scroll — motion does. This tool wraps your app screen in a scripted ~10-second animation: a title card animates in, the phone rises and turns in 3D, feature captions pop, and a call-to-action lands at the end. Pick one of six templates (from a calm brand hero to a punchy ad-style beat cut), drop in your screenshot, edit the text lines, choose your colour and aspect ratio, and preview it live. Export a real MP4 in 9:16 for Reels and Stories, 1:1 for the feed, or 16:9 — the format Instagram and Facebook actually want, ready to upload.",
    editorHref: "/editor?promo=1",
    cta: "Make a promo video",
    image: "/hero/promo-video.png",
    imageAlt: "An animated app promo video shown in a phone mockup",
    accent: "#7c3aed",
    steps: [
      ["Pick a template", "Choose from six motion styles — Rise & Reveal, 3D Spin, Feature Pop, Scroll Story, Tilt Parallax or Quick Cut."],
      ["Add your screen & words", "Upload your app screenshot and edit the headline, captions and accent colour."],
      ["Export an MP4", "Preview it live, choose 9:16, 1:1 or 16:9, and download a share-ready MP4 for Instagram or Facebook."],
    ],
    benefits: [
      ["Six ready-made styles", "From a calm brand hero to a fast ad-style beat cut — every template is animated and edit-ready."],
      ["Made for social", "Export vertical 9:16 for Reels & Stories, square for the feed, or wide 16:9 — as real H.264 MP4."],
      ["No editing software", "Everything runs in the browser: swap the screenshot, type your copy, and render. No After Effects."],
    ],
    faq: [
      ["What formats can I export?", "MP4 (H.264) in 9:16 for Reels and Stories, 1:1 for the feed, and 16:9 — the formats Instagram and Facebook accept and play cleanly."],
      ["How long are the videos?", "Around 8–12 seconds depending on the template — the ideal length for a scroll-stopping social ad."],
      ["Can I change the text and colours?", "Yes. Every template has editable text lines and an accent colour, plus a choice of premium backgrounds and aspect ratios."],
      ["Is it free?", "You can build and preview a promo video for free. Exporting the finished MP4 is a Pro feature."],
    ],
    related: ["code-screenshot", "fake-whatsapp-chat-generator", "website-screenshot"],
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
    overview:
      "When you're demoing a messaging feature, writing onboarding docs or designing a product walkthrough, a real WhatsApp screenshot exposes a real conversation and rarely says exactly what you need. This generator lets you script both sides of the chat and control the details that make it read as authentic — contact name and status, timestamps, single, double and blue ticks, the wallpaper, and light or dark mode. Export it inside a photoreal iPhone or Android frame at HD or higher. It's free with no sign-up, and a one-click “fictional” label keeps recreated chats clearly marked as mockups.",
    editorHref: "/editor?screen=whatsapp",
    mobileHref: "/chat",
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
    faq: [
      ["Is it free to use?", "Yes. The WhatsApp screen is free with no sign-up. Watermark-free image export is included; Pro adds video/GIF export and 4K/6K output."],
      ["Can I set delivered, read and blue ticks?", "Yes — choose single grey, double grey or double blue ticks per message, along with the timestamp and contact status."],
      ["Does it support light and dark mode?", "Both. Switch the chat between WhatsApp's light and dark themes, and pick the wallpaper behind the bubbles."],
      ["Is it okay to create a fake WhatsApp chat?", "For demos, tutorials, UI design and marketing, yes. A one-click “fictional” label marks the mockup so it isn't mistaken for a real conversation — don't use recreations to deceive or impersonate."],
    ],
    related: ["fake-imessage-generator", "fake-telegram-chat-generator", "fake-messenger-chat-generator"],
  },
  {
    slug: "fake-imessage-generator",
    name: "Fake iMessage Generator",
    eyebrow: "Design realistic iMessage mockups",
    description:
      "Create a realistic fake iMessage conversation for demos, ads and tutorials. Add both sides, toggle iMessage or SMS, show a typing indicator and read receipts, then export inside a photoreal iPhone.",
    overview:
      "The blue-and-grey iMessage look is instantly recognisable, which is exactly why it's used in ads, reels and product tutorials — and why you don't want to screenshot a real thread to get it. Write both sides of the conversation, toggle each message between blue iMessage bubbles and green SMS, and add the details that sell it: a date header, the “Delivered / Read” status and a typing indicator. Bubble tails and the status bar match the real Messages app, and you can export a tall 9:16 version for stories and app-store previews.",
    editorHref: "/editor?screen=imessage",
    mobileHref: "/chat",
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
    faq: [
      ["Can I mix iMessage and SMS bubbles?", "Yes. Toggle any message between blue iMessage bubbles and green SMS so the thread looks exactly like a real mixed conversation."],
      ["Can I show read receipts and a typing indicator?", "Yes — add a “Delivered” or “Read” status under a message and drop in the three-dot typing indicator."],
      ["Can I make just one bubble instead of a whole thread?", "Yes — use it as an iMessage bubble generator: add a single blue or grey bubble, frame it tight and export just that bubble for thumbnails, memes and explainers."],
      ["Can I export a tall version for reels?", "Yes, export a 9:16 layout for stories, reels, ads and app-store previews, or any custom ratio."],
    ],
    related: ["fake-whatsapp-chat-generator", "fake-instagram-dm-generator", "fake-snapchat-generator"],
  },
  {
    slug: "fake-instagram-dm-generator",
    name: "Fake Instagram DM Generator",
    eyebrow: "Design realistic Instagram mockups",
    description:
      "Mock up an Instagram direct-message (DM) conversation for content, campaigns and UI design. Set the username, verified symbol, presence and “Seen” status, add reactions, and export the chat inside a photoreal iPhone — free.",
    overview:
      "Instagram DMs show up constantly in meme layouts, brand campaigns and UI concepts — and recreating one cleanly beats cropping a real inbox. Compose the conversation from both sides, set the username, verified badge and “Active now” presence, add emoji reactions to individual bubbles and a “Seen” caption under the last message. The header, presence dot and reaction bubbles mirror the real Instagram inbox, so the result works whether you're exporting for the feed or a story. It's free, and the optional “fictional” label keeps recreated DMs transparent.",
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
    faq: [
      ["Can I add a verified badge and “Active now” status?", "Yes. Set the username, toggle the blue verified symbol next to it and show an “Active now” or “Active recently” presence in the header."],
      ["Can I put emoji reactions on messages?", "Yes — add a reaction emoji to any individual bubble, exactly like the real Instagram inbox."],
      ["Can I show a “Seen” status?", "Yes, add the “Seen” caption under the last message to complete the look."],
      ["Can I make a fake Instagram DM requests screen?", "Yes — switch the Instagram screen to the Requests view for the full “Message requests” inbox: the hidden-requests row, request previews with usernames, timestamps and verified badges, and the red “Delete all” action."],
    ],
    related: ["fake-messenger-chat-generator", "fake-snapchat-generator", "fake-whatsapp-chat-generator"],
  },
  {
    slug: "fake-telegram-chat-generator",
    name: "Fake Telegram Chat Generator",
    eyebrow: "Design realistic Telegram mockups",
    description:
      "Generate a realistic Telegram chat mockup for demos, docs and design. Write the conversation, set the contact, presence, wallpaper and ticks, and export it inside a photoreal iPhone or Android frame.",
    overview:
      "Telegram is where a lot of product support, bot flows and community features live, so it's a common thing to document — without exposing a real chat. Write the conversation, set the contact and “last seen” status, choose the wallpaper behind the bubbles and the delivery ticks, then export inside a photoreal iPhone or Android frame at any size. The bubbles, ticks and wallpapers match the real app, which is what makes a bot walkthrough or feature demo believable in a doc or a store screenshot.",
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
    faq: [
      ["Can I export inside an iPhone or Android frame?", "Both. Drop the Telegram screen into a photoreal iPhone or an Android device frame and export at any size."],
      ["Can I set the “last seen” status and delivery ticks?", "Yes — set the contact's presence line and the single or double ticks on sent messages."],
      ["Can I change the chat wallpaper?", "Yes, pick the wallpaper behind the bubbles to match Telegram's light or dark themes."],
    ],
    related: ["fake-whatsapp-chat-generator", "fake-messenger-chat-generator", "fake-imessage-generator"],
  },
  {
    slug: "fake-snapchat-generator",
    name: "Fake Snapchat Generator",
    eyebrow: "Design realistic Snapchat mockups",
    description:
      "Create fake Snapchat text messages for content and design — set the friend name, streak count and Delivered / Opened / Screenshot status, and export the chat inside a photoreal iPhone. Free, no account.",
    overview:
      "Snapchat's status lines — Delivered, Opened, Received, Screenshot — and the 🔥 streak count are the details that make a Snap screen unmistakable, and the hardest to fake convincingly by hand. This generator sets them for you: write the messages, name the friend, set the streak number and pick the colour-coded status line per message. Export it inside a photoreal iPhone for skits, mockups, tutorials and interface concepts. It's free with no account, and the optional “fictional” label keeps recreated snaps honest.",
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
    faq: [
      ["Can I set a 🔥 streak count?", "Yes. Set the friend name and the streak number that sits next to it in the header."],
      ["Which status lines are supported?", "Delivered, Opened, Received and Screenshot — each with the correct Snapchat colour so the status reads correctly per message."],
      ["Is it free?", "Yes, the Snapchat screen is free with no account, and image export is watermark-free."],
      ["Can I use it as a Snapchat ad mockup generator?", "Yes — the Snapchat screen has a dedicated Ad view: full-screen creative with the brand row, “Sponsored” label, headline and the yellow swipe-up CTA pill. Upload your creative, set the CTA text and export at 9:16 to storyboard ad concepts before anything goes into Ads Manager."],
    ],
    related: ["fake-instagram-dm-generator", "fake-imessage-generator", "fake-messenger-chat-generator"],
  },
  {
    slug: "fake-messenger-chat-generator",
    name: "Fake Messenger Chat Generator",
    eyebrow: "Design realistic Messenger mockups",
    description:
      "Mock up a Facebook Messenger conversation for demos, ads and UI design. Set the contact, presence and reactions, then export the chat inside a photoreal iPhone — free and without sign-up.",
    overview:
      "Facebook Messenger's rounded bubbles and presence dot are their own recognisable look, useful for support-flow demos, campaign concepts and UI ideas. Whether you need a single fake Facebook message or a whole Messenger thread, write both sides of the conversation, set the contact name and verified badge, show an “Active” presence and add emoji reactions to bubbles, then export the chat inside a photoreal iPhone. Everything mirrors the real Messenger layout so the mockup reads cleanly in an ad or a design review, and it's free with no sign-up.",
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
    faq: [
      ["Can I show an “Active” presence and a verified badge?", "Yes. Set the contact name, toggle the verified badge and show the green “Active” presence dot in the header."],
      ["Can I add reactions to messages?", "Yes — attach an emoji reaction to any bubble, matching the real Messenger layout."],
      ["Can I use it for ads and campaigns?", "Yes, export a clean finished image for ads, campaign concepts and design reviews, with an optional “fictional” label for transparency."],
    ],
    related: ["fake-instagram-dm-generator", "fake-whatsapp-chat-generator", "fake-telegram-chat-generator"],
  },
  {
    slug: "fake-discord-chat-generator",
    name: "Fake Discord Chat Generator",
    eyebrow: "Design realistic Discord mockups",
    description:
      "Create a realistic Discord chat mockup for server rules, bot demos, tutorials and memes. Write both sides, set usernames, role colours and timestamps, and export inside a photoreal device — free to build, no sign-up.",
    overview:
      "Discord screenshots are everywhere — bot documentation, server onboarding guides, community memes, moderation tutorials — and recreating one cleanly beats cropping a real server with strangers' names in it. Compose the conversation with usernames, role colours and timestamps in Discord's exact dark theme, preview it live as you type, and export it inside a photoreal iPhone or as a clean image. Bot developers can stage command-and-response flows without spinning up a test server, and community managers can produce rules or welcome screens that read exactly like the real app. A one-click “fictional” label keeps recreations honest.",
    editorHref: "/editor?screen=discord",
    cta: "Make a Discord mockup",
    image: "/hero/hero-iphone.webp",
    imageAlt: "A Discord chat mockup shown in a photoreal device",
    accent: "#5865f2",
    steps: [
      ["Write the conversation", "Add messages from any number of users, with usernames and role colours."],
      ["Match the Discord look", "Dark theme, timestamps and message grouping mirror the real client."],
      ["Frame and export", "Drop it into a device frame, style the background and export your image."],
    ],
    benefits: [
      ["Server-accurate styling", "Role colours, grouped messages and the dark theme match real Discord."],
      ["Made for bot demos", "Stage command/response flows for docs without a live test server."],
      ["Clearly a mockup", "Add the free “fictional” label so recreated chats stay honest."],
    ],
    faq: [
      ["Can I set usernames and role colours?", "Yes — each participant gets a display name and colour, so staged mod/admin/member conversations read correctly."],
      ["Is it free?", "Building and previewing is free with no sign-up. Exporting Discord screens is part of Pro (WhatsApp and iMessage exports are free)."],
      ["Can I use it for bot documentation?", "Yes — stage the exact command and reply flow you want to document, without exposing a real server or user accounts."],
    ],
    related: ["fake-slack-conversation-generator", "fake-whatsapp-chat-generator", "fake-telegram-chat-generator"],
  },
  {
    slug: "fake-slack-conversation-generator",
    name: "Fake Slack Conversation Generator",
    eyebrow: "Design realistic Slack mockups",
    description:
      "Mock up a Slack conversation for product demos, onboarding docs and presentations. Set names, avatars colours, threads and reactions, then export inside a device frame — free to build, no sign-up.",
    overview:
      "Slack screenshots show up constantly in SaaS marketing, integration docs and internal training — but real workspaces are full of names and messages you can't publish. This generator stages the exact exchange you need: channel or DM style, sender names, timestamps and reactions, in Slack's precise light theme. Product teams use it to demo integrations (“here's what our bot posts”), founders use it for landing-page social proof scenes, and educators use it for communication-skills material. Preview is live as you type, and the finished conversation exports inside a photoreal device or as a clean standalone image.",
    editorHref: "/editor?screen=slack",
    cta: "Make a Slack mockup",
    image: "/hero/lib-macbook.webp",
    imageAlt: "A Slack conversation mockup in a device frame",
    accent: "#611f69",
    steps: [
      ["Write the messages", "Add each participant's messages with names and timestamps."],
      ["Match the Slack look", "Channel header, message grouping and reactions mirror the real app."],
      ["Frame and export", "Present it in a laptop or phone frame and export the finished image."],
    ],
    benefits: [
      ["Workspace-accurate styling", "Message layout, timestamps and reactions match real Slack."],
      ["Perfect for integration demos", "Show what your bot or app posts without a demo workspace."],
      ["Safe to publish", "No real names, no real messages — nothing to redact."],
    ],
    faq: [
      ["Can I show a bot or app posting?", "Yes — name a sender after your bot and stage its exact message, the standard way to document Slack integrations."],
      ["Does it do threads and reactions?", "Reactions yes; conversations render with Slack's real message grouping so exchanges read naturally."],
      ["Is it free?", "Composing and previewing is free without an account. Exporting Slack screens is part of Pro."],
    ],
    related: ["fake-discord-chat-generator", "fake-teams-chat-generator", "fake-whatsapp-chat-generator"],
  },
  {
    slug: "fake-signal-chat-generator",
    name: "Fake Signal Chat Generator",
    eyebrow: "Design realistic Signal mockups",
    description:
      "Create a Signal chat mockup for privacy-focused product demos, journalism illustrations and tutorials. Compose both sides, set the contact and disappearing-message hints, and export in a photoreal iPhone.",
    overview:
      "Signal screenshots appear in journalism, security training and privacy-product marketing — exactly the contexts where screenshotting a real conversation is most inappropriate. This generator stages Signal's clean interface: contact name, delivery states and the app's distinctive minimal bubbles. Security educators can illustrate safe-messaging practices, journalists can recreate exchanges for stories without exposing sources, and privacy products can show Signal-style flows in their onboarding. As with every MockFrame chat screen, the preview renders live and a “fictional” disclosure label is one click away.",
    editorHref: "/editor?screen=signal",
    cta: "Make a Signal mockup",
    image: "/hero/lib-iphone-desert.webp",
    imageAlt: "A Signal chat mockup shown in an iPhone",
    accent: "#3a76f0",
    steps: [
      ["Write the conversation", "Add messages from both sides with timestamps."],
      ["Match the Signal look", "Minimal bubbles and delivery states mirror the real app."],
      ["Frame and export", "Place it in a device, style the scene and export."],
    ],
    benefits: [
      ["True-to-app minimalism", "Signal's clean bubble style and states, faithfully recreated."],
      ["For sensitive contexts", "Illustrate exchanges for stories and training without real sources."],
      ["Transparent recreations", "The optional “fictional” label keeps illustrations honest."],
    ],
    faq: [
      ["Why mock up a Signal chat instead of screenshotting?", "Signal conversations are usually private by nature — a staged mockup illustrates the exchange without exposing a real contact or source."],
      ["Can I set delivery states?", "Yes, sent/delivered/read states render like the real app."],
      ["Is it free?", "Free to compose and preview; exporting Signal screens is part of Pro."],
    ],
    related: ["fake-whatsapp-chat-generator", "fake-telegram-chat-generator", "fake-imessage-generator"],
  },
  {
    slug: "fake-line-chat-generator",
    name: "Fake LINE Chat Generator",
    eyebrow: "Design realistic LINE mockups",
    description:
      "Build a LINE chat mockup for app marketing, tutorials and content aimed at audiences in Japan, Taiwan and Thailand. Compose the conversation and export it inside a photoreal phone.",
    overview:
      "LINE is the everyday messenger for hundreds of millions of people across Japan, Taiwan, Thailand and Indonesia — and content aimed at those markets lands better when it shows the app people actually use. This generator recreates LINE's distinctive look (the green identity, read indicators and sticker-friendly bubbles) so marketers localising app-store material, teachers making language-learning content, and creators writing region-specific stories can stage exactly the conversation they need. Compose both sides, preview live, and export inside an iPhone or Android frame.",
    editorHref: "/editor?screen=line",
    cta: "Make a LINE mockup",
    image: "/hero/hero-iphone.webp",
    imageAlt: "A LINE chat mockup shown in a phone frame",
    accent: "#06c755",
    steps: [
      ["Write the conversation", "Add both sides of the chat with timestamps."],
      ["Match the LINE look", "Bubbles, read marks and the header mirror the real app."],
      ["Frame and export", "Drop it into a device and export for your campaign or lesson."],
    ],
    benefits: [
      ["Region-authentic", "The messenger your Japanese, Taiwanese and Thai audiences actually use."],
      ["For localised marketing", "Stage app-store and campaign material that feels native to the market."],
      ["Honest by default", "One click adds the “fictional” disclosure label."],
    ],
    faq: [
      ["Who is a LINE mockup for?", "Anyone making content for markets where LINE is the default messenger — app marketers localising store listings, language teachers, and creators telling region-specific stories."],
      ["Does it show read indicators?", "Yes, LINE's read marks render like the real app."],
      ["Is it free?", "Free to build and preview; exporting LINE screens is part of Pro."],
    ],
    related: ["fake-whatsapp-chat-generator", "fake-telegram-chat-generator", "fake-messenger-chat-generator"],
  },
  {
    slug: "fake-teams-chat-generator",
    name: "Fake Microsoft Teams Chat Generator",
    eyebrow: "Design realistic Teams mockups",
    description:
      "Mock up a Microsoft Teams conversation for corporate training, IT documentation and product demos. Stage the exchange, then export inside a laptop or phone frame — free to build.",
    overview:
      "Teams is where enterprise conversations happen, which makes it the screenshot corporate trainers, IT departments and B2B products need most — and the one hardest to take safely, because real workspaces are full of colleagues' names and internal information. Stage exactly the exchange you need: security-awareness training (“this is what a phishing message looks like”), help-desk documentation, product announcements from your app's bot, or communication-skills coursework. The layout mirrors the real Teams client, and the finished conversation exports inside a laptop or phone frame ready for slides and docs.",
    editorHref: "/editor?screen=teams",
    cta: "Make a Teams mockup",
    image: "/hero/lib-macbook.webp",
    imageAlt: "A Microsoft Teams chat mockup in a laptop frame",
    accent: "#6264a7",
    steps: [
      ["Write the exchange", "Add each participant's messages with names and times."],
      ["Match the Teams look", "Message layout and header mirror the real client."],
      ["Frame and export", "Present in a laptop frame for slides, or a phone for mobile docs."],
    ],
    benefits: [
      ["Enterprise-accurate", "Reads like a real Teams thread — ideal for corporate material."],
      ["For training & IT docs", "Stage phishing-awareness examples and help-desk flows safely."],
      ["Slide-ready output", "Export at presentation sizes inside clean device frames."],
    ],
    faq: [
      ["Can I use this for security training?", "Yes — staged phishing-example messages are a standard training tool, and a mockup means no real colleague names appear in your material."],
      ["Can my app's bot appear in the chat?", "Yes, name any sender after your bot to demo Teams integrations."],
      ["Is it free?", "Free to compose and preview; exporting Teams screens is part of Pro."],
    ],
    related: ["fake-slack-conversation-generator", "fake-discord-chat-generator", "fake-imessage-generator"],
  },
  {
    slug: "fake-text-video",
    name: "Fake Text Message Video Maker",
    eyebrow: "Animated chat-story videos",
    description:
      "Turn a fake text conversation into an animated video — messages appear one by one with typing indicators, sound and music. Export MP4-ready video for TikTok, Reels and Shorts. Free to build, no sign-up.",
    overview:
      "Chat-story videos — a text conversation playing out message by message — are one of the fastest-growing formats on TikTok, Reels and Shorts. This maker animates the whole thing for you: write both sides of the conversation in WhatsApp or iMessage (or any of 12+ apps), press play, and watch messages land with typing indicators, keyboard sounds and optional lo-fi music, inside a photoreal iPhone. Scrub the timeline, set the pacing, add a zoom or tilt effect, then export the replay as a video or GIF sized 9:16 for vertical feeds. It's the TextingStory-style workflow, but in the browser with real device frames and no watermark on the story itself.",
    editorHref: "/editor?screen=imessage&replay=1",
    cta: "Make a text video",
    image: "/hero/hero-iphone.webp",
    imageAlt: "An animated fake text conversation playing in an iPhone frame",
    accent: "#22d3ee",
    steps: [
      ["Write the conversation", "Compose both sides in iMessage, WhatsApp or 12+ other apps."],
      ["Press play", "Messages animate in one by one with typing indicators, sounds and music."],
      ["Export the video", "Save the replay as a video or GIF, sized for TikTok, Reels and Shorts."],
    ],
    benefits: [
      ["Real chat-story animation", "Typing dots, message pops and reactions — the format viewers already love."],
      ["Sound built in", "Keyboard clicks and a lo-fi music bed, no editing app needed."],
      ["Vertical-ready", "Compose at 9:16 inside a photoreal iPhone for full-bleed vertical video."],
    ],
    faq: [
      ["How is this different from TextingStory?", "It runs in the browser with photoreal device frames, 12+ chat apps beyond plain texts, styled backgrounds, and image exports from the same scene — no app install."],
      ["What formats can I export?", "Animated video and GIF of the replay (Pro), plus still images of any frame. Compose at 9:16 for TikTok/Reels/Shorts."],
      ["Is it free?", "Writing and previewing the animated conversation is free with no sign-up. Video and GIF export are part of Pro."],
      ["Can I control the pacing?", "Yes — set slow/normal/fast playback, scrub the timeline, and tune when each message lands."],
    ],
    related: ["fake-imessage-generator", "fake-whatsapp-chat-generator", "app-promo-video-maker"],
  },
];



export function toolPage(slug: string): ToolPage | undefined {
  return TOOL_PAGES.find((tool) => tool.slug === slug);
}
