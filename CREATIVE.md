# RĀMĀYAṆA — The Journey of Rama
### Creative breakdown, edit plan and technical direction

---

## 1. The idea

*Rāma + ayana* — "the journey of Rama". The word itself is the concept: **the website is the ayana**.
Scrolling is walking. A single thin gold line, the *path*, is drawn down the page as the visitor
travels from Ayodhya to Lanka. Every chapter is a place on that road.

The footage supplied is the trailer for *Part One*. It contains Rama, Sita, Lakshmana, Ravana,
Jatayu, Parashurama, Indra's Airāvata and the city of Ayodhya. It does **not** show Hanuman or Bharata.
Hanuman is carried by a rendered scene (the leap as light across the sea) and Bharata by the dusk palace
footage, both labelled honestly, rather than by mismatched imagery or line drawings.

**Ravana has a special place.** He isn't a cameo villain. He gets the longest act (*Daśānana*),
his own transition language (fire-dissolve shader used nowhere else), his own colour (sindoor/ember),
his own sound (the drone drops and a drum answers each scroll beat), and he recurs throughout:
foreshadowed as an ember in the age of gods, the final card of the cast, the vermilion ink that
floods the manuscript at the abduction, one half of the duel, and the effigy-and-reverence duality in the legacy.
He's portrayed as scholar, devotee of Shiva, musician, king and conqueror whose pride undoes him.

