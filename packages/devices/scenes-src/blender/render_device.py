"""
Procedural photoreal device bodies (phones, tablets, foldables, laptops,
desktop displays and smartwatches), rendered in Blender/Cycles from original
geometry. No third-party artwork or scans are used.

Run:  python render_device.py spec.json out.png [--scale 0.8] [--samples 64]

Every spec keeps the registry frame geometry 1:1 (same frame size, same screen
rect), so layers, layouts and saved drafts that use these devices keep working.
The screenshot is drawn over the black display slab; the camera island / notch
stay as vector overlays on top.
"""
import json
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import bpy  # noqa: E402
import bmesh  # noqa: E402
from common import (  # noqa: E402
    boolean_cut, disc, glass, knurled_profile, lathe_x, metal, ortho_camera, render, rubber,
    setup_scene, slab, strap, studio_rig, studio_world,
)

args = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else sys.argv[1:]
spec = json.load(open(os.path.abspath(args[0])))
out_path = os.path.abspath(args[1])
scale = float(args[args.index("--scale") + 1]) if "--scale" in args else 0.8
samples = int(args[args.index("--samples") + 1]) if "--samples" in args else 64

W, H = spec["frame"]["width"], spec["frame"]["height"]
scene = setup_scene(W, H, scale, samples)
kind = spec["kind"]


def fx(x):  # frame px -> blender x
    return x - W / 2


def fy(y):  # frame px -> blender y
    return H / 2 - y


def mix(a, b, t):
    a, b = a.lstrip("#"), b.lstrip("#")
    ch = [round(int(a[i:i + 2], 16) * (1 - t) + int(b[i:i + 2], 16) * t) for i in (0, 2, 4)]
    return "#%02x%02x%02x" % tuple(ch)


def lift(c):
    """Anodised black metals still catch light; lift very dark base colours so edges read as metal, not void."""
    h = c.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    lum = 0.2126 * r + 0.7152 * g + 0.0722 * b
    return mix(c, "#6a6a72", (0.16 - lum) / 0.16 * 0.55) if lum < 0.16 else c


def black_glass(name="glass"):
    return glass(name, "#030304", 0.03)


def display_mat():
    return glass("display", "#020204", 0.03)


def build_phone(s):
    """Phone, tablet or book foldable: metal rail with a rolled bevel, cover glass, display."""
    M, bodyW, bodyH, bodyR, rim = s["M"], s["bodyW"], s["bodyH"], s["bodyR"], s["rim"]
    cx, cy = M + bodyW / 2, M + bodyH / 2
    depth = s.get("depth", bodyW * 0.115)
    rail = metal("rail", lift(s["railColor"]), rough=s.get("railRough", 0.3))
    # buttons first: they sit just behind the rail's front edge
    for b in s["buttons"]:
        w = 16
        x = (M - w / 2 + 4) if b["side"] == "left" else (M + bodyW + w / 2 - 4)
        slab("btn", w, b["len"], 7, min(depth * 0.5, 44), -depth * 0.28, fx(x), fy(M + b["y"] + b["len"] / 2), bevel=4, bevel_seg=5, material=rail)
    slab("body", bodyW, bodyH, bodyR, depth, 0.0, fx(cx), fy(cy), bevel=rim * 0.92, bevel_seg=14, material=rail)
    slab("glass", bodyW - rim * 2, bodyH - rim * 2, bodyR - rim, 6, 1.5, fx(cx), fy(cy), bevel=min(10.0, rim * 0.7), bevel_seg=8, material=black_glass())
    sc = s["screen"]
    slab("display", sc["w"], sc["h"], sc["r"], 1, 2.2, fx(sc["x"] + sc["w"] / 2), fy(sc["y"] + sc["h"] / 2), material=display_mat())
    # hinge caps of foldables are drawn as vector overlays by the generator


