#!/usr/bin/env python3
"""Extract MacBook Air 13" scene plates from the layered mockup PSDs.

Source PSDs are read-only. For each requested color variant we toggle the
color fill layers, composite the document WITHOUT the background / replace-
screen / reflection groups, cut the screen region to alpha (mode "hole"),
and export a downscaled device-base.png + screen-mask.png + geometry JSON.
"""

from __future__ import annotations

import json
from pathlib import Path

from PIL import Image, ImageChops
from psd_tools import PSDImage

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "apps/web/public/psd-templates/macbook-air-13"
SCALE = 0.5  # 7500x5000 → 3750x2500 before crop

EXCLUDE_TOP = {"BACKGROUND", "OPTIONAL REFLECTION LIGHT SCREEN", "FLOATING SHADOW"}


def find_group(psd, name):
    for layer in psd:
        if layer.name.strip().upper() == name:
            return layer
    return None


def set_color(device_group, want: str):
    """Show exactly one color fill inside the device group."""
    for child in device_group:
        if child.kind == "solidcolorfill":
            child.visible = child.name.strip().upper() == want


def extract(psd_path: Path, variants: list[str]):
    psd = PSDImage.open(psd_path)
    w, h = psd.size
    device_group = find_group(psd, 'MACBOOK AIR 13"')
    screen_group = next(l for l in psd if "REPLACE THIS SCREEN" in l.name.upper())
    mask_shape = next(l for l in screen_group if "MASK SCREEN" in l.name.upper())
    screen_so = next(l for l in screen_group if l.kind == "smartobject")

    # screen quad from the smart object's transform box (document coords)
    pts = screen_so.smart_object.transform_box
    quad = [[pts[i], pts[i + 1]] for i in range(0, len(pts), 2)]

    # rasterize the mask shape once (document coords)
    mask_img = mask_shape.composite()
    mask_full = Image.new("L", (w, h), 0)
    mx, my = int(mask_shape.bbox[0]), int(mask_shape.bbox[1])
    mask_full.paste(mask_img.getchannel("A"), (mx, my))

    results = []
    for variant in variants:
        set_color(device_group, variant.upper())

        def keep(layer):
            if layer.name.strip().upper() in EXCLUDE_TOP:
                return False
            if layer is screen_group:
                return False
            return layer.visible

        base = psd.composite(force=True, layer_filter=keep).convert("RGBA")
        if base.size != (w, h):
            padded = Image.new("RGBA", (w, h), (0, 0, 0, 0))
            padded.alpha_composite(base, (0, 0))
            base = padded

        # cut the screen hole
        base.putalpha(ImageChops.subtract(base.getchannel("A"), mask_full))

        # crop to content + small margin, then downscale
        bbox = base.getbbox()
        m = 40
        crop = (max(0, bbox[0] - m), max(0, bbox[1] - m), min(w, bbox[2] + m), min(h, bbox[3] + m))
        base_c = base.crop(crop)
        mask_c = mask_full.crop(crop)
        cw, ch = base_c.size
        sw, sh = round(cw * SCALE), round(ch * SCALE)
        base_s = base_c.resize((sw, sh), Image.LANCZOS)
        mask_s = mask_c.resize((sw, sh), Image.LANCZOS)

        vdir = OUT / variant.lower().replace(" ", "-")
        vdir.mkdir(parents=True, exist_ok=True)
        base_s.save(vdir / "device-base.png", optimize=True)
        mask_rgba = Image.new("RGBA", (sw, sh), (255, 255, 255, 0))
        mask_rgba.putalpha(mask_s)
        mask_rgba.save(vdir / "screen-mask.png", optimize=True)

        vquad = [[round((x - crop[0]) * SCALE, 2), round((y - crop[1]) * SCALE, 2)] for x, y in quad]
        results.append({
            "variant": variant.lower().replace(" ", "-"),
            "plate": {"width": sw, "height": sh},
            "quad": vquad,
            "screenRes": [2560, 1664],
        })
        print(f"  {variant}: plate {sw}x{sh}, quad {vquad}", flush=True)

    (OUT / "geometry.json").write_text(json.dumps({"source": psd_path.name, "variants": results}, indent=2))
    print("geometry.json written", flush=True)


if __name__ == "__main__":
    extract(ROOT / 'psd/01 - Macbook Air 13" Mockup.psd', ["MIDNIGHT", "SILVER"])
