"""
Procedural wallpapers for the device previews and the empty-screen placeholder.

Original artwork generated from noise and light, in the spirit of the abstract
system wallpapers on modern phones and laptops (soft colour fields, silky folds,
dark aurora glows). No third-party images are used.

Run:  python3 make_wallpapers.py <out_dir> [--w 1290 --h 2796]
Writes <name><suffix>.jpg per wallpaper at W x H (cropped with object-fit: cover everywhere it is used).
"""
import os
import sys

import numpy as np
from PIL import Image


def hexrgb(h):
    h = h.lstrip("#")
    return np.array([int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)])


def ramp(t, stops):
    """Piecewise-linear colour ramp; stops = [(pos, '#hex'), ...]; t in [0, 1]."""
    pos = np.array([p for p, _ in stops])
    cols = np.stack([hexrgb(c) for _, c in stops])
    out = np.empty(t.shape + (3,))
    for k in range(3):
        out[..., k] = np.interp(t, pos, cols[:, k])
    return out


def warp_field(shape, seed, strength=1.0):
    """Smooth analytic domain warp (a few low-frequency sines), returns dx, dy in unit space."""
    h, w = shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = xx / w, yy / h
    rng = np.random.default_rng(seed)
    dx = np.zeros_like(u)
    dy = np.zeros_like(u)
    for i in range(4):
        k = rng.uniform(1.0, 3.2)
        a, b = rng.uniform(-1, 1, 2)
        ph = rng.uniform(0, 6.28, 2)
        dx += np.sin((u * a + v * b) * k * np.pi + ph[0]) / (i + 1.5)
        dy += np.sin((u * b - v * a) * k * np.pi + ph[1]) / (i + 1.5)
    return dx * strength, dy * strength


def fbm(shape, base, seed, octaves=4, gain=0.5):
    """Smooth 0..1 field built from sines (no grid artefacts)."""
    dx, dy = warp_field(shape, seed, 1.0)
    f = (dx + dy) * 0.5
    f = (f - f.min()) / (f.max() - f.min() + 1e-6)
    return f.astype(np.float32)


def grain(img, amount, seed):
    rng = np.random.default_rng(seed)
    n = rng.normal(0, amount, img.shape[:2])[..., None]
    return np.clip(img + n, 0, 1)


def vignette(img, strength):
    h, w = img.shape[:2]
    yy, xx = np.mgrid[0:h, 0:w]
    d = np.sqrt(((xx - w / 2) / (w / 2)) ** 2 + ((yy - h / 2) / (h / 2)) ** 2)
    return np.clip(img * (1 - strength * np.clip(d - 0.35, 0, 1.2)[..., None]), 0, 1)


def blobs(shape, centers, base, seed):
    """Sum of soft radial colour blobs over a base colour: [(cx, cy, radius, '#hex', strength)]."""
    h, w = shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    xx /= w
    yy /= h
    wx, wy = warp_field(shape, seed, 0.16)
    out = np.ones((h, w, 3), np.float32) * hexrgb(base)
    for cx, cy, r, col, s in centers:
        d = np.sqrt((xx - cx + wx) ** 2 + ((yy - cy + wy) * (h / w)) ** 2 + 1e-6)
        m = np.exp(-(d / r) ** 2 * 2.2)[..., None] * s
        out = out * (1 - m) + hexrgb(col) * m
    return out


def silk(shape, seed, stops, light=1.0, freq=2.2, folds=3.0):
    """Flowing satin folds: sum of warped sines as a height field, lit from the upper left."""
    h, w = shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = xx / w, yy / h * (h / w) * 0.55
    wx, wy = warp_field(shape, seed, 0.55)
    ph = (u * 0.7 + v * 1.0 + wx * 0.8 + wy * 0.35) * folds * np.pi
    height = (np.sin(ph) * 0.62 + np.sin(ph * 0.5 + wy * 3.0) * 0.38) * 0.5 + 0.5
    gy, gx = np.gradient(height)
    sc = 0.9 * w / folds / np.pi * 0.35
    nx, ny = -gx * sc, -gy * sc
    ln = np.sqrt(nx ** 2 + ny ** 2 + 1.0)
    nx, ny, nz = nx / ln, ny / ln, 1.0 / ln
    L = np.array([-0.5, -0.6, 0.62])
    L /= np.linalg.norm(L)
    diff = np.clip(nx * L[0] + ny * L[1] + nz * L[2], 0, 1)
    H = np.array([-0.2, -0.3, 0.93])
    spec = np.clip(nx * H[0] + ny * H[1] + nz * H[2], 0, 1) ** 40
    t = np.clip(diff ** 1.3 * light + (height - 0.5) * 0.25, 0, 1)
    col = ramp(t, stops)
    col = col + spec[..., None] * 0.16
    return np.clip(col, 0, 1)


