# Photoreal device bodies

Phones, tablets, foldables, laptops, desktop displays and watches are rendered
from **original procedural geometry** in Blender/Cycles. Nothing here is a
scan, a trace or a third-party model: rails are bevelled slabs, glass is a
coated black dielectric, straps are modelled bands, lit by a small studio rig.

```
generate-frames.mjs ──► specs/<id>/<variant>.json ──► render_device.py ──► public/devices/<id>/<variant>.webp
                                                        (batch_render.py)
```

## Regenerate

1. `npm run gen:devices` writes `specs/**` (and the vector SVGs).
2. Render the bodies (about 1–2 min per variant on 4 CPU cores, resumable):

   ```bash
   python3 -m venv .venv && .venv/bin/pip install bpy pillow   # bpy 5.x wheel, Python 3.13
   .venv/bin/python packages/devices/scenes-src/blender/batch_render.py [--only iphone-17-pro,imac-24] [--force]
   ```

3. `npm run gen:devices` again: any variant with a rendered body now emits an
   `<image href="/devices/<id>/<variant>.webp">` as its body. Variants without a
   render keep the vector body, so a partial run is always safe.
4. Bake the picker thumbnails (body + wallpaper + overlay):

   ```bash
   python3 packages/devices/scenes-src/wallpapers/make_wallpapers.py /tmp/wp --w 900 --h 1950 --suffix -p
   python3 packages/devices/scenes-src/wallpapers/make_wallpapers.py /tmp/wp --w 1800 --h 1125 --suffix -l
   node packages/devices/scripts/bake-previews.mjs /tmp/wp     # needs playwright-core + Chromium
   npm run gen:devices
   ```

## Geometry rules

* 1 Blender unit = 1 frame px; the camera is orthographic, straight on.
* Frame size and screen rect are copied from the generator, so layers, saved
  drafts and layouts keep working. The screenshot is drawn over a black display
  slab; camera islands and notches remain vector overlays.
* `frontFill` adds a soft frontal card that is **light-linked to metal parts
  only**, so flat aluminium reads as aluminium while the glass stays black.
