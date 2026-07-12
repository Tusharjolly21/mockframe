# Photo-scene mockups (`category: "scene"`)

Photorealistic device renders (hand / desk / pocket photos) where the user's
screenshot is composited **behind** a raster foreground plate. The plate carries
the real device frame, the hand/finger occlusion and the shadows; only the
screen area is transparent. This is the shots.so / ls.graphics look, and unlike
the parametric SVG frames it can't be code-generated — it comes from a layered
PSD.

## Pipeline

```
python extract-scene.py <mockup.psd> <out-dir> [plate_width=2000]
```

produces `plate.png` (transparent screen hole) + `manifest.json` (the screen
rectangle in plate px + the design resolution). Then:

1. copy `plate.png` → `apps/web/public/scenes/<id>/plate.png`
2. add a `Device` entry to [`../src/scenes.ts`](../src/scenes.ts) using the
   manifest values (`plate.width/height`, `screenRect`, `screen`).

The renderer (`MockupLayerView`) branches on `device.plate`: it draws the
screenshot clipped to `screenRect`, then the plate image on top. Occlusion and
frame masking come for free from the plate's alpha — no `maskPath` needed.

Current scenes:

| id | source | notes |
|----|--------|-------|
| `hand-iphone-17-pro` | `Hand-Holding-iPhone-17-Pro-Free-psd-Mockup.psd` (Pixeden) | axis-aligned, thumb occludes lower-left |

## Requirements & limits

- The extractor assumes an **axis-aligned** screen smart object. An angled phone
  (perspective) has 4 non-rectangular `Trnf` corners and would need a quad warp
  in the renderer, not the plain rect used today.
- Layer names (`PUT YOUR DESIGN HERE`, `REMOVE THIS LAYER`) vary per pack — edit
  the constants at the top of `extract-scene.py`.

## ⚠️ Licensing

Source PSDs are third-party assets. `hand-iphone-17-pro` comes from a **Pixeden**
free resource whose license permits personal/commercial use but **forbids
redistributing the resource itself**, and requires contacting Pixeden before
using it in a template "sold on a website or marketplace." FrameKit is a
commercial product, so **clear this (and any future pack) with the vendor before
shipping** the plate publicly. The raw PSDs are intentionally NOT committed here.