def aurora(shape, seed, hues, bg):
    h, w = shape
    yy, xx = np.mgrid[0:h, 0:w].astype(np.float32)
    u, v = xx / w, yy / h
    out = np.ones((h, w, 3), np.float32) * hexrgb(bg)
    for i, col in enumerate(hues):
        wob = fbm(shape, 0, seed + i * 13) - 0.5
        cy = 0.28 + i * 0.22 + wob * 0.35
        band = np.exp(-(((v - cy) / (0.16 + 0.04 * i)) ** 2)) * (0.55 + 0.45 * fbm(shape, 0, seed + i * 5))
        out = out + band[..., None] * hexrgb(col) * 0.85
    return np.clip(out, 0, 1)


def to_u8(a):
    return Image.fromarray((np.clip(a, 0, 1) * 255 + 0.5).astype(np.uint8))


WALLPAPERS = {
    # name: builder(shape) -> float image
    "bloom": lambda s: vignette(grain(blobs(s, [(0.2, 0.18, 0.55, "#ff5fa2", 0.95), (0.85, 0.3, 0.5, "#7a5cff", 0.9), (0.3, 0.78, 0.6, "#ffb347", 0.85), (0.9, 0.92, 0.5, "#36c6ff", 0.8)], "#2a1b6e", 3), 0.012, 1), 0.18),
    "aurora": lambda s: vignette(grain(aurora(s, 5, ["#27e6a6", "#3b82f6", "#a855f7"], "#04060f"), 0.012, 2), 0.22),
    "dune": lambda s: grain(silk(s, 11, [(0, "#2a1208"), (0.35, "#9a4a1c"), (0.7, "#f0a45a"), (1, "#ffe3b8")], 1.0, folds=2.4), 0.01, 3),
    "satin": lambda s: grain(silk(s, 21, [(0, "#0a1230"), (0.4, "#2a46c8"), (0.75, "#7fb2ff"), (1, "#eaf3ff")], 1.0, folds=3.2), 0.01, 4),
    "orchid": lambda s: grain(silk(s, 31, [(0, "#1c0b2e"), (0.4, "#7a2fc4"), (0.75, "#f06bd0"), (1, "#ffd9f3")], 1.0, folds=2.8), 0.01, 5),
    "meadow": lambda s: vignette(grain(blobs(s, [(0.25, 0.2, 0.5, "#b8f27a", 0.9), (0.8, 0.45, 0.5, "#4cd1a4", 0.85), (0.2, 0.85, 0.55, "#f7e26b", 0.8)], "#1c6b5a", 8), 0.012, 6), 0.12),
    "graphite": lambda s: grain(silk(s, 41, [(0, "#050506"), (0.45, "#202228"), (0.8, "#5a5f6b"), (1, "#c9ced9")], 0.9, folds=2.6), 0.008, 7),
    "sunset": lambda s: vignette(grain(blobs(s, [(0.5, 0.95, 0.7, "#ff7a45", 1.0), (0.2, 0.55, 0.5, "#ff3d81", 0.85), (0.85, 0.35, 0.55, "#6a3df0", 0.9)], "#1a0f4a", 12), 0.012, 8), 0.15),
    "ocean": lambda s: grain(silk(s, 51, [(0, "#02121f"), (0.4, "#0a6f8a"), (0.75, "#4fd1c5"), (1, "#e3fffa")], 1.0, folds=3.6), 0.01, 9),
}


def main():
    out = sys.argv[1]
    w = int(sys.argv[sys.argv.index("--w") + 1]) if "--w" in sys.argv else 1290
    h = int(sys.argv[sys.argv.index("--h") + 1]) if "--h" in sys.argv else 2796
    only = sys.argv[sys.argv.index("--only") + 1].split(",") if "--only" in sys.argv else None
    suffix = sys.argv[sys.argv.index("--suffix") + 1] if "--suffix" in sys.argv else ""
    os.makedirs(out, exist_ok=True)
    for name, fn in WALLPAPERS.items():
        if only and name not in only:
            continue
        img = to_u8(fn((h, w)))
        img.save(os.path.join(out, f"{name}{suffix}.jpg"), quality=90, optimize=True)
        print("wrote", name)


if __name__ == "__main__":
    main()
