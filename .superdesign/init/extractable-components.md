# Extractable components

## Layout components

## MarketingNav
- Source: `apps/web/components/marketing/MarketingNav.tsx`
- Category: layout
- Description: Fixed dark top nav: brand mark, Product dropdown, Guides, Pricing, Open editor, white "Start free" button; hamburger on mobile.
- Extractable props: activeItem (string, default: "none") — e.g. "guides", "pricing"
- Hardcoded: BrandMark, menu labels, Product menu items, all CSS

## MarketingFooter
- Source: `apps/web/components/marketing/MarketingFooter.tsx`
- Category: layout
- Description: Dark 5-column footer (brand blurb, Product, Popular devices, Chat mockups, Tools) with a feedback button.
- Extractable props: none
- Hardcoded: link lists, copy, CSS

## EditorChrome
- Source: `apps/web/components/editor/EditorShell.tsx` (+ `Toolbar.tsx`, `StepFlow.tsx`)
- Category: layout
- Description: Light editor shell: floating brand/nav pill (MockFrame · Create · Templates · My scenes), top-centre tool pill, left step panel (Content / Style / Export), right Export + Layouts panel, bottom tool bar + Animate pill, optional filmstrip.
- Extractable props: activeStep ("content" | "style" | "export", default "content"), showFilmstrip (boolean, default false)
- Hardcoded: icons, labels, panel CSS (`fk-card`)

## Basic components

## RevealSection
- Source: `apps/web/components/marketing/Reveal.tsx`
- Category: basic
- Description: Scroll-in fade/slide wrapper (Reveal, RevealGroup, RevealItem) used on all marketing sections.
- Extractable props: none
- Hardcoded: motion timings

## GuideShot
- Source: `apps/web/components/marketing/GuideShot.tsx`
- Category: basic
- Description: Product screenshot in a browser window over an accent glow.
- Extractable props: accent (string, default "#a78bfa"), bare (boolean, default false)
- Hardcoded: traffic-light dots, URL pill, shadow

## SectionHeader
- Source: pattern in `apps/web/app/templates/page.tsx`, `apps/web/app/guides/page.tsx`
- Category: basic
- Description: Uppercase zinc-500 eyebrow (12px, tracking .12em) + 28–34px semibold title (tracking -0.03em) + optional right-aligned muted blurb.
- Extractable props: none
- Hardcoded: type scale

## TemplateCard
- Source: content-card grid in `apps/web/app/templates/page.tsx`
- Category: basic
- Description: rounded-2xl dark card, 256px preview area on a per-template gradient, title + blurb + circular arrow button; lifts on hover.
- Extractable props: none
- Hardcoded: CSS

## StoreSetRow
- Source: `apps/web/components/templates/StoreSetsSection.tsx`
- Category: basic
- Description: Set card: swatch + name + blurb + "Use this set" pill on the left, horizontally scrolling row of 8 screenshot thumbnails on the right.
- Extractable props: none
- Hardcoded: CSS

## PillToggle
- Source: store toggle in `StoreSetsSection.tsx`; `Seg` in `apps/web/components/editor/ui.tsx`
- Category: basic
- Description: Segmented rounded-full control; active segment white (dark UI) or black (editor).
- Extractable props: activeItem (string)
- Hardcoded: CSS

## EditorSection / SliderRow / IconButton / Popover
- Source: `apps/web/components/editor/ui.tsx`
- Category: basic
- Description: Editor panel primitives — titled collapsible section, labelled slider with value, icon button with tooltip, anchored popover.
- Extractable props: none
- Hardcoded: CSS

## PricingPlans
- Source: `apps/web/components/marketing/PricingPlans.tsx`
- Category: basic
- Description: Free / Pro plan cards with monthly/yearly toggle and feature lists.
- Extractable props: none
- Hardcoded: plan copy, prices