Narrative tradition: the chapter outline follows **Vālmīki's Rāmāyaṇa**. Where the film or later
tellings differ (e.g. the "Lakshmana rekha", Ravana's ten heads as the Vedas and Shastras), the copy says so.
Narration lines are written fresh for the site; the trailer's subtitles aren't transcribed.

---

## 2. What the references taught

| Reference | Strongest idea | How it's used here |
|---|---|---|
| Roman Empire (statue over *EMPIRE*) | A subject cut out and set **in front of** giant hairline type | Rama's sunset silhouette cut out of the frame, standing in front of a monumental **RĀMA** with the sky on a separate parallax plate |
| Kingdom Beyond the Mist | Staggered, indented serif headlines; images scattered asymmetrically at different depths | Ayodhya chapter: a drifting collage of the city, with staggered narration lines |
| Evil Angel (both) | A rugged path that carries you through content cut **into** it | The *Journey* chapter is a passage through worlds: a textured trail of gold dust leads to a torn window into the next world, and scrolling flies you through it |
| Urban Culture (stacked cards) | A vertical 3D drum: the centre card flat and sharp, neighbours tilted back and blurred | *Dramatis Personae*: the cast on a scroll-driven 3D drum; open any card for the full character |
| All | Restraint: black field, one metal, a lot of air | One palette, one metal (gold), one accent (sindoor), reserved for Ravana and fire |

---

## 3. Visual direction

- **Palette:** kajal black `#07060a` · ash `#16131a` · gold leaf `#d8b46a` · pale gold `#efdcae` ·
  sindoor `#c2321f` (Ravana, fire) · Himalayan silver-blue `#a9bccb` (gods) · palm-leaf `#e9dcc0` (manuscript chapter only).
- **Type:** *Cormorant* (display and narration, light weights, IAST diacritics) ·
  *Tiro Devanagari Sanskrit* (Sanskrit verses) · *Jost* (micro labels, widely tracked).
- **Frame:** All footage is shown in **2.40:1 CinemaScope**. This is art direction, and it also
  removes the burned-in subtitles. The letterbox bars are live: they open and close as transitions.
- **Texture:** fine film grain, soft vignette, embers. No neon, no glass, no gradients without a light source.

---

## 4. Edit decision list (source: `ScreenRecording_10-28-2026 19-48-46_1.mov`, 146 s, 1180×626, ~24 fps in 60 fps container)

Crop **S** = 1180×492 (rows 0–492, removes subtitles, 2.40:1). Crop **F** = 1180×616 (removes bottom bar).
Slow motion = de-duplicate the frames, then motion-interpolate to 0.5× (only where the motion survives it).

| Clip | Source in–out | Crop | Speed | Where | Why |
|---|---|---|---|---|---|
| walk | 6.30–8.15 | F | 0.5× | Cold open | Bare feet and a staff in the sand. The first step of the journey |
| storm | 9.45–11.85 | S | 0.5× | Title | A lone figure on a dark plain: negative space for the title |
| airavata (seq) | 11.95–16.50 | S | scrub | Age of Gods | Crane shot through the valley as Airāvata approaches; scroll is the camera |
| city / palace / women / river | 17.5–23.4, 57.7–58.6 | F/S | 0.5× / 1× | Ayodhya | Golden-hour aerials; a city in balance |
| lava | 23.55–27.90 | S | 1× | The Boon | Darkness and magma under the narration of Brahma's boon |
| firering | 102.45–103.65 | F | 0.5× | The Boon | A figure inside a ring of fire beneath a dark idol: the penance |
| battle | 31.27–33.78 | S | 1× | Conquest | Ravana leaps at Airāvata. Real-time, because the energy is the point |
| ravana_snow | 36.00–39.10 | S | 1× | Portrait, cast card | Three seconds of stillness. The calm before (starts after the shot's fade-in so it loops cleanly) |
| firedoor / seated / throne / sunthrone / bridge / crown | 39.2–54.0 | S | mixed | **The chant** | One cut per scroll beat: *RĀVAṆA · RĀVAṆA · RĀVAṆA* |
| fire_battle / lanka_crowd | 54.06–57.68, 84.5–86.85 | S/F | 1× | Lanka | Fire and the golden city's roar |
| lightning | 135.66–136.65 | F | 1× | Conquest, duel | Ravana takes the thunderbolt |
| rama_quiver / forest | 58.62–59.95, 63.95–65.30 | S | 1× | Avatar | First sight of Rama |
| silhouette (still) | 69.0 | inpaint | — | **RĀMA** | Cut-out foreground, sky plate and type in between |
| bow_lift / axe / parashurama | 69.92–71.40, 74.22–76.00 | S/F | 1× | Mithila, Parashurama | The bow of Shiva; the challenge on the road |
| hands / sita_diya / sita_temple / sita_gaze | 88.1–99.7 | F | 0.5× | Sita | Lamplight and petals deserve slow time |
| pushpaka | 97.62–98.75 | F | 0.5× | Abduction | The flying chariot above the clouds |
| brothers_fire | 103.80–105.70 | S | 1× | Lakshmana, exile | Two brothers by a fire in the forest |
| jatayu (seq) | 110.78–112.62 | S | scrub | Jatayu | Birds burst, the king of vultures screams into the lens |
| claws / jatayu_gold / fall | 112.68–117.72 | F | 1× | Jatayu | The fight in the sky and the fall |
| vow | 117.78–119.00 | S | 1× | The Vow | Rama draws, the arrow ignites |
| vortex (seq) | 119.02–120.90 | S | scrub | Into Sundara | The visitor scrolls *into* the light |
| forest_army / rama_arrow / horde | 137.0–143.85 (arrow from 141.66, after the credit card) | F | 1× | The War | Rama alone against a host; the glowing arrow |
| spear_fight | 125.80–131.30 | F | 1× | The War | Ravana in battle |
| walk_wide | 8.25–9.35 | S | 0.5× | Legacy | The walker vanishes into dust. A bookend to the cold open |

Not used: studio logos, title cards, release-date and credit cards.

---

## 5. Chapters

0. **Gate.** Embers, *रामायण*, the etymology. Enter *with sound* or *in silence*. This is also the audio gesture
1. **Awakening.** Cold open on the walking feet (slow), match-cut to the storm plain, then the title rises
2. **The Age of Gods.** The scroll-scrubbed Airāvata flight. Silver-blue. One ember in the corner: foreshadowing
3. **Ayodhya.** A drifting collage on the Sarayu with staggered narration
4. **Daśānana, Ravana's act.** The boon (nine heads into the fire), conquest, the chant montage, the ten faces, Lanka
5. **The Avatar.** First sight of Rama, then the silhouette standing in front of **RĀMA**, and the verse *rāmo vigrahavān dharmaḥ*
6. **Dramatis Personae.** The 3D cast drum. Ravana is the last card, and the page bleeds red when he's centred
7. **The Journey.** A passage through eight worlds. It begins on a palm leaf that burns open, then moves through Mithila, the road home, Ayodhya, Chitrakuta, Panchavati, the deer and the sky. Each world fills the screen; a dry-brush trail of gold dust leads to a torn window into the next, and scrolling carries you through it
8. **Jatayu and the Vow.** Scrubbed flight, the fall, Rama's vow, scroll into the vortex
9. **Sundara.** Hanuman's leap, rendered in a shader: a moonlit sea that mirrors the sky, Mount Mahendra on the shore, Lanka's lamps on the horizon, Hanuman as a saffron comet. Then Lanka burns, and the fire is reflected on the water. Scroll is the leap
10. **The Road to Lanka.** A tilted shaded-relief map (rendered offline from the same projection). A gilt, rough-edged route draws itself, the Setu crosses the sea, markers stand up out of the land, and every place opens its story
11. **The War.** The diagonal duel seam, then one golden arrow, a white flash and silence
12. **Legacy.** *Mā niṣāda*, grief become verse; the many Ramayanas; Diwali's lamps and Dussehra's effigies; the walker into dust; begin again

---

## 6. Technical approach

- **Vite + TypeScript**, no framework. Each chapter is a module exporting `mount(root) → cleanup`
- **GSAP + ScrollTrigger + SplitText** for choreography, **Lenis** for momentum scrolling, synced to the ticker
- **Video:** H.264 MP4 with no audio and faststart, lazy-attached by IntersectionObserver, played only while on screen. A WebP poster for each
- **Scrub sequences:** WebP frames drawn to a canvas with object-fit cover and a per-scene focal point. Frames load progressively, nearest first
- **WebGL:** a single small fire-dissolve shader for Ravana's transitions. Falls back to a crossfade
- **CSS 3D:** cast drum and map tilt. **SVG:** map route and labels. **Canvas 2D:** embers, the journey's brush trail. **WebGL:** the burn dissolve and the Sundara sea
- **Sound:** synthesized in the browser with Web Audio (tanpura drone, wind, drum hits on the chant beats). Off until the visitor chooses it; one toggle
- **Reduced motion:** no scrub or pinning; clips become stills and the story reads top to bottom
- **Mobile:** footage recomposed as cinematic bands with type around them, full-bleed only where the subject is centred, touch-first drum and map, effects thinned

## 7. Running it

```
npm install
npm run dev        # http://127.0.0.1:5178
npm run build      # type-check + production build into dist/
python tools/build_media.py "<path to trailer .mov>"   # re-cut clips, sequences, stills
python tools/cutouts.py "<path to trailer .mov>"       # Rama silhouette plates + Ravana cut-out
python tools/map_relief.py                            # shaded relief behind the map
```

## 8. Rights note

The trailer footage is the user's supplied reference and is used here for a private concept build.
Publishing this site publicly would need rights to the footage. The site carries a fan-concept disclaimer
and uses none of the studio's logos or title treatment as its own identity.
