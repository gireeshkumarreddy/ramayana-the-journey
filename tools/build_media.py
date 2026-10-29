"""Cut the trailer into purposeful clips, scrub sequences and stills.

Usage: python tools/build_media.py <source.mov> [--only id,id]
Outputs into public/media/{clips,posters,seq,stills}.
"""
import json
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "public" / "media"

# S: drop the burned-in subtitles -> 2.40:1.  F: full frame minus the bottom bar.
CROPS = {"S": "crop=1180:492:0:0", "F": "crop=1180:616:0:0"}
SLOW = (
    "mpdecimate=hi=64*3:lo=64:frac=0.5,setpts=N/24/TB,"
    "minterpolate=fps=48:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1,"
    "setpts=2*PTS"
)

# id: (in, out, crop, slow)
CLIPS = {
    "walk": (6.30, 8.15, "F", True),
    "storm": (9.45, 11.85, "S", True),
    "city": (17.52, 18.38, "F", True),
    "palace": (18.45, 21.28, "S", False),
    "women": (21.40, 23.40, "S", False),
    "river": (57.75, 58.55, "F", True),
    "lava": (23.55, 27.90, "S", False),
    "firering": (102.45, 103.65, "F", True),
    "battle": (31.27, 33.78, "S", False),
    "ravana_snow": (36.00, 39.10, "S", False),
    "firedoor": (39.20, 41.10, "S", False),
    "seated": (44.80, 47.65, "S", False),
    "throne": (47.75, 48.58, "S", True),
    "sunthrone": (48.65, 49.50, "S", True),
    "bridge": (49.75, 51.80, "S", True),
    "crown": (53.44, 54.02, "S", True),
    "fire_battle": (54.06, 57.68, "S", False),
    "lanka_crowd": (84.50, 86.85, "F", False),
    "lightning": (135.66, 136.65, "F", False),
    "ravana_palace": (80.85, 82.00, "S", False),
    "ravana_strike": (106.42, 107.95, "F", False),
    "rama_quiver": (58.62, 59.95, "S", False),
    "rama_forest": (63.95, 65.30, "S", False),
    "bow_lift": (69.92, 71.10, "S", False),
    "duststorm": (71.50, 73.90, "S", False),
    "axe": (74.22, 74.94, "S", False),
    "parashurama": (74.98, 76.00, "F", False),
    "rama_crowned": (78.80, 80.80, "S", False),
    "hands": (88.10, 89.10, "F", True),
    "sunset_palace": (89.15, 90.20, "F", True),
    "dancers": (92.82, 93.86, "F", False),
    "sita_diya": (93.92, 95.18, "F", True),
    "sita_temple": (95.25, 96.40, "F", True),
    "pushpaka": (97.62, 98.75, "F", True),
    "sita_gaze": (98.82, 99.72, "F", True),
    "brothers_fire": (103.80, 105.70, "S", False),
    "snow_giants": (108.40, 110.70, "S", False),
    "claws": (112.68, 114.60, "F", False),
    "jatayu_gold": (115.32, 117.02, "F", False),
    "fall": (117.07, 117.72, "F", True),
    "vow": (117.78, 119.00, "S", False),
    "rama_rocks": (135.15, 135.58, "F", True),
    "forest_army": (139.00, 140.45, "F", False),
    "rama_leap": (137.00, 138.60, "F", False),
    "rama_arrow": (141.66, 142.45, "F", False),
    "horde": (142.66, 143.85, "F", False),
    "spear_fight": (125.80, 131.30, "F", False),
    "walk_wide": (8.25, 9.35, "S", True),
}

# Scroll-scrubbed frame sequences: id: (in, out, crop, width)
SEQS = {
    "airavata": (11.95, 16.50, "S", 1024),
    "jatayu": (110.78, 112.62, "S", 1180),
    "vortex": (119.02, 120.90, "S", 1180),
}

