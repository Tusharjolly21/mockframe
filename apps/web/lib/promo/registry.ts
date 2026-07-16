import { PROMO_FPS, type PromoProject } from "./types";

export interface TextSlot {
  key: string;
  label: string;
  placeholder: string;
  maxLen: number;
}

export interface PromoTemplateMeta {
  id: string;
  name: string;
  /** One-line pitch shown in the gallery. */
  tagline: string;
  description: string;
  textSlots: TextSlot[];
  defaultDurationInFrames: number;
  defaultBackground: string;
  defaultAccent: string;
}

const s = PROMO_FPS; // frames per second, for readable durations

export const PROMO_TEMPLATES: PromoTemplateMeta[] = [
  {
    id: "rise-reveal",
    name: "Rise & Reveal",
    tagline: "Clean product intro",
    description:
      "Title fades in, the phone rises from the bottom on a spring, settles and floats, then a caption slides in.",
    textSlots: [
      { key: "headline", label: "Headline", placeholder: "Meet your new workflow", maxLen: 40 },
      { key: "caption", label: "Caption", placeholder: "Beautiful screens in minutes", maxLen: 60 },
    ],
    defaultDurationInFrames: 10 * s,
    defaultBackground: "aurora",
    defaultAccent: "#7c3aed",
  },
  {
    id: "spin-showcase",
    name: "3D Spin Showcase",
    tagline: "Show it in the round",
    description: "The phone glides in and slowly revolves on its Y-axis while captions cross-fade across the turn.",
    textSlots: [
      { key: "headline", label: "Headline", placeholder: "Designed to feel effortless", maxLen: 40 },
      { key: "caption", label: "Caption", placeholder: "Every detail, considered", maxLen: 60 },
    ],
    defaultDurationInFrames: 9 * s,
    defaultBackground: "midnight",
    defaultAccent: "#22d3ee",
  },
  {
    id: "feature-pop",
    name: "Feature Pop",
    tagline: "Three quick selling points",
    description: "The phone holds centre while three feature callouts pop in one-by-one with a subtle zoom to each.",
    textSlots: [
      { key: "feature1", label: "Feature 1", placeholder: "Instant sync", maxLen: 28 },
      { key: "feature2", label: "Feature 2", placeholder: "Offline ready", maxLen: 28 },
      { key: "feature3", label: "Feature 3", placeholder: "Private by default", maxLen: 28 },
    ],
    defaultDurationInFrames: 11 * s,
    defaultBackground: "graphite",
    defaultAccent: "#34d399",
  },
  {
    id: "scroll-story",
    name: "Scroll Story",
    tagline: "Reveal the whole app",
    description: "The phone rises, then the screenshot auto-scrolls top-to-bottom to show the full app, caption pinned.",
    textSlots: [
      { key: "headline", label: "Headline", placeholder: "The whole story, one scroll", maxLen: 40 },
      { key: "subhead", label: "Subhead", placeholder: "See everything it does", maxLen: 50 },
    ],
    defaultDurationInFrames: 12 * s,
    defaultBackground: "dusk",
    defaultAccent: "#f472b6",
  },
  {
    id: "tilt-parallax",
    name: "Tilt Parallax",
    tagline: "Brand-forward hero",
    description: "The phone floats with a live 3D tilt over a parallax backdrop under a bold headline. Premium and calm.",
    textSlots: [
      { key: "headline", label: "Headline", placeholder: "Made for teams that ship", maxLen: 40 },
      { key: "subhead", label: "Subhead", placeholder: "Fast. Focused. Yours.", maxLen: 50 },
    ],
    defaultDurationInFrames: 8 * s,
    defaultBackground: "violet-glow",
    defaultAccent: "#a78bfa",
  },
  {
    id: "quick-cut",
    name: "Quick Cut Promo",
    tagline: "Punchy, ad-style",
    description: "Energetic beat-cut edit: title, phone slam-in, two fast feature cuts, and a closing call-to-action card.",
    textSlots: [
      { key: "title", label: "Title", placeholder: "Your app, everywhere", maxLen: 32 },
      { key: "feature1", label: "Cut 1", placeholder: "Lightning fast", maxLen: 26 },
      { key: "feature2", label: "Cut 2", placeholder: "Beautifully simple", maxLen: 26 },
      { key: "cta", label: "Call to action", placeholder: "Download today", maxLen: 26 },
    ],
    defaultDurationInFrames: 9 * s,
    defaultBackground: "ember",
    defaultAccent: "#fb923c",
  },
];

export const PROMO_TEMPLATE_IDS = PROMO_TEMPLATES.map((t) => t.id);

export function getPromoTemplate(id: string): PromoTemplateMeta | undefined {
  return PROMO_TEMPLATES.find((t) => t.id === id);
}

export function createPromoProject(templateId: string, screenshotAssetId: string): PromoProject {
  const t = getPromoTemplate(templateId);
  if (!t) throw new Error(`Unknown promo template: ${templateId}`);
  return {
    templateId: t.id,
    deviceId: "iphone-16-pro",
    screenshotAssetId,
    texts: t.textSlots.map((slot) => slot.placeholder),
    accent: t.defaultAccent,
    background: t.defaultBackground,
    format: "9:16",
    durationInFrames: t.defaultDurationInFrames,
    music: null,
  };
}
