#!/usr/bin/env python3
"""Extract reusable, non-destructive templates from a layered watch PSD.

The source PSD is only read. It is never saved or flattened. The generated
template keeps the original layer manifest and embedded Smart Object payload,
while the browser fallback uses the extracted device case plus a perspective
screen quad.
"""

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


def layer_manifest(layer, origin=(0, 0)):
    x0, y0 = origin
    bbox = tuple(int(round(v)) for v in layer.bbox)
    entry = {
        "name": layer.name,
        "kind": layer.kind,
        "visible": bool(layer.visible),
        "opacity": int(layer.opacity),
        "blendMode": str(layer.blend_mode),
        "clipping": bool(getattr(layer, "clipping", False)),
        "bounds": {"left": bbox[0], "top": bbox[1], "right": bbox[2], "bottom": bbox[3]},
        "localBounds": {"left": bbox[0] - x0, "top": bbox[1] - y0, "right": bbox[2] - x0, "bottom": bbox[3] - y0},
    }
    if getattr(layer, "kind", None) == "smartobject":
        so = layer.smart_object
        entry["smartObject"] = {
            "filename": so.filename,
            "filetype": so.filetype,
            "bytes": len(so.data),
            "transformBox": [list(point) for point in zip(so.transform_box[::2], so.transform_box[1::2])],
            "maskBounds": list(layer.mask.bbox) if layer.mask else None,
        }
    if getattr(layer, "kind", None) == "group":
        entry["children"] = [layer_manifest(child, (bbox[0], bbox[1])) for child in layer]
    return entry


def normalized_quad(smart, group_bbox):
    gx, gy, _, _ = group_bbox
    points = smart.smart_object.transform_box
    return [[round(points[i] - gx, 4), round(points[i + 1] - gy, 4)] for i in range(0, len(points), 2)]


def smart_object_placements(layer):
    """Yield every group whose children include a replaceable Smart Object."""
    if getattr(layer, "kind", None) != "group":
        return
    if any(getattr(child, "kind", None) == "smartobject" for child in layer):
        yield layer
        return
    for child in layer:
        yield from smart_object_placements(child)


def composite_without_smart_objects(layer, bounds):
    """Composite a placement's device/shadow layers, excluding its screen PSB."""
    left, top, right, bottom = bounds
    canvas = Image.new("RGBA", (right - left, bottom - top), (0, 0, 0, 0))
    for child in layer:
        if getattr(child, "kind", None) == "smartobject":
            continue
        image = child.composite(force=True).convert("RGBA")
        child_left, child_top, _, _ = tuple(int(round(v)) for v in child.bbox)
        canvas.alpha_composite(image, (child_left - left, child_top - top))
    return canvas


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
        "layers": [layer_manifest(layer) for layer in psd],
    }

    for top in psd:
        top_slug = safe(top.name)
        for placement in smart_object_placements(top):
            smart = next((child for child in placement if child.kind == "smartobject"), None)
            if not smart:
                continue

            group_bbox = tuple(int(round(v)) for v in placement.bbox)
            left, top_y, right, bottom = group_bbox
            width, height = right - left, bottom - top_y
            placement_slug = safe(placement.name)
            target = output / top_slug / placement_slug
            target.mkdir(parents=True, exist_ok=True)

            with smart.smart_object.open() as smart_file:
                smart_bytes = smart_file.read()
            smart_psb = PSDImage.open(BytesIO(smart_bytes))
            source_size = list(smart_psb.size)

            case_image = composite_without_smart_objects(placement, group_bbox)

            quad = normalized_quad(smart, group_bbox)

            # The Smart Object has a real Photoshop layer mask. Use that mask
            # directly; approximating the opening from dark case pixels leaves
            # the black glass border and cannot reproduce Photoshop's clipping.
            mask_layer = smart.mask
            screen_mask = Image.new("L", (width, height), 0)
            if mask_layer:
                mask_left, mask_top = (int(round(v)) for v in mask_layer.bbox[:2])
                screen_mask.paste(mask_layer.topil(), (mask_left - left, mask_top - top_y))
            else:
                # PSDs without a Smart Object mask still get a conservative
                # transform-box fallback.
                ImageDraw.Draw(screen_mask).polygon([tuple(point) for point in quad], fill=255)
            alpha = ImageChops.subtract(case_image.getchannel("A"), screen_mask)
            case_image.putalpha(alpha)
            case_image.save(target / "device-base.png")

            # The PSD's case pixels already contain the bezel, shadows and
            # highlights. These explicit layers make the fallback contract
            # stable for future PSDs with separate foreground/reflection layers.
            Image.new("RGBA", (width, height), (0, 0, 0, 0)).save(target / "foreground.png")
            Image.new("RGBA", (width, height), (0, 0, 0, 0)).save(target / "reflection.png")

            # Store the mask as alpha, not only grayscale. CSS mask-image uses
            # the alpha channel by default, so black RGB pixels outside the
            # screen must be transparent rather than opaque black.
            screen_mask_rgba = Image.new("RGBA", (width, height), (255, 255, 255, 0))
            screen_mask_rgba.putalpha(screen_mask)
            screen_mask_rgba.save(target / "screen-mask.png")

            (target / "smart-object.psb").write_bytes(smart_bytes)

            entry = {
                "id": f"{top_slug}-{placement_slug}",
                "sourceLayerPath": [top.name, placement.name, smart.name],
                "renderMode": "perspective-smart-object-fallback",
                "sourcePsd": psd_path.name,
                "preservesSourcePsd": True,
                "canvas": {"width": width, "height": height},
                "screen": {
                    "smartObjectName": smart.name,
                    "smartObjectFile": "smart-object.psb",
                    "sourceSize": source_size,
                    "bounds": list(smart.bbox),
                    "quad": quad,
                    "mask": "screen-mask.png",
                    "cornerRadius": 0,
                    "clippingMask": True,
                },
                "layers": layer_manifest(placement, (left, top_y)),
                "assets": {
                    "deviceBase": "device-base.png",
                    "screenMask": "screen-mask.png",
                    "foreground": "foreground.png",
                    "reflection": "reflection.png",
                },
                "notes": [
                    "The PSD contains no separate named reflection layer; case highlights, shadows and bezel shading are baked into the case pixel layer.",
                    "The original PSD and embedded PSB are preserved; the fallback replaces only the screen content at render time.",
                ],
            }
            (target / "template.json").write_text(json.dumps(entry, indent=2) + "\n")
            manifest["smartObjects"].append(entry)

    (output / "psd-manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("psd", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    extract(args.psd, args.output)
