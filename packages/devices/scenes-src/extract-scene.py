"""
Photo-scene extractor: layered PSD mockup -> FrameKit raster plate.

Produces the two things a `category: "scene"` device needs:
  1. plate.png  - the scene composite (device + hand + shadows) with the SCREEN
                  knocked transparent (screenshot shows through) AND the photo
                  background removed (FrameKit's own background shows around it).
  2. manifest   - the screen rectangle (plate px) + upload resolution, cropped to
                  the subject so the device fills the frame at any aspect ratio.

Per-pack settings live in CONFIGS (layer names differ per vendor). Only handles
AXIS-ALIGNED smart objects — an angled/perspective screen (Trnf is a warped quad,
or the smart object carries a mesh warp) needs the renderer's quad path instead.

Usage:  python extract-scene.py <mockup.psd> <out-dir> <config-id> [plate_width=2000]
Deps:   pip install psd-tools pillow numpy scipy
"""
import sys, json
from psd_tools import PSDImage
from PIL import Image, ImageDraw
import numpy as np

SRC, OUT, CONFIG_ID = sys.argv[1], sys.argv[2], sys.argv[3]
PLATE_W = int(sys.argv[4]) if len(sys.argv) > 4 else 2000

CONFIGS = {
    # Pixeden hand-holding iPhone: hand+phone baked into one Multiply "Scene"
    # layer; isolate via the pack's silhouette mask layers; screen has a mask
    # (rounded corners + thumb occlusion).
    "hand-iphone-17-pro": {
        "design": "PUT YOUR DESIGN HERE", "design_parent": None,
        "hide": ["REMOVE THIS LAYER"],
        "subject_masks": ["Hand Mask", "iPhone Mask"],
        "use_design_mask": True,
    },
    # mockups-design.com floating iPad: straight-on, rectangular screen. Isolate
    # by hiding the background/reflection layers; screen = the (rect) NAF quad.
    "ipad-floating": {
        "design": "Design", "design_parent": "Screen",
        "hide": ["Background color", "Background", "Reflection", "Design"],
        "subject_masks": [],
        "use_design_mask": False,
    },
    # mockups-design.com ANGLED iPads (#2/#3/#4): perspective screen from the
    # smart object's nonAffineTransform quad; drop the background + shadow layers.
    "ipad-angled": {
        "design": "Design", "design_parent": "Screen",
        "hide": ["Background color", "Shadows", "Design"],
        "subject_masks": [],
        "use_design_mask": False,
    },
    # ---- angled device-only packs (iPhone / MacBook / Watch) ---------------
    # These share a pattern: colorway groups -> BG + device-pixel + "Change This"
    # smart object. `isolate_group` shows only the chosen device's pixels (found
    # via `under` = required ancestor names) and drops everything else, so the
    # device floats on a transparent bg; the angled screen comes from the NAF quad.
    # `inset`: shrink the screen quad toward its centre by this fraction. These
    # packs place the "design" edge-to-edge (no bezel) and even a hair past the
    # device outline, so a full-bleed screenshot pokes out at the rounded corners.
    # Insetting leaves a thin natural bezel and keeps the shot inside the screen.
    "iphone-16-float": {"design": "Change This", "under": ["1"], "isolate_group": True, "hide": [], "subject_masks": [], "use_design_mask": False, "inset": 0.022},
    "iphone-16-chair": {"design": "Change This", "under": [], "isolate_group": True, "hide": ["BG"], "subject_masks": [], "use_design_mask": False, "inset": 0.022},
    "iphone-16-pro":   {"design": "Change This", "under": ["iPhone 16 Pro"], "isolate_group": True, "hide": ["Background", "Sand"], "subject_masks": [], "use_design_mask": False, "inset": 0.022},
    "macbook-pro":     {"design": "Change This", "under": ["Space Gray"], "isolate_group": True, "hide": ["Shadow"], "subject_masks": [], "use_design_mask": False, "inset": 0.012},
    "macbook-air":     {"design": "Change This", "under": ["Device 1"], "isolate_group": True, "hide": [], "subject_masks": [], "use_design_mask": False, "inset": 0.012},
    "watch-ultra":     {"design": "Change This", "under": ["1"], "isolate_group": True, "hide": [], "subject_masks": [], "use_design_mask": False, "inset": 0.03},
}
cfg = CONFIGS[CONFIG_ID]

psd = PSDImage.open(SRC)
W, H = psd.width, psd.height
ORIG_VIS = [(l, l.visible) for l in psd.descendants()]


def ancestor_names(layer):
    names, p = [], layer.parent
    while p is not None and p is not psd:
        names.append(p.name)
        p = getattr(p, "parent", None)
    return names


