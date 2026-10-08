#!/usr/bin/env python3
"""Extract full-bleed photo scenes from mockups-design.com PSDs.

These PSDs share one structure: a `Design` group holding the replaceable screen
smart object, a layer mask on that group that is the exact (rounded, notched)
screen opening, and a `Highlights` glare layer. For each PSD we

  1. composite the document with the screen smart object, the glare, the
     "Delete this layer" helper and the hidden duplicate smart object hidden,
  2. re-add the glare in screen space as a semi-transparent white film,
  3. punch the screen opening out of the plate (hole mode), so the screenshot
     renders behind the plate and the glare sits on top of it,
  4. write plate.webp + screen-mask.png + template.json (quad, screen size).

Usage: extract_mockups_design.py <psd> <out_dir> [--scale 1.0]
       extract_mockups_design.py --thumb-only <out_dir>   (rewrite thumb.webp from plate.webp)
Source PSDs are read-only and are never copied into the repo.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image
from psd_tools import PSDImage


def walk(layers):
    for layer in layers:
        yield layer
        if layer.kind == "group":
            yield from walk(layer)


def ancestors(layer):
    while layer is not None and getattr(layer, "name", None) is not None:
        yield layer
        layer = layer.parent


def find_screen(psd, index=0):
    """The replaceable screen smart object.

    Most PSDs hold one visible smart object inside a screen group (outside any
    Reflection group). Others keep one masked smart object per screen at the
    document root; `index` then picks one, ordered left to right.
    """
    for layer in walk(psd):
        if layer.kind != "smartobject" or not layer.visible or layer.parent is psd:
            continue
        if any("reflection" in a.name.lower() for a in ancestors(layer)):
            continue
        return layer
    roots = [l for l in psd if l.kind == "smartobject" and l.visible and l.mask is not None]
    roots.sort(key=lambda l: l.bbox[0])
    if not roots:
        raise SystemExit("no screen smart object")
    return roots[index]


def warped_quad(so):
    """Screen corners [TL, TR, BR, BL] in document px.

    The smart object's transform box is the plain rectangle; a mesh warp (the
    perspective of an angled shot) deforms the source in its own pixel space
    first. Take the mesh corners and push them through the transform box.
    """
    pts = so.smart_object.transform_box
    box = [(pts[i], pts[i + 1]) for i in range(0, 8, 2)]
    try:
        from psd_tools.constants import Tag

        warp = so._record.tagged_blocks.get_data(Tag.PLACED_LAYER2).warp
        mesh = warp[b"customEnvelopeWarp"][b"meshPoints"]
        hm = np.array(mesh[b"Hrzn"].values)
        vm = np.array(mesh[b"Vrtc"].values)
        n = int(round(len(hm) ** 0.5))
        hm, vm = hm.reshape(n, n), vm.reshape(n, n)
        b = warp[b"bounds"]
        sw, sh = b[b"Rght"] - b[b"Left"], b[b"Btom"] - b[b"Top "]
    except Exception:
        return box
    tl, tr, _, bl = box
    corners = [(hm[0, 0], vm[0, 0]), (hm[0, -1], vm[0, -1]), (hm[-1, -1], vm[-1, -1]), (hm[-1, 0], vm[-1, 0])]
    out = [
        (tl[0] + (x / sw) * (tr[0] - tl[0]) + (y / sh) * (bl[0] - tl[0]), tl[1] + (x / sw) * (tr[1] - tl[1]) + (y / sh) * (bl[1] - tl[1]))
        for x, y in corners
    ]
    # an unwarped object has a mesh that just reproduces its box
    if max(abs(a[0] - c[0]) + abs(a[1] - c[1]) for a, c in zip(out, box)) < 3:
        return box
    return out


def quad_mask(size, quad):
    """Antialiased polygon of the screen quad, for PSDs whose screen group has no mask."""
    from PIL import ImageDraw

    k = 3
    big = Image.new("L", (size[0] * k, size[1] * k), 0)
    ImageDraw.Draw(big).polygon([(x * k, y * k) for x, y in quad], fill=255)
    return np.asarray(big.resize(size, Image.LANCZOS), dtype=np.float32) / 255.0


def full_canvas(img: Image.Image, bbox, size, mode):
    out = Image.new(mode, size, 0)
    out.paste(img, (int(bbox[0]), int(bbox[1])))
    return out


def write_thumb(out: Path):
    """800px picker thumbnail (the 4000px plate is far too heavy for a grid tile)."""
    plate = Image.open(out / "plate.webp").convert("RGBA")
    k = 800 / plate.width
    plate.resize((800, round(plate.height * k)), Image.LANCZOS).save(out / "thumb.webp", quality=82, method=6)


def extract(psd_path: Path, out: Path, scale: float, index: int = 0):
    psd = PSDImage.open(psd_path)
    w, h = psd.size
    screen_so = find_screen(psd, index)
    # the layer that owns the screen opening: its group, or the smart object itself
    design = screen_so if screen_so.parent is psd else screen_so.parent
    glare_layers = [l for l in walk(design) if l.name.strip().lower() == "highlights"] if design.kind == "group" else []
    # glare that lives outside the Design group (MacBook scenes) is baked into
    # the plate outside the screen; inside the screen we re-add it ourselves
    glare_all = [l for l in walk(psd) if l.name.strip().lower() == "highlights" and l.kind in ("pixel", "solidcolorfill")]

    quad = [[round(float(x), 3), round(float(y), 3)] for x, y in warped_quad(screen_so)]
    from io import BytesIO

    screen_size = PSDImage.open(BytesIO(screen_so.smart_object.data)).size

    # screen opening in document space (0..1): the screen group's mask when it
    # has one (rounded corners, island cut-out), else the smart object's quad
    if design.mask is not None:
        mask = design.mask.topil().convert("L")
        screen = np.asarray(full_canvas(mask, design.mask.bbox, (w, h), "L"), dtype=np.float32) / 255.0
    else:
        screen = quad_mask((w, h), quad)

    # glare = what the highlight layers add on top of the screen
    glare = np.zeros((h, w, 3), np.float32)
    for layer in glare_all:
        img = layer.composite()
        if img is None:
            continue
        rgba = np.asarray(full_canvas(img.convert("RGBA"), layer.bbox, (w, h), "RGBA"), dtype=np.float32) / 255.0
        glare = np.maximum(glare, rgba[..., :3] * rgba[..., 3:4])

    # hide everything that is not the finished scene minus its screen content
    hide = [screen_so] + [l for l in walk(psd) if l.name.strip().lower().startswith("delete this layer")]
    hide += [l for l in psd if l.kind == "smartobject"]  # hidden top-level duplicate
    # a reflection group mirrors the placeholder screen onto the deck; it would bake that in
    hide += [l for l in walk(psd) if l.kind == "group" and "reflection" in l.name.lower()]
    for layer in hide:
        layer.visible = False
    for layer in glare_layers:
        layer.visible = False
    base = np.asarray(psd.composite(force=True).convert("RGB"), dtype=np.float32) / 255.0

    # inside the screen the plate is just the glare film: white at alpha = glare
    film_a = glare.max(axis=2)
    film_rgb = np.where(film_a[..., None] > 1e-4, glare / np.maximum(film_a[..., None], 1e-4), 1.0)
    s = screen[..., None]
    alpha = (1.0 - s) + s * film_a[..., None]
    premult = base * (1.0 - s) + film_rgb * film_a[..., None] * s
    rgb = np.where(alpha > 1e-4, premult / np.maximum(alpha, 1e-4), 0.0)
    plate = np.dstack([np.clip(rgb, 0, 1), np.clip(alpha, 0, 1)])
    plate_img = Image.fromarray((plate * 255 + 0.5).astype(np.uint8), "RGBA")

    mask_img = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    mask_img.putalpha(Image.fromarray((screen * 255 + 0.5).astype(np.uint8), "L"))

    if scale != 1.0:
        size = (round(w * scale), round(h * scale))
        plate_img = plate_img.resize(size, Image.LANCZOS)
        mask_img = mask_img.resize(size, Image.LANCZOS)
        quad = [[round(x * scale, 3), round(y * scale, 3)] for x, y in quad]
        w, h = size

    out.mkdir(parents=True, exist_ok=True)
    plate_img.save(out / "plate.webp", quality=92, method=6, exact=True)
    mask_img.save(out / "screen-mask.png", optimize=True)
    write_thumb(out)
    (out / "template.json").write_text(
        json.dumps(
            {
                "source": psd_path.name,
                "plate": {"width": w, "height": h},
                "quad": quad,
                "screen": {"width": screen_size[0], "height": screen_size[1]},
            },
            indent=2,
        )
        + "\n"
    )
    print(f"{psd_path.name}: plate {w}x{h}, screen {screen_size}, quad {quad}", flush=True)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("psd", type=Path)
    ap.add_argument("out", type=Path, nargs="?")
    ap.add_argument("--scale", type=float, default=1.0)
    ap.add_argument("--thumb-only", action="store_true")
    ap.add_argument("--screen", type=int, default=0, help="which root-level screen to cut out (left to right)")
    a = ap.parse_args()
    if a.thumb_only:
        write_thumb(a.psd)  # the single positional is the output directory
    else:
        extract(a.psd, a.out, a.scale, a.screen)
