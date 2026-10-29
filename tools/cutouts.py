"""Layered plates for the depth compositions.

- rama_sky / rama_fg : Rama's sunset silhouette split into a sky plate and a cut-out foreground
- ravana_cut         : Ravana (crowned) cut out for the ten-faces echo
"""
import subprocess
import sys
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
STILLS = ROOT / "public" / "media" / "stills"
DBG = ROOT / "_analysis" / "cut"
DBG.mkdir(parents=True, exist_ok=True)


def grab(src, t, crop):
    out = DBG / f"src_{t}.png"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", str(t), "-i", src, "-frames:v", "1",
                    "-vf", crop, str(out)], check=True)
    return cv2.imread(str(out))


def save_rgba(bgr, alpha, name, quality=88):
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    im = Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), "RGBA")
    im.save(STILLS / f"{name}.webp", "WEBP", quality=quality, method=6)
    im.save(DBG / f"{name}.png")


def save_rgb(bgr, name, quality=86):
    Image.fromarray(cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)).save(
        STILLS / f"{name}.webp", "WEBP", quality=quality, method=6)


def rama(src):
    img = grab(src, 69.05, "crop=1180:616:0:0")
    h, w = img.shape[:2]
    hsv = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)
    v = hsv[..., 2]

    # Subtitle text: bright, unsaturated pixels in the lower band.
    sub = np.zeros((h, w), np.uint8)
    band = (slice(520, 600), slice(380, 820))
    sub[band] = ((v[band] > 150) & (hsv[..., 1][band] < 90)).astype(np.uint8) * 255
    sub = cv2.dilate(sub, np.ones((7, 7), np.uint8))
    img = cv2.inpaint(img, sub, 5, cv2.INPAINT_TELEA)
    cv2.imwrite(str(DBG / "rama_nosub.png"), img)

    # Silhouette: very dark pixels connected to the bottom edge (figure + cliff).
    v = cv2.cvtColor(img, cv2.COLOR_BGR2HSV)[..., 2]
    # The figure is backlit dark red against the sun; the cliff is near-black.
    # Different thresholds per region keep the dark clouds out.
    yy, xx = np.mgrid[0:h, 0:w]
    fig = (xx > 430) & (xx < 725) & (yy > 170) & (yy < 480) & (v < 125)
    cliff = (yy >= 440) & (xx > 180) & (xx < 940) & (v < 78)
    dark = (fig | cliff).astype(np.uint8)
    n, lab, stats, _ = cv2.connectedComponentsWithStats(dark, 8)
    keep = np.zeros_like(dark)
    for i in range(1, n):
        x, y, bw, bh, area = stats[i]
        if y + bh >= h - 3 and area > 4000:
            keep[lab == i] = 1
    keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))
    # Soft edge: blend a hard core with a feathered rim keyed on luminance.
    soft = np.clip((150 - v.astype(np.float32)) / 40.0, 0, 1)
    rim = cv2.dilate(keep, np.ones((5, 5), np.uint8)).astype(np.float32)
    alpha = np.maximum(keep.astype(np.float32), soft * rim)
    alpha = cv2.GaussianBlur(alpha, (3, 3), 0)
    save_rgba(img, (alpha * 255).astype(np.uint8), "rama_fg")

    # Sky plate: paint out the silhouette so the parallax never reveals a hole.
    hole = cv2.dilate((alpha > 0.05).astype(np.uint8) * 255, np.ones((15, 15), np.uint8))
    small = cv2.resize(img, (w // 2, h // 2))
    small_hole = cv2.resize(hole, (w // 2, h // 2))
    sky = cv2.inpaint(small, small_hole, 9, cv2.INPAINT_TELEA)
    sky = cv2.resize(sky, (w, h), interpolation=cv2.INTER_CUBIC)
    sky = np.where(hole[..., None] > 0, cv2.GaussianBlur(sky, (21, 21), 0), img)
    save_rgb(sky, "rama_sky")


def ravana(src):
    img = grab(src, 53.75, "crop=1180:492:0:0")
    h, w = img.shape[:2]
    mask = np.full((h, w), cv2.GC_BGD, np.uint8)
    mask[:, 440:990] = cv2.GC_PR_BGD
    # Probable figure: crown, head, beard, shoulders.
    pts = np.array([[505, 0], [735, 0], [740, 180], [800, 300], [960, 380], [960, h],
                    [470, h], [480, 380], [545, 250], [520, 120]], np.int32)
    cv2.fillPoly(mask, [pts], cv2.GC_PR_FGD)
    # Certain figure: face, beard, crown core, chest plate.
    cv2.fillPoly(mask, [np.array([[560, 30], [700, 30], [690, 200], [700, 300], [760, 420],
                                  [760, h], [560, h], [560, 330], [575, 220]], np.int32)],
                 cv2.GC_FGD)
    bgd = np.zeros((1, 65), np.float64)
    fgd = np.zeros((1, 65), np.float64)
    cv2.grabCut(img, mask, None, bgd, fgd, 8, cv2.GC_INIT_WITH_MASK)
    fg = np.where((mask == cv2.GC_FGD) | (mask == cv2.GC_PR_FGD), 1, 0).astype(np.uint8)
    # Largest component only, holes filled, edge feathered.
    n, lab, stats, _ = cv2.connectedComponentsWithStats(fg, 8)
    big = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
    fg = (lab == big).astype(np.uint8)
    fg = cv2.morphologyEx(fg, cv2.MORPH_CLOSE, np.ones((9, 9), np.uint8))
    alpha = cv2.GaussianBlur(fg.astype(np.float32), (7, 7), 0)
    # Fade the bottom edge so the cut never ends on a hard line.
    ramp = np.clip((h - np.arange(h)) / 90.0, 0, 1)[:, None]
    alpha = alpha * ramp
    save_rgba(img, (alpha * 255).astype(np.uint8), "ravana_cut")
    dbg = img.copy()
    dbg[alpha < 0.5] = (dbg[alpha < 0.5] * 0.25).astype(np.uint8)
    cv2.imwrite(str(DBG / "ravana_check.jpg"), dbg)


if __name__ == "__main__":
    rama(sys.argv[1])
    ravana(sys.argv[1])
    print("done")
