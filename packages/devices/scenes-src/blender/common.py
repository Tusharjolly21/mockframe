"""
Shared Blender helpers for the procedural device renders.

Conventions: 1 Blender unit == 1 frame px, +X right, +Y up, the orthographic
camera looks down -Z at the front of the device, so z > 0 is toward the viewer.
Every render keeps the registry frame size 1:1, so layers, layouts and saved
drafts that reference a device keep working.
"""
import math

import bmesh
import bpy
from mathutils import Vector


def hex_rgb(h, a=1.0):
    h = h.lstrip("#")
    r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (f(r), f(g), f(b), a)


def setup_scene(W, H, scale, samples):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = True
    scene.cycles.denoiser = "OPENIMAGEDENOISE"
    scene.cycles.max_bounces = 8
    scene.render.film_transparent = True
    scene.view_settings.view_transform = "Standard"
    scene.view_settings.look = "None"
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.render.image_settings.color_depth = "8"
    scene.render.resolution_x = round(W * scale)
    scene.render.resolution_y = round(H * scale)
    scene.render.resolution_percentage = 100
    scene.render.filter_size = 0.9
    return scene


# --------------------------------------------------------------------------
# materials
# --------------------------------------------------------------------------
def _bsdf(m):
    m.use_nodes = True
    return m.node_tree.nodes["Principled BSDF"]


def metal(name, color, rough=0.3, aniso=0.0):
    m = bpy.data.materials.new(name)
    b = _bsdf(m)
    b.inputs["Base Color"].default_value = hex_rgb(color)
    b.inputs["Metallic"].default_value = 1.0
    b.inputs["Roughness"].default_value = rough
    m["is_metal"] = True
    if aniso:
        b.inputs["Anisotropic"].default_value = aniso
    return m


def glass(name, color="#050507", rough=0.04):
    m = bpy.data.materials.new(name)
    b = _bsdf(m)
    b.inputs["Base Color"].default_value = hex_rgb(color)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = 0.9
    b.inputs["Coat Weight"].default_value = 0.6
    b.inputs["Coat Roughness"].default_value = 0.02
    return m


def rubber(name, color, rough=0.42, bump=0.35, scale=900.0):
    """Fluoroelastomer / silicone: slightly sheened, with a fine moulded grain."""
    m = bpy.data.materials.new(name)
    b = _bsdf(m)
    b.inputs["Base Color"].default_value = hex_rgb(color)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Specular IOR Level"].default_value = 0.35
    b.inputs["Sheen Weight"].default_value = 0.25
    b.inputs["Subsurface Weight"].default_value = 0.08
    nt = m.node_tree
    noise = nt.nodes.new("ShaderNodeTexNoise")
    noise.inputs["Scale"].default_value = scale
    noise.inputs["Detail"].default_value = 6
    coord = nt.nodes.new("ShaderNodeTexCoord")
    bmp = nt.nodes.new("ShaderNodeBump")
    bmp.inputs["Strength"].default_value = bump
    bmp.inputs["Distance"].default_value = 0.4
    nt.links.new(coord.outputs["Object"], noise.inputs["Vector"])
    nt.links.new(noise.outputs["Fac"], bmp.inputs["Height"])
    nt.links.new(bmp.outputs["Normal"], b.inputs["Normal"])
    return m


# --------------------------------------------------------------------------
# geometry
# --------------------------------------------------------------------------
def rounded_rect_pts(w, h, r, seg=28):
    """Rounded rectangle outline. `r` is one radius or {tl, tr, br, bl}."""
    if isinstance(r, dict):
        rad = {k: min(v, w / 2 - 0.01, h / 2 - 0.01) for k, v in r.items()}
    else:
        v = min(r, w / 2 - 0.01, h / 2 - 0.01)
        rad = {"tr": v, "tl": v, "bl": v, "br": v}
    pts = []
    corners = [
        ("tr", w / 2 - rad["tr"], h / 2 - rad["tr"], 0),
        ("tl", -w / 2 + rad["tl"], h / 2 - rad["tl"], 90),
        ("bl", -w / 2 + rad["bl"], -h / 2 + rad["bl"], 180),
        ("br", w / 2 - rad["br"], -h / 2 + rad["br"], 270),
    ]
    for key, cx, cy, a0 in corners:
        rr = rad[key]
        n = max(2, seg if rr > 1 else 1)
        for i in range(n + 1):
            a = math.radians(a0 + 90 * i / n)
            pts.append((cx + rr * math.cos(a), cy + rr * math.sin(a)))
    return pts


