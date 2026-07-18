# Keyword database — 580+ keywords by intent

Built 2026-07-18 from live SERP research (~27 searches: competitor titles, PAA
phrasings, Reddit/forums, 2026 spec guides) + programmatic expansion of the real
device registry. Demand tiers are SERP-based signals (how many dedicated pages /
forum threads use the exact phrasing), **not** tool-reported volumes — validate
against GSC query data once live and re-tier quarterly.

**The four winning title modifiers** (appear in nearly every ranking competitor
title — every MockFrame landing title should carry two): `free` · `no watermark` ·
`no sign-up` · `private / in your browser`.

Legend: intent = TOOL (transactional, wants the tool now) / SPEC (lookup, wants a
number) / INFO (wants to learn) / COMP (comparing brands) / ASSET (wants a file).

---

## A · Device keywords (programmatic — one page per device exists)

Base rows generated from the registry (each maps to a live `/mockups/[id]` page):

| Primary keyword | Page | Category | Tier |
|---|---|---|---|
| arc mockup | `/mockups/arc-browser` | browser | MED |
| chrome mockup | `/mockups/chrome-browser` | browser | MED |
| safari mockup | `/mockups/safari-browser` | browser | MED |
| galaxy s25 ultra mockup | `/mockups/galaxy-s25-ultra` | phone | HIGH |
| iphone 15 mockup · 15 plus · 15 pro · 15 pro max | `/mockups/iphone-15*` (4) | phone | HIGH |
| iphone 16 mockup · 16 plus · 16 pro · 16 pro max | `/mockups/iphone-16*` (4) | phone | HIGH |
| iphone 17 mockup · 17 air · 17 pro · 17 pro max | `/mockups/iphone-17*` (4) | phone | HIGH |
| nothing phone 2 mockup | `/mockups/nothing-phone-2` | phone | MED |
| oneplus 13 mockup | `/mockups/oneplus-13` | phone | MED |
| pixel 8a mockup · pixel 9 pro mockup | `/mockups/pixel-*` (2) | phone | HIGH |
| ipad air mockup · mini · pro 11 · pro 13 | `/mockups/ipad-*` (4) | tablet | MED |
| macbook air 13 mockup · pro 14 · pro 16 | `/mockups/macbook-*` (3) | laptop | MED |
| apple watch mockup | `/mockups/watch-front` | watch | MED |
| + runtime scene devices (floating/angled/tilted iPad, hand-held iPhone…) | `listDevices()` | scene | LONGTAIL |

**Modifier grid** — each base keyword × these = ~290 device long-tails the page
must be able to satisfy on-page (title carries the base; H2s/FAQ absorb modifiers):
`free` · `online` · `generator` · `no watermark` · `png` · `transparent background`
· `4k / high resolution` · `3d / tilted` · `from screenshot` · `frame` ·
`without photoshop`. ⚠ `psd` / `figma` / `sketch` = ASSET intent (section O) —
only target once downloadable assets exist; otherwise it's bounce traffic.

Category-hub keywords (need the NEW `/mockups/c/[category]` hubs): `iphone mockup`
(HIGH — the single biggest head term), `phone mockup generator`, `android mockup`,
`tablet mockup`, `ipad mockup`, `laptop mockup`, `macbook mockup`, `apple watch
mockup generator`, `browser mockup` (all HIGH/MED).

## B · Mockup-generator head terms — TOOL · HIGH (most contested)
`device mockup generator` · `mockup generator free` · `phone mockup generator` ·
`mockup generator online` · `screenshot mockup generator` · `device frame
generator` · `app mockup generator` · `mobile mockup generator` · `3d mockup
generator` · `device mockup tool` · `mockup maker online free` · `turn a
screenshot into a mockup` · `mockup generator without photoshop` · `bulk mockup
generator` · style tails: `clay mockup` / `minimal` / `realistic`.
→ Homepage + `/mockups` hub own the head; device/category pages own the tails.