def find_design():
    parent = cfg.get("design_parent")
    under = cfg.get("under")
    for l in psd.descendants():
        if l.name == cfg["design"] and l.kind == "smartobject":
            if parent is not None and (l.parent is None or l.parent.name != parent):
                continue
            if under and not all(n in ancestor_names(l) for n in under):
                continue
            return l  # first match = first colorway in document order
    raise SystemExit(f"design layer {cfg['design']!r} not found")


def siblings_of(layer):
    return list(layer.parent) if layer.parent is not None else list(psd)


def show_ancestors(layer):
    p = layer.parent
    while p is not None and p is not psd:
        try:
            p.visible = True
        except Exception:
            break
        p = getattr(p, "parent", None)


def subject_alpha(names):
    for l in psd.descendants():
        l.visible = l.name in names
    for l in psd.descendants():
        if l.name in names:
            show_ancestors(l)
    return np.array(psd.composite(force=True).convert("RGBA"))[:, :, 3].astype(np.float32) / 255.0


design = find_design()
d = design.tagged_blocks.get_data(b"SoLd").data
sz = d[b"Sz  "]
cw, ch = sz[b"Wdth"].value, sz[b"Hght"].value
# nonAffineTransform = the true screen corners [TL, TR, BR, BL] (perspective for
# angled scenes; equals the Trnf rect when axis-aligned)
naf = [x.value for x in d[b"nonAffineTransform"]]
quad = [(naf[0], naf[1]), (naf[2], naf[3]), (naf[4], naf[5]), (naf[6], naf[7])]
# inset toward the centroid so the screenshot sits inside a thin bezel
inset = cfg.get("inset", 0.0)
if inset:
    gx = sum(p[0] for p in quad) / 4.0
    gy = sum(p[1] for p in quad) / 4.0
    quad = [(gx + (x - gx) * (1 - inset), gy + (y - gy) * (1 - inset)) for x, y in quad]

# screen-knockout mask: the design layer's own mask (rounded corners + occlusion,
# e.g. the iPhone's thumb) or the screen quad polygon
if cfg["use_design_mask"] and design.mask is not None:
    mp = Image.new("L", (W, H), 0)
    mp.paste(design.mask.topil().convert("L"), (int(design.mask.bbox[0]), int(design.mask.bbox[1])))
    show = np.array(mp).astype(np.float32) / 255.0
else:
    poly = Image.new("L", (W, H), 0)
    ImageDraw.Draw(poly).polygon([(round(px), round(py)) for px, py in quad], fill=255)
    show = np.array(poly).astype(np.float32) / 255.0

subject = subject_alpha(cfg["subject_masks"]) if cfg["subject_masks"] else None

# set up the scene composite
if cfg.get("isolate_group"):
    # show ONLY the chosen device's pixel layers (drop bg / other colorways /
    # other devices), so the device floats on transparent
    for l in psd.descendants():
        l.visible = False
    for sib in siblings_of(design):
        if sib.kind != "smartobject":
            sib.visible = True
    show_ancestors(design)
    design.visible = False  # placeholder stays hidden
    for l in psd.descendants():
        if l.name in cfg["hide"]:
            l.visible = False
else:
    for l, v in ORIG_VIS:
        l.visible = v
    for l in psd.descendants():
        if l.name in cfg["hide"]:
            l.visible = False
print("compositing (may take a bit)...")
comp = np.array(psd.composite(force=True).convert("RGBA"))

final = comp[:, :, 3].astype(np.float32) * (1.0 - show)
if subject is not None:
    final = final * subject
comp[:, :, 3] = np.clip(final, 0, 255).astype(np.uint8)

# crop to the visible subject bbox (+ small margin) so the device fills the frame
# — this is what makes the mockup look right without zooming to 200%.
ys, xs = np.where(comp[:, :, 3] > 8)
pad = int(0.02 * max(H, W))
cx0, cy0 = max(0, xs.min() - pad), max(0, ys.min() - pad)
cx1, cy1 = min(W, xs.max() + pad), min(H, ys.max() + pad)
comp = comp[cy0:cy1, cx0:cx1]
ch_px, cw_px = comp.shape[0], comp.shape[1]

scale = PLATE_W / cw_px
tw, th = round(cw_px * scale), round(ch_px * scale)
Image.fromarray(comp, "RGBA").resize((tw, th), Image.LANCZOS).save(f"{OUT}/plate.png")

# map the screen quad into cropped+scaled plate space
pq = [[round((px - cx0) * scale), round((py - cy0) * scale)] for px, py in quad]
qxs = [p[0] for p in pq]; qys = [p[1] for p in pq]
sx = {"x": min(qxs), "y": min(qys), "width": max(qxs) - min(qxs), "height": max(qys) - min(qys)}
manifest = {"plate": {"width": tw, "height": th}, "screenRect": sx, "screenQuad": pq,
            "screen": {"width": int(cw), "height": int(ch)}}
with open(f"{OUT}/manifest.json", "w") as f:
    json.dump(manifest, f, indent=2)
print(json.dumps(manifest, indent=2))
