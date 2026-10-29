"""Render the shaded relief behind the Road to Laṅkā map.

Same projection and coastline as src/scenes/road.ts: x = (lon - 68) * 50, y = (30.5 - lat) * 50
on a 1100 x 1250 board. Output: public/media/map/relief.webp (RGBA, edges fade to transparent).
"""
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "media" / "map"
S = 1.5  # supersample of the 1100 x 1250 board
W, H = int(1100 * S), int(1250 * S)


def P(lon, lat):
    return ((lon - 68) * 50 * S, (30.5 - lat) * 50 * S)


COAST = [
    (68.9, 23.2), (69.8, 21.6), (71.0, 20.8), (72.6, 21.2), (72.8, 19.5), (73.0, 18.0), (73.4, 16.5), (73.8, 15.4),
    (74.4, 14.2), (74.8, 12.8), (75.4, 11.6), (76.0, 10.4), (76.5, 9.2), (77.2, 8.3), (77.55, 8.08), (78.1, 8.7),
    (78.9, 9.3), (79.3, 10.2), (79.85, 10.4), (79.85, 11.6), (80.3, 13.1), (80.2, 15.0), (81.2, 16.3), (82.3, 16.7),
    (83.3, 17.7), (84.8, 19.2), (86.0, 19.9), (86.9, 21.0), (87.8, 21.7), (88.6, 21.8), (89.4, 22.1), (90.4, 22.6),
    (92.5, 23.5), (92.5, 32), (66, 32), (66, 23.6),
]
LANKA = [
    (79.9, 9.8), (80.3, 9.55), (80.9, 8.9), (81.3, 8.4), (81.85, 7.4), (81.7, 6.6), (81.0, 6.12), (80.2, 6.0),
    (79.85, 6.9), (79.8, 7.9), (79.85, 8.9),
]


def spline(pts, closed=True, steps=14):
    """Closed Catmull-Rom, matching the Bézier conversion used in the SVG."""
    pts = [P(*p) for p in pts]
    n = len(pts)
    out = []
    for i in range(n if closed else n - 1):
        p0, p1, p2, p3 = (pts[(i + k) % n] for k in (-1, 0, 1, 2))
        for s in range(steps):
            t = s / steps
            t2, t3 = t * t, t * t * t
            out.append(tuple(
                0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2
                       + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)
                for j in range(2)))
    return out


def fbm(seed, octaves=6, base=6):
    rng = np.random.default_rng(seed)
    acc = np.zeros((H, W), np.float32)
    amp, total = 1.0, 0.0
    for o in range(octaves):
        g = base * 2 ** o
        grid = rng.random((g + 1, int(g * W / H) + 1)).astype(np.float32)
        layer = np.asarray(Image.fromarray(grid).resize((W, H), Image.BICUBIC), np.float32)
        acc += layer * amp
        total += amp
        amp *= 0.5
    return acc / total


YY, XX = np.mgrid[0:H, 0:W].astype(np.float32)
WARP_X = (fbm(11, octaves=4, base=4) - 0.5) * 90 * S
WARP_Y = (fbm(12, octaves=4, base=4) - 0.5) * 90 * S


def ridge(a, b, width, height):
    """A broad mountain region along a-b, its centre line wandering so the chain never runs straight."""
    (x1, y1), (x2, y2) = P(*a), P(*b)
    yy, xx = YY + WARP_Y, XX + WARP_X
    dx, dy = x2 - x1, y2 - y1
    t = np.clip(((xx - x1) * dx + (yy - y1) * dy) / (dx * dx + dy * dy), 0, 1)
    d = np.hypot(xx - (x1 + t * dx), yy - (y1 + t * dy))
    return height * np.exp(-((d / (width * S)) ** 2))


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    m = Image.new("L", (W, H), 0)
    d = ImageDraw.Draw(m)
    d.polygon(spline(COAST), fill=255)
    d.polygon(spline(LANKA), fill=255)
    land = np.asarray(m.filter(ImageFilter.GaussianBlur(1.2)), np.float32) / 255

    n1, n2 = fbm(1), fbm(2, octaves=4, base=3)
    # Ridged noise: sharp crests and valleys, the texture of real ranges
    crag = (1 - np.abs(2 * fbm(5, octaves=7, base=7) - 1)) ** 2.2
    region = (
        ridge((73.6, 18.8), (76.6, 9.6), 60, 0.55)    # Western Ghats
        + ridge((74.5, 23.2), (81.5, 23.7), 70, 0.38)  # Vindhya
        + ridge((74.5, 21.6), (80.0, 21.9), 48, 0.26)  # Satpura
        + ridge((78.8, 13.0), (84.0, 18.6), 64, 0.24)  # Eastern Ghats
        + ridge((80.5, 7.4), (80.9, 6.9), 40, 0.42)    # Laṅkā's highlands
        + ridge((76.0, 28.8), (84.0, 29.2), 120, 0.3)  # rising toward the north
    )
    elev = (0.1 * n1 + 0.06 * n2 + 0.08 * crag + region * (0.25 + 0.75 * crag)) * land

    gy, gx = np.gradient(elev * 900)
    lx, ly = -0.7, -0.7  # light from the north-west
    shade = np.clip(0.5 + (gx * lx + gy * ly) * 0.06, 0, 1)

    lowland = np.array([20, 24, 42], np.float32)
    upland = np.array([58, 44, 30], np.float32)
    gold = np.array([216, 180, 106], np.float32)
    e = np.clip(elev / 0.6, 0, 1)[..., None]
    col = lowland * (1 - e) + upland * e
    col = col * (0.55 + 0.9 * shade[..., None])
    col += gold * (np.clip(shade - 0.62, 0, 1)[..., None] * 2.2 * e) * 0.55

    # The sea: dark, a little lighter over the continental shelf
    shelf = np.asarray(m.filter(ImageFilter.GaussianBlur(28 * S)), np.float32) / 255
    sea = np.array([6, 8, 18], np.float32)[None, None, :] + np.array([10, 16, 34], np.float32)[None, None, :] * shelf[..., None]
    sea += (fbm(3, octaves=5, base=10)[..., None] - 0.5) * 8
    rgb = col * land[..., None] + sea * (1 - land[..., None])

    # A thin gilded coastline
    edge = np.asarray(m.filter(ImageFilter.FIND_EDGES).filter(ImageFilter.GaussianBlur(1.6 * S)), np.float32) / 255
    rgb += gold[None, None, :] * np.clip(edge * 2.2, 0, 1)[..., None] * 0.55

    # Fade every edge, the north most of all (no borders are drawn there)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    north = np.clip((yy / H - 0.04) / 0.26, 0, 1)
    sides = np.clip(np.minimum(xx, W - xx) / (W * 0.1), 0, 1)
    south = np.clip((H - yy) / (H * 0.08), 0, 1)
    alpha = (north ** 1.4) * sides * south

    rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)
    Image.fromarray(rgba, "RGBA").save(OUT / "relief.webp", "WEBP", quality=82, method=6)
    print("relief", (OUT / "relief.webp").stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
