"""Convert the PNGs render.mjs wrote into WebP (quality 86) and remove the PNGs."""
import glob
import os
import sys

from PIL import Image

root = os.path.join(os.path.dirname(__file__), "../../apps/web/public/store-sets")
for png in glob.glob(os.path.join(root, "*", "*.png")):
    if len(sys.argv) > 1 and f"/{sys.argv[1]}/" not in png:
        continue
    Image.open(png).convert("RGB").save(png[:-4] + ".webp", "WEBP", quality=86, method=6)
    os.remove(png)
    print("webp", os.path.relpath(png[:-4] + ".webp", root))