def _finish(ob, bevel, bevel_seg, material, profile=0.5):
    bpy.context.collection.objects.link(ob) if ob.name not in bpy.context.collection.objects else None
    if bevel > 0:
        m = ob.modifiers.new("bevel", "BEVEL")
        m.width = bevel
        m.segments = bevel_seg
        m.limit_method = "ANGLE"
        m.angle_limit = math.radians(30)
        m.profile = profile
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    if bevel > 0:
        bpy.ops.object.modifier_apply(modifier="bevel")
    # flat faces stay flat; bevels and rounded corners get smooth normals
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(35))
    if material:
        ob.data.materials.append(material)
    return ob


def slab(name, w, h, r, depth, z_front, cx=0.0, cy=0.0, bevel=0.0, bevel_seg=6, material=None, profile=0.5, pts=None):
    """Extruded rounded rectangle (or an explicit outline `pts`) whose front face sits at z_front."""
    bm = bmesh.new()
    verts = [bm.verts.new((x, y, z_front)) for x, y in (pts or rounded_rect_pts(w, h, r))]
    face = bm.faces.new(verts)
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    moved = [v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0, -depth), verts=moved)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.location = (cx, cy, 0)
    bpy.context.collection.objects.link(ob)
    return _finish(ob, bevel, bevel_seg, material, profile)


def disc(name, radius, depth, z_front, cx=0.0, cy=0.0, bevel=0.0, bevel_seg=8, material=None, seg=160):
    return slab(name, radius * 2, radius * 2, radius, depth, z_front, cx, cy, bevel, bevel_seg, material) if seg == 0 else _disc(name, radius, depth, z_front, cx, cy, bevel, bevel_seg, material, seg)


def _disc(name, radius, depth, z_front, cx, cy, bevel, bevel_seg, material, seg):
    bm = bmesh.new()
    verts = [bm.verts.new((radius * math.cos(2 * math.pi * i / seg), radius * math.sin(2 * math.pi * i / seg), z_front)) for i in range(seg)]
    face = bm.faces.new(verts)
    ext = bmesh.ops.extrude_face_region(bm, geom=[face])
    moved = [v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0, -depth), verts=moved)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.location = (cx, cy, 0)
    bpy.context.collection.objects.link(ob)
    return _finish(ob, bevel, bevel_seg, material)


def lathe_x(name, profile, cx, cy, cz, seg=96, material=None):
    """Solid of revolution about the +X axis. profile = [(x, radius), ...] along the axis."""
    bm = bmesh.new()
    rings = []
    for x, rad in profile:
        ring = [bm.verts.new((x, rad * math.cos(2 * math.pi * i / seg), rad * math.sin(2 * math.pi * i / seg))) for i in range(seg)]
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for i in range(seg):
            j = (i + 1) % seg
            bm.faces.new((a[i], a[j], b[j], b[i]))
    bm.faces.new(rings[0][::-1])
    bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    ob.location = (cx, cy, cz)
    bpy.context.collection.objects.link(ob)
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(50))
    if material:
        ob.data.materials.append(material)
    return ob


def knurled_profile(x0, x1, radius, groove, pitch, round_end=0.0):
    """Radius profile along a crown: a run of fine ridges between two plain lips."""
    pts = [(x0, radius * 0.8), (x0 + 1, radius)]
    x = x0 + 4
    while x < x1 - 4:
        pts += [(x, radius), (x + pitch * 0.18, radius - groove), (x + pitch * 0.5, radius - groove), (x + pitch * 0.68, radius)]
        x += pitch
    pts += [(x1 - 1, radius), (x1, radius * (0.8 - round_end))]
    return pts


