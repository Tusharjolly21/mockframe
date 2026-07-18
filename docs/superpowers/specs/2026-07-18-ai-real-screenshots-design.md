# AI Real-Screenshots Mode — Design

**Date:** 2026-07-18 · **Status:** Approved · **Phase 1 of the 5-phase AI expansion**

## Problem

The AI generator invents concept UI — great demo, but the real job is: "here
are my actual screenshots, make them a pack." Claude reads images natively, so
it can caption each real screen for what it shows, order them into a narrative,
and match style/accent to the app's real colors.

## Design

**Form (`/ai`):** optional dropzone, 2–10 images. With images present the flow
is "real mode". Originals are ingested client-side (`ingestFile` → GuestAsset
ids, full resolution, never uploaded to the AI route). For the AI call the
client downscales each to ≤1300px tall JPEG (~quality 0.8) as a data URL.

**Route (`POST /api/ai-pack`)** — body becomes a discriminated union (mode
optional, defaults `"concept"` for back-compat):

```
{ mode?: "concept", appName, description, accent? }
{ mode: "real", appName, description? (≤600), accent?,
  screenshots: [{ refId: string(≤64), image: string }] }   // 2–10 items
```

`image` must match `^data:image\/(png|jpeg|webp);base64,` and be ≤400KB each.
Same gating/counters/quota as concept mode. Claude call: user turn contains
one image block per screenshot (labeled with its index) + the text prompt;
structured output `RealPackPlanSchema`:

```
{ styleId, accent, captionPosition,
  screens: [{ ref: string, caption: { title, subtitle? } }] }  // 2–10
```

**Ref validation + deterministic repair** (server, pure fn): drop returned
screens whose `ref` isn't a provided refId; dedupe (first wins); append any
missing refIds in original order with empty-title captions (user fills them in
the studio). Never fail the request over ordering — the Claude spend is
already made. `buildRealPackFromPlan(plan, appName, refIds)` → PackDocument
whose screens' `assetId` = refId (opaque client asset ids; the server never
needs the pixels).

**Client success path:** unchanged — `savePack(pack)` runs in the page where
the originals were ingested, so `packAssetIds` snapshots the full-res assets;
the studio opens with real screenshots framed.

**Prompt:** real-mode system prompt = concept prompt's narrative/caption/
palette rules, minus concept-UI generation, plus: "captions must describe what
each screenshot actually shows; order screens for conversion; pick accent
from the app's visible brand colors."

**Cost/limits:** ~10 downscaled images ≈ modest vision tokens; body ≤ ~4.5MB.
`maxDuration` stays 120.

## Out of scope
Concept+real mixing in one pack; per-screen regeneration (Phase 5);
launch kit (Phase 3).
