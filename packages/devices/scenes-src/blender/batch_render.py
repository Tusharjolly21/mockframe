"""
Render every device variant spec to apps/web/public/devices/<id>/<variant>.webp.

    <python-with-bpy> batch_render.py [--only id1,id2] [--force] [--samples N]

Specs come from `npm run gen:devices` (scenes-src/blender/specs/<id>/<variant>.json).
Run it with the venv python that has `bpy` installed (see scenes-src/blender/README.md).
Existing outputs are skipped unless --force is given, so an interrupted run resumes.
"""
import json
import os
import subprocess
import sys
import tempfile
import time

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
SPECS = os.path.join(HERE, "specs")
OUT = os.path.abspath(os.path.join(HERE, "..", "..", "..", "..", "apps", "web", "public", "devices"))
LONG_SIDE = {"phone": 2200, "laptop": 2200, "monitor": 2200}

args = sys.argv[1:]
only = args[args.index("--only") + 1].split(",") if "--only" in args else None
force = "--force" in args
samples_override = int(args[args.index("--samples") + 1]) if "--samples" in args else None

ORDER = {"square": 0, "round": 0, "phone": 1, "laptop": 2, "monitor": 3}
jobs = []
for dev in sorted(os.listdir(SPECS)):
    if only and dev not in only:
        continue
    for f in sorted(os.listdir(os.path.join(SPECS, dev))):
        spec = json.load(open(os.path.join(SPECS, dev, f)))
        jobs.append((ORDER[spec["kind"]], dev, f[:-5], spec))
jobs.sort(key=lambda j: (j[0], j[1], j[2]))

for _, dev, variant, spec in jobs:
    dest = os.path.join(OUT, dev, f"{variant}.webp")
    if os.path.exists(dest) and not force:
        continue
    os.makedirs(os.path.dirname(dest), exist_ok=True)
    W, H = spec["frame"]["width"], spec["frame"]["height"]
    kind = spec["kind"]
    if kind in ("square", "round"):
        scale, samples = 1.5, 64
    else:
        scale = min(1.0, LONG_SIDE[kind] / max(W, H) if kind != "phone" else LONG_SIDE[kind] / max(W, H))
        samples = 36
    if samples_override:
        samples = samples_override
    t0 = time.time()
    with tempfile.TemporaryDirectory() as td:
        png = os.path.join(td, "out.png")
        r = subprocess.run([sys.executable, os.path.join(HERE, "render_device.py"), os.path.join(SPECS, dev, f"{variant}.json"), png, "--scale", str(scale), "--samples", str(samples)], capture_output=True, text=True)
        if r.returncode != 0 or not os.path.exists(png):
            print("FAILED", dev, variant, r.stderr[-600:], flush=True)
            continue
        im = Image.open(png).convert("RGBA")
        # keep the registry frame size: the SVG <image> stretches to W x H, so only the aspect must match
        im.save(dest, "WEBP", quality=90, method=6, alpha_quality=100)
    print(f"ok {dev}/{variant} {os.path.getsize(dest) // 1024}KB {time.time() - t0:.0f}s", flush=True)