# High-quality stills: id: (time, crop)
STILLS = {
    "walk": (7.2, "F"),
    "storm": (10.6, "S"),
    "city": (17.95, "F"),
    "river": (58.15, "F"),
    "palace": (19.6, "S"),
    "women": (22.3, "S"),
    "lava": (26.0, "S"),
    "firering": (103.2, "F"),
    "ravana_snow": (36.6, "S"),
    "crown": (53.75, "S"),
    "throne": (48.1, "S"),
    "sunthrone": (49.1, "S"),
    "bridge": (50.6, "S"),
    "seated": (46.0, "S"),
    "lanka_crowd": (86.2, "F"),
    "lightning": (136.3, "F"),
    "silhouette": (69.05, "F"),
    "bow_lift": (70.6, "S"),
    "parashurama": (75.5, "F"),
    "hands": (88.6, "F"),
    "sita_diya": (94.5, "F"),
    "sita_temple": (95.8, "F"),
    "sita_gaze": (99.2, "F"),
    "pushpaka": (98.2, "F"),
    "brothers_fire": (105.3, "S"),
    "jatayu_gold": (116.0, "F"),
    "rama_arrow": (142.2, "F"),
    "rama_quiver": (59.6, "S"),
    "spear_fight": (128.0, "F"),
    "walk_wide": (8.8, "F"),
    "fire_battle": (56.9, "S"),
    "rama_crowned": (79.6, "S"),
    "horde": (143.3, "F"),
}


def run(args):
    r = subprocess.run(args, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(" ".join(args[-3:]) + "\n" + r.stderr[-800:])


def clip(src, cid, spec):
    t0, t1, crop, slow = spec
    vf = CROPS[crop] + ("," + SLOW if slow else ",fps=30")
    dst = OUT / "clips" / f"{cid}.mp4"
    run([
        "ffmpeg", "-v", "error", "-y", "-ss", f"{t0}", "-t", f"{t1 - t0:.2f}", "-i", src,
        "-an", "-vf", vf, "-c:v", "libx264", "-crf", "23", "-preset", "slow",
        "-profile:v", "high", "-pix_fmt", "yuv420p", "-g", "24", "-movflags", "+faststart",
        str(dst),
    ])
    run([
        "ffmpeg", "-v", "error", "-y", "-i", str(dst), "-frames:v", "1",
        "-c:v", "libwebp", "-quality", "70", str(OUT / "posters" / f"{cid}.webp"),
    ])
    return cid


def seq(src, sid, spec):
    t0, t1, crop, width = spec
    d = OUT / "seq" / sid
    d.mkdir(parents=True, exist_ok=True)
    for f in d.glob("*.webp"):
        f.unlink()
    run([
        "ffmpeg", "-v", "error", "-y", "-ss", f"{t0}", "-t", f"{t1 - t0:.2f}", "-i", src,
        "-vf", f"{CROPS[crop]},mpdecimate=hi=64*3:lo=64:frac=0.5,scale={width}:-2",
        "-fps_mode", "vfr", "-c:v", "libwebp", "-quality", "64", str(d / "%03d.webp"),
    ])
    return sid


def still(src, sid, spec):
    t, crop = spec
    run([
        "ffmpeg", "-v", "error", "-y", "-ss", f"{t}", "-i", src, "-frames:v", "1",
        "-vf", CROPS[crop], "-c:v", "libwebp", "-quality", "84",
        str(OUT / "stills" / f"{sid}.webp"),
    ])
    return sid


def main():
    src = sys.argv[1]
    only = None
    if "--only" in sys.argv:
        only = set(sys.argv[sys.argv.index("--only") + 1].split(","))
    for sub in ("clips", "posters", "seq", "stills"):
        (OUT / sub).mkdir(parents=True, exist_ok=True)

    jobs = []
    with ThreadPoolExecutor(max_workers=6) as ex:
        for k, v in CLIPS.items():
            if not only or k in only:
                jobs.append(ex.submit(clip, src, k, v))
        for k, v in SEQS.items():
            if not only or k in only:
                jobs.append(ex.submit(seq, src, k, v))
        for k, v in STILLS.items():
            if not only or k in only:
                jobs.append(ex.submit(still, src, k, v))
        for j in jobs:
            try:
                print("ok", j.result(), flush=True)
            except Exception as e:  # keep going; report at the end
                print("FAIL", e, flush=True)

    # Manifest of sequence lengths and clip durations for the front end.
    manifest = {"seq": {}, "clips": {}}
    for sid in SEQS:
        manifest["seq"][sid] = len(list((OUT / "seq" / sid).glob("*.webp")))
    for cid in CLIPS:
        p = OUT / "clips" / f"{cid}.mp4"
        if p.exists():
            r = subprocess.run(
                ["ffprobe", "-v", "error", "-show_entries", "format=duration",
                 "-of", "csv=p=0", str(p)], capture_output=True, text=True)
            manifest["clips"][cid] = round(float(r.stdout.strip() or 0), 2)
    (ROOT / "src" / "data").mkdir(parents=True, exist_ok=True)
    (ROOT / "src" / "data" / "media.json").write_text(json.dumps(manifest, indent=2))
    print("manifest written")


if __name__ == "__main__":
    main()