## C · Screenshot beautifier — TOOL · HIGH (10+ dedicated competitor pages)
`screenshot beautifier` (+free/online) · `beautify screenshot` · `make screenshots
beautiful` · `add background to screenshot (online)` · `screenshot with gradient
background` · `screenshot background generator` · `add padding to screenshot` ·
`screenshot rounded corners online` · `add shadow to screenshot` · `screenshot
editor online free` · `pretty screenshot maker` · `aesthetic screenshot maker` ·
`screenshot frame generator` · `macos window screenshot generator` · `screenshot
with macos title bar` · `make screenshot look professional` · `blur part of
screenshot online` · `annotate screenshot online` · `redact screenshot online`.
Differentiator phrasing to own: `screenshot tool that works in your browser — your
image never leaves your device` (privacy angle, we genuinely qualify).
→ NEW `/tools/screenshot-beautifier` landing.

## D · Browser frames — TOOL · MED (thin competition)
`browser mockup (generator)` · `browser frame screenshot` · `wrap screenshot in
browser frame` · `browser window generator` · `safari frame screenshot` · `chrome
browser mockup` · `arc browser mockup` · `browser mockup dark mode` · `fake
browser window` · `custom url in browser mockup` · `website in browser frame` ·
`browser frame free no signup`. → browser category hub + device pages exist.

## E · Website capture + website-on-device — TOOL · HIGH
Capture: `website screenshot (tool)` · `screenshot a website online` · `full page
screenshot online / without extension` · `capture entire webpage` · `webpage to
image` · `url to image/png` · `website screenshot mobile view` · `save webpage as
image` · `scrolling screenshot online`.
On-device: `website mockup generator (from url)` · `put website on laptop screen`
· `put my website on a phone` · `show website on multiple devices` · `responsive
mockup generator` · `website on macbook mockup` · `client website mockup` ·
`website mockup for portfolio`. → existing `/tools/website-screenshot` + consider
split "website mockup from URL" page.

## F · Code screenshots — TOOL · HIGH + COMP
`code screenshot (generator)` · `code to image (converter)` · `code snippet image
generator` · `beautiful code screenshots` · `share code as image` · `code
screenshot with syntax highlighting` · `code snippet for twitter/linkedin/
instagram` · `terminal screenshot generator` · per-language tails (`python code
screenshot maker`…) · COMP: `carbon.now.sh alternative` · `ray.so alternative` ·
`ray.so vs carbon` · `snappify free alternative` · `codeimage alternative`.
→ existing `/tools/code-screenshot` + comparison pages.

## G · Social post screenshots — TOOL · HIGH (tweet) / MED-rising (Bluesky = lowest competition)
Tweet/X: `tweet screenshot generator` · `x post screenshot` · `tweet to image
(converter/png)` · `tweet screenshot no watermark` · `tweet mockup generator` ·
`twitter thread to image` · `tweet image for instagram` · `share tweet on linkedin
as image` · `tweet screenshot dark mode` · COMP: `pikaso alternative` ·
`twittershots alternative`.
Bluesky: `bluesky screenshot generator` · `bluesky post to image` · `bluesky post
mockup` · `share bluesky post on instagram`.
Adjacent (new tool candidates): `linkedin post screenshot generator` · `reddit
post screenshot generator` · `youtube comment screenshot generator` · `instagram
comment generator`. → existing tweet/bluesky pages + candidates.

