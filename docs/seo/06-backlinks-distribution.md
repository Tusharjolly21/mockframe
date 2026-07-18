# Backlinks & distribution — design/dev community strategy

Philosophy: free-tool sites earn links by *being linkable*, not by outreach volume.
Every play below ships an asset worth citing, then puts it where designers/devs
already are. (Buying links / PBNs / mass guest posts: never — domain-level risk.)

## Tier 1 — Assets that earn links passively

1. **The embed widget** (`/developers/embed` exists — weaponize it).
   Ship an "Embed this mockup editor" snippet with a `Powered by MockFrame`
   attribution link. Every blog/docs site that embeds = a relevant dofollow link.
   Add a copy-snippet box to the embed page; promote to dev-blog authors.

2. **Spec/answer pages as citable references** (see architecture doc: `/specs/*`).
   "App Store screenshot sizes 2026", "Play Store feature graphic size" — pages
   bloggers link to instead of maintaining their own tables. Keep them updated;
   the freshness IS the moat. Add "cite this page" anchor.

3. **Free device-frame PNGs** (consider): a downloads section (transparent
   iPhone frames, attribution requested). Asset directories and "free mockup
   resources" roundups link to exactly this. Decide vs. product cannibalization —
   gated by email is acceptable middle ground.

4. **Open-source something small**: the device-frame SVG registry (or a subset)
   as an npm package / GitHub repo (`mockframe/device-frames`). GitHub stars →
   dev-blog mentions → links. README links back to the tool.

## Tier 2 — Launches (concentrated link bursts)

- **Product Hunt**: launch each major surface separately over months —
  MockFrame (main), Fake Chat Studio, App Store Pack Studio, Promo Video Maker.
  Each launch = homepage-level links from PH + roundup blogs. Prepare: gallery
  images (use our own pack studio — dogfood), maker comment, first-day replies.
- **Hacker News** "Show HN": the technically interesting angles do best here —
  "Show HN: I render real SVG device frames in Remotion to make app promo videos".
  Honest, technical write-up linked from the post.
- **Betalist / AlternativeTo / SaaSHub / ToolFinder / Futurepedia (AI angle) /
  Free-for.dev / awesome-lists**: submit once, permanent directory links.
  AlternativeTo especially: create the MockFrame listing and mark alternatives —
  it ranks for "[competitor] alternative" queries we also target on-site.

## Tier 3 — Community presence (drip, not spam)

- **Reddit** (r/SideProject, r/webdev, r/iosdev, r/androiddev, r/UI_Design,
  r/IndieHackers equivalent subs): answer actual questions (people constantly ask
  "how do I make app store screenshots" / "tool to put screenshot in iphone
  frame"). Link only when it's the genuine answer; lead with the answer itself.
- **X/Twitter build-in-public**: post the promo-video outputs as loops — the
  product output is inherently shareable. Every impressive MP4 is an ad.
- **Dev.to / Hashnode / Medium**: 1 technical article per quarter (how we built
  the SVG frame system; Remotion promo pipeline). Canonical on our /guides where
  possible, else canonical to the platform is still worth the referral+brand.
- **Figma/design communities**: publish a free "device specs" FigJam/Figma file
  linking back.

## Tier 4 — Comparison-page flywheel

Our `/compare` and `/alternatives` pages (open gap — no competitor does them)
rank for competitor-brand queries → those pages honestly recommending competitors
where they win gives us the credibility screenshot-tool roundup authors cite.
When a roundup author finds our comparison table, they lift it (with a link).

## Cadence & measurement

- Month 1: directories batch (10 submissions), GSC live, embed attribution ship.
- Month 2: Product Hunt launch #1 + Show HN.
- Month 3+: one launch OR one technical article per month; weekly community answers.
- Track: GSC "Links" report + referral traffic monthly. Target: 30 unique linking
  domains by month 3, 100 by month 12 (realistic for this niche with launches).
- Never: link exchanges, paid placements, comment spam, AI-spun guest posts.