def strap(name, width, length, thick, bend, material, taper=0.08, flip=False, segs_len=70, segs_w=24, curl=0.10, end_radius=0.16):
    """
    A band that starts at y=0 and runs `length` px along -Y (flip=False) or +Y,
    curling away from the viewer (toward -Z) so the shading rolls off the way a
    real strap does, with a rounded free end and a crowned cross-section.
    The origin is the attached end.
    """
    sgn = -1 if not flip else 1
    rad = width * end_radius
    bm = bmesh.new()
    grid = []
    for i in range(segs_len + 1):
        t = i / segs_len
        half = width * (1 - taper * t) / 2
        dy = (1 - t) * length
        if dy < rad:
            half = half - rad + math.sqrt(max(rad * rad - (rad - dy) ** 2, 0.0))
        row = []
        for j in range(segs_w + 1):
            u = j / segs_w * 2 - 1
            z = -bend * t * t * length - curl * width * 0.5 * u * u
            row.append(bm.verts.new((u * half, sgn * t * length, z)))
        grid.append(row)
    for i in range(segs_len):
        for j in range(segs_w):
            bm.faces.new((grid[i][j], grid[i][j + 1], grid[i + 1][j + 1], grid[i + 1][j]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    bpy.context.collection.objects.link(ob)
    bpy.ops.object.select_all(action="DESELECT")
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    sol = ob.modifiers.new("solid", "SOLIDIFY")
    sol.thickness = thick
    sol.offset = 0
    bpy.ops.object.modifier_apply(modifier="solid")
    bev = ob.modifiers.new("bev", "BEVEL")
    bev.width = thick * 0.38
    bev.segments = 4
    bev.limit_method = "ANGLE"
    bpy.ops.object.modifier_apply(modifier="bev")
    bpy.ops.object.shade_smooth_by_angle(angle=math.radians(40))
    if material:
        ob.data.materials.append(material)
    return ob


def boolean_cut(ob, cutters):
    for i, c in enumerate(cutters):
        m = ob.modifiers.new(f"cut{i}", "BOOLEAN")
        m.operation = "DIFFERENCE"
        m.object = c
        m.solver = "FLOAT"
        bpy.context.view_layer.objects.active = ob
        bpy.ops.object.modifier_apply(modifier=m.name)
        bpy.data.objects.remove(c, do_unlink=True)


# --------------------------------------------------------------------------
# lighting and camera
# --------------------------------------------------------------------------
def studio_world(scene, horizon=1.6):
    world = bpy.data.worlds.new("w")
    scene.world = world
    world.use_nodes = True
    wn, wl = world.node_tree.nodes, world.node_tree.links
    bg = wn["Background"]
    tex = wn.new("ShaderNodeTexCoord")
    sep = wn.new("ShaderNodeSeparateXYZ")
    ab = wn.new("ShaderNodeMath")
    ab.operation = "ABSOLUTE"
    ramp = wn.new("ShaderNodeValToRGB")
    wl.new(tex.outputs["Object"], sep.inputs[0])
    wl.new(sep.outputs[2], ab.inputs[0])
    wl.new(ab.outputs[0], ramp.inputs[0])
    # |z| = 0 is the horizon (what a rim's side facets reflect): bright studio walls;
    # |z| = 1 is straight at the camera (what flat glass reflects): near black.
    e = ramp.color_ramp.elements
    e[0].position = 0.0
    e[0].color = (horizon, horizon, horizon * 1.03, 1)
    e[1].position = 0.85
    e[1].color = (0.02, 0.02, 0.025, 1)
    wl.new(ramp.outputs[0], bg.inputs[0])
    bg.inputs[1].default_value = 1.0


def softbox(name, loc, size, energy, rot=(0, 0, 0)):
    d = bpy.data.lights.new(name, "AREA")
    d.shape = "RECTANGLE"
    d.size, d.size_y = size
    d.energy = energy
    o = bpy.data.objects.new(name, d)
    o.location = loc
    o.rotation_euler = [math.radians(a) for a in rot]
    bpy.context.collection.objects.link(o)
    o.visible_camera = False
    return o


def studio_rig(W, H, front_fill=0.0):
    R = max(W, H)
    softbox("key", (-R * 0.55, R * 0.7, R * 0.9), (R * 0.9, R * 0.9), R * R * 0.0035, (-35, -25, 0))
    softbox("strip", (R * 0.8, 0, R * 0.55), (R * 0.12, R * 1.8), R * R * 0.004, (0, 55, 0))
    softbox("fill", (-R * 0.9, -R * 0.5, R * 0.6), (R * 0.6, R * 0.6), R * R * 0.0016, (20, -50, 0))
    softbox("top", (0, R * 0.95, R * 0.4), (R * 1.4, R * 0.1), R * R * 0.0025, (-70, 0, 0))
    # a wide, soft frontal card: lifts flat metal faces (laptop decks, lids) the way a studio fill does
    if front_fill:
        card = softbox("card", (R * 0.15, R * 0.2, R * 1.4), (R * 2.2, R * 2.2), R * R * front_fill)
        # light-link the card to metal parts only, so glass and displays stay deep black
        col = bpy.data.collections.new("metal_parts")
        bpy.context.scene.collection.children.link(col)
        for ob in bpy.context.scene.objects:
            if ob.type == "MESH" and any(m and m.get("is_metal") for m in ob.data.materials):
                col.objects.link(ob)
        card.light_linking.receiver_collection = col
    return R


def ortho_camera(scene, W, H, R):
    cam = bpy.data.cameras.new("cam")
    cam.type = "ORTHO"
    cam.ortho_scale = max(W, H)
    cam.clip_end = 100000
    co = bpy.data.objects.new("cam", cam)
    co.location = (0, 0, R * 2)
    bpy.context.collection.objects.link(co)
    scene.camera = co


def render(scene, out_path):
    scene.render.filepath = out_path
    bpy.ops.render.render(write_still=True)
    print("wrote", out_path)