def build_laptop(s):
    M = s["M"]
    lidX, lidW, lidH = s["lidX"], s["lidW"], s["lidH"]
    baseW, baseH = s["baseW"], s["baseH"]
    by = M + lidH
    alum = metal("alum", lift(s["alumColor"]), rough=0.38)
    deck = metal("deck", lift(s["deckColor"]), rough=0.4)
    # hinge well + feet sit behind everything
    slab("hinge", lidW - 80, 14, 3, 30, -30, fx(lidX + lidW / 2), fy(by - 4), material=metal("hinge", "#17171a", 0.5))
    # lid: aluminium shell, black glass with a thin bezel, display
    top_r = s.get("lidR", 64)
    lid_pts = None
    slab("lid", lidW, lidH, {"tl": top_r, "tr": top_r, "br": 22, "bl": 22}, 24, 0.0, fx(lidX + lidW / 2), fy(M + lidH / 2), bevel=7, bevel_seg=10, material=alum)
    ins = 9
    slab("lidglass", lidW - ins * 2, lidH - ins * 2, {"tl": top_r - ins, "tr": top_r - ins, "br": 14, "bl": 14}, 6, 1.5, fx(lidX + lidW / 2), fy(M + lidH / 2), bevel=6, bevel_seg=8, material=black_glass("lidglass"))
    sc = s["screen"]
    slab("display", sc["w"], sc["h"], 18, 1, 2.2, fx(sc["x"] + sc["w"] / 2), fy(sc["y"] + sc["h"] / 2), material=display_mat())
    # base: the front lip of the aluminium deck, with the thumb notch cut in
    base = slab("base", baseW, baseH, {"tl": 14, "tr": 14, "br": 58, "bl": 58}, 60, 4.0, fx(M + baseW / 2), fy(by + baseH / 2), bevel=8, bevel_seg=10, material=deck)
    nw = s.get("thumbW", 580)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=64, radius1=nw / 2, radius2=nw / 2, depth=90)
    me = bpy.data.meshes.new("notch")
    bm.to_mesh(me)
    bm.free()
    c = bpy.data.objects.new("notch", me)
    c.scale = (1, 24 / (nw / 2), 1)
    c.location = (fx(M + baseW / 2), fy(by - 12), 4)
    bpy.context.collection.objects.link(c)
    boolean_cut(base, [c])
    # rubber feet
    for fxp in (M + 150, M + baseW - 270):
        slab("foot", 120, 8, 4, 10, -20, fx(fxp + 60), fy(by + baseH - 6), material=rubber("foot", "#0e0e10"))


def build_monitor(s):
    bx, by, bodyW, bodyH, R = s["bx"], s["by"], s["bodyW"], s["bodyH"], s["R"]
    frame_c = s["frameColor"]
    imac = s["imac"]
    frame_mat = metal("frame", lift(frame_c), 0.42 if imac else 0.26)
    stand_mat = metal("stand", lift(s["standColor"]), 0.36)
    standW, neckH, footH = s["standW"], s["neckH"], s["footH"]
    stX = bx + bodyW / 2 - standW / 2
    # stand: tapered neck + foot
    neck = [(-standW * 0.44, 0), (standW * 0.44, 0), (standW * 0.5, -neckH), (-standW * 0.5, -neckH)]
    slab("neck", 0, 0, 0, 28, -40, fx(bx + bodyW / 2), fy(by + bodyH), pts=neck, bevel=3, bevel_seg=4, material=stand_mat)
    slab("foot", standW + 12, footH, {"tl": 4, "tr": 4, "br": 14, "bl": 14}, 60, -30, fx(bx + bodyW / 2), fy(by + bodyH + neckH + footH / 2 - 2), bevel=5, bevel_seg=6, material=stand_mat)
    slab("frame", bodyW, bodyH, R, 38, 0.0, fx(bx + bodyW / 2), fy(by + bodyH / 2), bevel=14, bevel_seg=12, material=frame_mat)
    if imac:
        cs = s["chinStart"]
        chin_mat = metal("chin", lift(s["chinColor"]), 0.42)
        slab("chin", bodyW, bodyH - cs, {"tl": 0, "tr": 0, "br": R, "bl": R}, 38, 0.6, fx(bx + bodyW / 2), fy(by + cs + (bodyH - cs) / 2), bevel=14, bevel_seg=12, material=chin_mat)
    gb = s["glassBezel"]
    sc = s["screen"]
    bez_mat = metal("bez", "#f4f4f6", 0.42) if imac else black_glass("bez")
    slab("bezel", sc["w"] + gb * 2, sc["h"] + gb * 2, 10, 3, 1.5, fx(sc["x"] + sc["w"] / 2), fy(sc["y"] + sc["h"] / 2), bevel=3, bevel_seg=4, material=bez_mat)
    slab("display", sc["w"], sc["h"], 0.5, 1, 2.4, fx(sc["x"] + sc["w"] / 2), fy(sc["y"] + sc["h"] / 2), material=display_mat())