## H · Fake chat generators — TOOL · HIGH (proven per-platform pSEO grid)
Pattern per platform: `fake {app} chat generator` / `{app} chat generator` /
`fake {app} message maker` / `{app} dm generator` / `fake {app} screenshot`.
Live platforms (pages exist): WhatsApp (`+ blue ticks`, `group chat`, `dark
mode`), iMessage (`fake text message (maker)`, `ifake text message`, `blue bubble
green bubble generator`, `fake text conversation maker`), Instagram DM, Telegram,
Snapchat (`fake snap maker`), Messenger.
**Demand-verified gaps:** Discord (`fake discord message generator`, `discord
chat mockup` — screens exist in editor, page missing) · TikTok DM (rising).
Generic: `fake chat generator` · `fake conversation generator` · `fake text
generator` · `chat mockup generator` · `prank text generator` · `fake messages
online free`. Universal modifiers: `no watermark` · `with profile picture` ·
`dark mode` · `typing indicator` · `read receipts` · `download as image`.
Legality PAA (own with FAQ blocks — competitors answer thinly): `are fake chat
generators legal` · `is faking text messages illegal` · `can you get in trouble
for fake screenshots` · `fake tweet disclaimer`.

## I · Fake text → VIDEO / chat story — TOOL · MED-HIGH, **fastest-rising cluster**
`fake text message video (maker)` · `fake text video generator` · `texting story
maker` · `textingstory alternative (online free)` · `chat story video maker` ·
`text story video for tiktok` · `texting video maker for youtube shorts` ·
`imessage video generator` · `animated text conversation maker` · `fake chat
video with typing effect` · `chat video maker no watermark` · `9:16 chat video
export` · `brainrot text video maker` · `faceless video text story`.
→ NEW `/tools/fake-text-video` landing — our chat replay + MP4 export already IS
this product. Single best growth bet in this database.

## J · App Store screenshots — TOOL + SPEC · HIGH (spec pages = #1 organic wedge)
Tool: `app store screenshot generator (free / no watermark)` · `app store
screenshot maker/templates/mockup` · `ios screenshot generator` · `aso screenshot
tool` · `app store screenshots without designer` · `app store screenshot
localization` · `panoramic app store screenshots` · `app screenshot caption
generator`.
Spec (must carry the year, refresh annually): `app store screenshot sizes 2026` ·
`app store screenshot dimensions/requirements` · `what size are app store
screenshots` · `iphone 6.9 inch screenshot size` · `1320x2868 screenshot` · `ipad
13 inch screenshot size 2064x2752` · **`app store screenshot wrong dimensions
error`** (standout high-intent) · `how many screenshots app store` · `png or
jpeg` · `no alpha channel` · `app preview vs screenshot`.
Info: `app store screenshot best practices/examples/ideas` · `aso screenshots
that convert` · `first three screenshots app store`.
→ `/app-store-screenshots` (exists) + NEW `/specs/app-store-screenshot-sizes`.

## K · Play Store + feature graphic — TOOL + SPEC · MED-HIGH
`play store screenshot generator` · `google play screenshot dimensions/sizes
2026` · `play store screenshot requirements` · `google play 2:1 aspect ratio
rule` · `play store minimum 320px screenshot` · **feature graphic sub-cluster**
(distinct head): `feature graphic generator/maker free` · `play store feature
graphic` · `feature graphic size` · `1024x500 feature graphic` · `feature graphic
template/examples` · `what is a feature graphic google play` · `feature graphic
no alpha png` · `play store banner maker`.
→ Pack studio supports Play targets; NEW `/tools/feature-graphic-generator` +
`/specs/play-store-screenshot-sizes`.

## L · App promo / preview video — TOOL + SPEC · MED head, HIGH value
`app promo video maker (free)` · `app promo video template` · `app demo video
maker` · `app preview video maker` · `app store preview video` · `phone mockup
video (maker)` · `device mockup video` · `animated mockup generator/gif` ·
`mockup video for instagram ad` · `app video for tiktok ads` · `app promo video
for reels` · `screen recording to promo video` · `turn screen recording into ad`
· `app launch video maker` · `saas demo video maker` · `vertical video app promo
9:16` · SPEC: `app preview video specs` · `886x1920` · `15-30 seconds` · `poster
frame` · `app store video requirements 2026`.
→ `/tools/app-promo-video-maker` (exists) + NEW `/specs/app-preview-video-specs`.

