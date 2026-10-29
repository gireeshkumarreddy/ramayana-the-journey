# Rāmāyaṇa — The Journey of Rama

A cinematic, scroll-driven web experience through the Ramayana, from Ayodhyā to Laṅkā, in twelve chapters.

It's built with Vite, TypeScript, GSAP + ScrollTrigger and Lenis. WebGL draws Rāvaṇa's fire dissolve and the rendered sea of the Sundara Kāṇḍa, Canvas 2D paints the journey's gold-dust trail and the embers, and the sound is synthesised in the browser with Web Audio.

The creative direction, edit decision list and chapter structure are in [CREATIVE.md](CREATIVE.md).

## This repository is code only

No footage, frames, stills or renders are included. The site was built around trailer footage that isn't redistributable, so `public/media/` is ignored. Without it the pages load and animate, but every frame that holds footage stays empty.

To regenerate the media from your own licensed copy of the source video:

```bash
pip install numpy pillow opencv-python
python tools/build_media.py "<path to source video>"   # clips, posters, scroll sequences, stills
python tools/cutouts.py "<path to source video>"       # silhouette and portrait cut-outs
python tools/map_relief.py                            # shaded relief behind the map
```

The cut points in `tools/build_media.py` match one specific source file. They need re-timing for any other.

## Run

```bash
npm install
npm run dev        # http://127.0.0.1:5178
npm run build      # type-check and production build into dist/
```

## Recording

With the dev server running:

```bash
node tools/record.mjs              # full walkthrough, ramayana-walkthrough.mp4
node tools/reel.mjs                # 75-second reel, ramayana-reel-75s.mp4
RETAKE=war node tools/reel.mjs     # re-film one shot and re-cut
```

Both use the installed Chrome through `playwright-core`.

## Note

This is a fan-made concept and is not affiliated with or endorsed by the makers of any film. The narrative follows Vālmīki's Rāmāyaṇa, and where traditions differ, the text says so.
