#!/usr/bin/env python3
"""Extract a composite PSD whose replaceable screen has a separate mask PSB."""

from __future__ import annotations

import argparse
import json
import re
from io import BytesIO
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw
from psd_tools import PSDImage


def safe(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")


def walk(layer, path=()):
    if layer.kind == "smartobject":
        yield layer, path + (layer.name,)
    if layer.kind == "group":
        for child in layer:
            yield from walk(child, path + (layer.name,))


def groups(layer):
    if layer.kind == "group":
        yield layer
        for child in layer:
            yield from groups(child)


def find_smart(root, text):
    text = text.lower()
    return next((layer for layer, _ in walk(root) if text in layer.name.lower()), None)


def extract(psd_path: Path, output: Path):
    psd = PSDImage.open(psd_path)
    output.mkdir(parents=True, exist_ok=True)
    manifest = {
        "source": psd_path.name,
        "sourcePath": str(psd_path),
        "size": list(psd.size),
        "colorMode": str(psd.color_mode),
        "depth": psd.depth,
        "preservedPsd": True,
        "smartObjects": [],
        "layers": [],
    }

    for root_layer in psd:
        screen_group = next((layer for layer in groups(root_layer) if "REPLACE THIS SCREEN" in layer.name.upper()), None)
        if not screen_group:
            continue
        screen = find_smart(screen_group, "REPLACE THIS SCREEN")
        mask_source = find_smart(screen_group, "MASK SCREEN")
        if not screen or not mask_source:
            continue

        target = output / "scene"
        target.mkdir(parents=True, exist_ok=True)
        width, height = psd.size

        # These PSDs place the replace-screen group at document root beside
        # the hand/device layers. Render the complete document, then remove
        # only the screen mask region so every scene layer remains intact.
        base = psd.composite(force=True).convert("RGBA")
        if base.size != (width, height):
            normalized = Image.new("RGBA", (width, height), (0, 0, 0, 0))
            normalized.alpha_composite(base, (0, 0))
            base = normalized
        screen_mask = Image.new("L", (width, height), 0)
        with mask_source.smart_object.open() as mask_file:
            mask_psb = PSDImage.open(mask_file)
            mask_image = mask_psb.composite(force=True).convert("RGBA")
        mask_alpha = mask_image.getchannel("A")
        if mask_alpha.getbbox() is None:
            mask_alpha = mask_image.convert("L").point(lambda value: 255 if value > 30 else 0)
        mask_left, mask_top, _, _ = tuple(int(round(v)) for v in mask_source.bbox)
        screen_mask.paste(mask_alpha, (mask_left, mask_top))

        alpha = ImageChops.subtract(base.getchannel("A"), screen_mask)
        base.putalpha(alpha)
        base.save(target / "device-base.png")

        mask_rgba = Image.new("RGBA", (width, height), (255, 255, 255, 0))
        mask_rgba.putalpha(screen_mask)
        mask_rgba.save(target / "screen-mask.png")
        Image.new("RGBA", (width, height), (0, 0, 0, 0)).save(target / "foreground.png")
        Image.new("RGBA", (width, height), (0, 0, 0, 0)).save(target / "reflection.png")

        with screen.smart_object.open() as screen_file:
            screen_bytes = screen_file.read()
        inner = PSDImage.open(BytesIO(screen_bytes))
        points = screen.smart_object.transform_box
        quad = [[round(points[i], 4), round(points[i + 1], 4)] for i in range(0, len(points), 2)]
        entry = {
            "id": f"{safe(psd_path.stem)}-scene",
            "sourceLayerPath": [screen_group.name, screen.name],
            "renderMode": "masked-composite-smart-object-fallback",
            "sourcePsd": psd_path.name,
            "preservesSourcePsd": True,
            "canvas": {"width": width, "height": height},
            "screen": {
                "smartObjectName": screen.name,
                "smartObjectFile": "smart-object.psb",
                "sourceSize": list(inner.size),
                "bounds": list(screen.bbox),
                "quad": quad,
                "mask": "screen-mask.png",
                "cornerRadius": 0,
                "clippingMask": True,
            },
            "layers": {"name": "full-document-composite", "kind": "document", "childrenParsed": True},
            "assets": {
                "deviceBase": "device-base.png",
                "screenMask": "screen-mask.png",
                "foreground": "foreground.png",
                "reflection": "reflection.png",
            },
            "notes": [
                "The full Photoshop composite is preserved as the base; only the nested replace-screen region is alpha-cleared.",
                "The separate MASK SCREEN Smart Object is extracted as the browser alpha mask.",
            ],
        }
        (target / "smart-object.psb").write_bytes(screen_bytes)
        (target / "template.json").write_text(json.dumps(entry, indent=2) + "\n")
        manifest["smartObjects"].append(entry)
        manifest["layers"].append({"name": "full-document-composite", "kind": "document", "children": [entry]})

    (output / "psd-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("psd", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    extract(args.psd, args.output)