## M · Comparison / alternatives — COMP · MED volume, highest conversion
All verified live: `shots.so alternative` · `pika.style alternative (free)` ·
`mockuuups studio alternative` · **`smartmockups alternative` + `smartmockups
shut down`** (2026 event — urgent, ownable NOW) · `placeit alternative free` ·
`placeit vs smartmockups` · `previewed app alternative` · `screely alternative`
(domain dead — orphaned) · `mockuphone alternative` · `rotato alternative
(free)` · `rotato vs mockrocket` · `xnapper alternative` · `cleanshot alternative
online` · `carbon alternative` · `ray.so alternative` · `snappify alternative` ·
`canva mockups free` · `brandbird alternative` · `appscreens alternative` ·
`postspark alternative` · `zeoob alternative` · `fakedetail alternative` ·
`websites like placeit but free` · `android device art generator` (Google killed
it — orphaned intent). → the `/alternatives` + `/compare` engine.

## N · Platform-destination — TOOL · MED each, HIGH aggregate
`product hunt gallery image generator` · `product hunt image size 1270x760` ·
`product hunt thumbnail 240x240` · `instagram story mockup (generator)` ·
`instagram post mockup` · `what size is an instagram story` · `twitter header
mockup` · `og image from screenshot` · `open graph image generator` · `linkedin
carousel image maker` · `dribbble shot mockup` · `behance case study mockup` ·
`portfolio mockup generator` · `github readme screenshot` · `readme banner
generator` · `press kit screenshots` · `testimonial screenshot generator` ·
`hero image for landing page mockup`.
→ NEW tool pages: instagram-story-mockup, og-image-preview, product-hunt-gallery.

## O · Asset-download intent — ASSET · HIGH (capture → convert to tool)
`iphone frame png (transparent)` · `phone frame png free download` · `device
frame png` · `iphone bezel png` · `laptop frame png` · `browser frame png` ·
`iphone mockup psd free` · `iphone mockup figma` · `figma device mockup plugin` ·
`free figma iphone mockup template` · `apple design resources device frames`.
Strategy: free-asset pages whose CTA is "or frame it instantly in your browser".
Only build once we're willing to give frames away (see backlinks doc — same asset
earns links).

## P · How-to / informational — INFO (guides feeding tools)
Mockups: `how to make an iphone mockup` · `how to put a screenshot in an iphone
frame` · `how to add a device frame to screenshots` · `how to make a mockup
without photoshop` · `how to make screenshots look professional` · `how to make a
3d phone mockup` · `apple frames shortcut` · `how to combine iphone screenshots`.
Stores: `how to make app store screenshots (without a designer / in figma)` ·
`how to fix app store screenshot dimensions error` · `how to record iphone screen
for app preview` · `how to make a play store feature graphic` · `how to localize
app store screenshots` · `how to make an app promo video`.
Chats/posts: `how to make a fake text conversation (on iphone)` · `how to make a
fake text message video` · `how to make a fake tweet` · `how to screenshot a
tweet in high quality` · `how to make chat story videos for tiktok`.
Definitional: `what is a device mockup` · `what is a feature graphic` · `what is
an app preview video` · `mockup vs prototype vs wireframe`.

## Q · AI + developer adjacents — TOOL · LOW-MED, rising
AI: `ai app screenshot generator` · `app store screenshot ai` · `ai mockup
generator` · `screenshot to mockup ai` · `ai feature graphic generator` ·
`generate app screenshots from prompt` (the `/ai` page's cluster).
Dev (only if roadmap fits): `screenshot api` · `website screenshot api` · `url to
image api` · `og image api` · `mockup api` (the `/developers/api` cluster).

---

### Counts
Device combos (A): ~290 · Non-device (B–Q): ~290 → **~580 targeted keywords**,
every one mapped to an existing or planned page type. Priorities live in
`07-roadmap.md`; refresh tiers from GSC every quarter.
