#!/usr/bin/env python3
"""Remove the uniform dark "veil" from cut-out scene plates.

Some PSDs (the podium scenes, one Watch Ultra scene) carry a shadow layer that
darkens the WHOLE photo, not just the contact shadow. extract_mockups_design.py
--cutout turned that global darkening into semi-transparent black across the
entire plate, so on any Style background other than the original the plate
shows as a dark rectangle the size of the canvas.

For each plate this script:
  1. detects the veil: an alpha level that most of the plate sits at
     (a cut-out plate is otherwise mostly fully transparent),
  2. un-composites it: the plate is treated as content OVER a uniform veil
     (colour V, alpha a0), so content alpha = (a - a0) / (1 - a0) and content
     colour follows from the premultiplied difference. Fully opaque pixels
     (the device, the podium) are unchanged; contact shadows darker than the
     veil keep their extra darkness; the screen (glare film) is left alone,
  3. folds the veil into the backdrop colour in template.json, so a fresh
     scene still opens looking exactly like the photo, and rewrites thumb.webp.

Usage: strip_backdrop_veil.py <plate_dir>... [--dry-run]
Prints the new backdrop colour per plate; update psdMockupsDesignScenes.ts to match.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image


# the veil must cover at least this share of the plate to count (podium plates: 50–83%)
MIN_VEIL_SHARE = 0.4
# ...and be visibly dark: a 1/255 haze (webp noise on two MacBook plates) is not a veil
MIN_VEIL_ALPHA = 8


def write_thumb(dir_: Path, backdrop: str | None, screen_fill: str | None) -> None:
    """800px picker tile, as extract_mockups_design.write_thumb, except the empty
    screen keeps the original light backdrop colour: flattened onto the darker
    folded backdrop it would read as a grey, switched-off screen."""
    plate = Image.open(dir_ / "plate.webp").convert("RGBA")
    k = 800 / plate.width
    size = (800, round(plate.height * k))
    thumb = plate.resize(size, Image.LANCZOS)
    flat = Image.new("RGBA", size, backdrop or (0, 0, 0, 0))
    if screen_fill:
        mask = Image.open(dir_ / "screen-mask.png").convert("RGBA").getchannel("A").resize(size, Image.LANCZOS)
        flat.paste(Image.new("RGBA", size, screen_fill), (0, 0), mask)
    flat.alpha_composite(thumb)
    flat.save(dir_ / "thumb.webp", quality=82, method=6)


def detect_veil(rgba: np.ndarray, screen: np.ndarray) -> tuple[float, np.ndarray] | None:
    """(alpha a0 in 0..1, colour V in 0..1) of a uniform veil, or None."""
    a8 = rgba[..., 3]
    outside = screen == 0
    hist = np.bincount(a8[outside].ravel(), minlength=256)
    hist[0] = hist[255] = 0
    level = int(hist.argmax())
    if level < MIN_VEIL_ALPHA or hist[level] < MIN_VEIL_SHARE * outside.sum():
        return None
    # the veil is a band of ±1 around the mode (webp rounding)
    band = outside & (np.abs(a8.astype(np.int16) - level) <= 1)
    colour = np.median(rgba[band][:, :3], axis=0) / 255.0
    return level / 255.0, colour


def strip(dir_: Path, dry_run: bool) -> None:
    plate_path = dir_ / "plate.webp"
    meta_path = dir_ / "template.json"
    img = Image.open(plate_path).convert("RGBA")
    rgba = np.asarray(img, dtype=np.uint8)
    mask = Image.open(dir_ / "screen-mask.png").convert("RGBA").getchannel("A").resize(img.size)
    screen = np.asarray(mask, dtype=np.uint8)

    found = detect_veil(rgba, screen)
    if not found:
        print(f"{dir_.name}: no veil, unchanged")
        return
    a0, v = found
    meta = json.loads(meta_path.read_text())
    old_backdrop = meta.get("backdrop")

    f = rgba.astype(np.float32) / 255.0
    a = f[..., 3:4]
    content_a = np.clip((a - a0) / (1.0 - a0), 0.0, 1.0)
    premult = f[..., :3] * a - (1.0 - content_a) * (v * a0)
    rgb = np.where(content_a > 1e-4, premult / np.maximum(content_a, 1e-4), 0.0)
    out = np.dstack([np.clip(rgb, 0, 1), content_a])
    # the screen opening holds only the glare film — keep it exactly as extracted
    keep = (screen > 0)[..., None]
    out = np.where(keep, f, out)

    new_backdrop = None
    if old_backdrop:
        b = np.array([int(old_backdrop[i : i + 2], 16) for i in (1, 3, 5)], np.float32) / 255.0
        veiled = v * a0 + b * (1.0 - a0)
        new_backdrop = "#%02x%02x%02x" % tuple(int(round(float(c) * 255)) for c in veiled)

    share = float((np.abs(rgba[..., 3].astype(np.int16) - round(a0 * 255)) <= 1).mean())
    print(f"{dir_.name}: veil alpha {a0:.3f} over {share:.0%} of the plate, backdrop {old_backdrop} -> {new_backdrop}")
    if dry_run:
        return

    Image.fromarray((out * 255 + 0.5).astype(np.uint8), "RGBA").save(plate_path, quality=92, method=6, exact=True)
    if new_backdrop:
        meta["backdrop"] = new_backdrop
        meta_path.write_text(json.dumps(meta, indent=2) + "\n")
    write_thumb(dir_, new_backdrop, old_backdrop)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("dirs", type=Path, nargs="+")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()
    for d in args.dirs:
        strip(d, args.dry_run)