def build_watch_square(s):
    case_mat = metal("case", lift(s["caseColor"]), rough=s.get("caseRough", 0.3))
    band_mat = rubber("band", s["bandColor"], rough=s.get("bandRough", 0.42))
    bx, by, bodyW, bodyH, bodyR = s["bx"], s["by"], s["bodyW"], s["bodyH"], s["bodyR"]
    ccx, ccy = bx + bodyW / 2, by + bodyH / 2
    depth = bodyW * 0.22
    rim = s["rim"]
    ultra = s.get("ultra", False)
    sw = s["bandW"]
    for flip in (False, True):
        edge_y = by if flip else by + bodyH
        st = strap(f"strap{int(flip)}", sw, s["bandLen"] + 70, 15, 0.22, band_mat, taper=0.10, flip=flip)
        st.location = (fx(ccx), fy(edge_y) + (-60 if flip else 60), -depth * 0.55)
        if not flip and s.get("holes", True):
            cutters = []
            n = max(2, int((s["bandLen"] - 190) / 46))
            for i in range(n):
                bm = bmesh.new()
                bmesh.ops.create_cone(bm, cap_ends=True, segments=24, radius1=9, radius2=9, depth=260)
                me = bpy.data.meshes.new(f"hole{i}")
                bm.to_mesh(me)
                bm.free()
                c = bpy.data.objects.new(f"hole{i}", me)
                c.location = (fx(ccx), fy(edge_y + 130 + i * 46), -depth * 0.55 - 20)
                bpy.context.collection.objects.link(c)
                cutters.append(c)
            boolean_cut(st, cutters)
    cw = s["crownW"]
    crown_r = 26 if ultra else 22
    prof = knurled_profile(0, cw + 8, crown_r, 2.4, 9)
    lathe_x("crown", prof, fx(bx + bodyW - 14), fy(by + bodyH * 0.27 + (30 if ultra else 20)), -depth * 0.28, material=case_mat)
    slab("button", cw * 0.7, 120 if ultra else 96, 8, 12, -depth * 0.2, fx(bx + bodyW + cw * 0.1), fy(by + bodyH * 0.6), bevel=3, bevel_seg=4, material=case_mat)
    if ultra:
        slab("guard", 16, 190, 6, 20, -depth * 0.12, fx(bx + bodyW + 2), fy(by + bodyH * 0.27 + 30), bevel=3, bevel_seg=4, material=case_mat)
        slab("action", 20, 108, 10, 14, -depth * 0.26, fx(bx - 6), fy(by + bodyH * 0.22), bevel=3, bevel_seg=4, material=metal("action", "#ff6a1a", 0.35))
    slab("case", bodyW, bodyH, bodyR, depth, 0.0, fx(ccx), fy(ccy), bevel=rim * 0.9, bevel_seg=14, material=case_mat)
    slab("glass", bodyW - rim * 2, bodyH - rim * 2, bodyR - rim, 5, 1.5, fx(ccx), fy(ccy), bevel=7, bevel_seg=8, material=black_glass())
    sc = s["screen"]
    slab("display", sc["w"], sc["h"], sc["r"], 1, 2.0, fx(sc["x"] + sc["w"] / 2), fy(sc["y"] + sc["h"] / 2), material=display_mat())


def build_watch_round(s):
    case_mat = metal("case", lift(s["caseColor"]), rough=s.get("caseRough", 0.3))
    band_mat = rubber("band", s["bandColor"], rough=s.get("bandRough", 0.42))
    cx, cy, R = s["cx"], s["cy"], s["R"]
    depth = R * 0.34
    sw = s["bandW"]
    for flip in (False, True):
        edge_y = cy - R * 0.55 if flip else cy + R * 0.55
        st = strap(f"strap{int(flip)}", sw, s["bandLen"] + R * 0.5, 14, 0.14, band_mat, taper=0.14, flip=flip)
        st.location = (fx(cx), fy(edge_y) + (-1 if flip else 1) * 40, -depth * 0.55)
    cw = s["crownW"]
    prof = knurled_profile(0, cw + 6, 20, 2.0, 8)
    lathe_x("crown", prof, fx(cx + R - 10), fy(cy), -depth * 0.3, material=case_mat)
    if s.get("buttons", 1) > 1:
        for sgn in (-1, 1):
            slab("btn", 30, 74, 10, 14, -depth * 0.2, fx(cx + R * 0.9), fy(cy + sgn * R * 0.42), bevel=3, bevel_seg=4, material=case_mat)
    disc("case", R, depth, 0.0, fx(cx), fy(cy), bevel=s["rim"] * 0.9, bevel_seg=14, material=case_mat)
    if s.get("ring"):
        ring_mat = metal("ring", s["ring"], 0.38)
        disc("bezel", R - 5, 6, 3.0, fx(cx), fy(cy), bevel=3, bevel_seg=4, material=ring_mat)
        tick = metal("tick", "#c9ccd2", 0.3)
        for i in range(120):
            a = 2 * math.pi * i / 120
            r0 = R - 11
            slab(f"tick{i}", 2.2, 12 if i % 5 else 18, 1, 3, 3.5, fx(cx) + r0 * math.cos(a), fy(cy) + r0 * math.sin(a), material=tick).rotation_euler = (0, 0, a - math.pi / 2)
    disc("glass", s["glassR"], 6, 1.6, fx(cx), fy(cy), bevel=6, bevel_seg=10, material=black_glass())
    disc("display", s["screenR"], 1, 2.4, fx(cx), fy(cy), material=display_mat())


{
    "phone": build_phone,
    "laptop": build_laptop,
    "monitor": build_monitor,
    "square": build_watch_square,
    "round": build_watch_round,
}[kind](spec)

studio_world(scene, spec.get("horizon", 1.6))
Rr = studio_rig(W, H, spec.get('frontFill', 0.0))
ortho_camera(scene, W, H, Rr)
render(scene, out_path)
