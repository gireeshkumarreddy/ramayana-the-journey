import { gsap } from "../core/scroll";
import { $, $$, range, reduced } from "../core/env";
import { manage, play, pause } from "../core/clips";
import { beats, gateOpen, progress, whileVisible } from "../core/fx";
import { sound, type Mood } from "../core/audio";

/**
 * The duel. Two frames share the screen across a seam that sways with the battle,
 * then one golden line crosses it, the screen goes white, and there is silence.
 */
export function mount() {
  const s = $("#war");
  const duel = $(".duel", s);
  const rama = $$<HTMLVideoElement>(".duel__side--rama video", s);
  const ravana = $$<HTMLVideoElement>(".duel__side--ravana video", s);
  manage(...rama, ...ravana);
  rama[0].classList.add("is-active");
  ravana[0].classList.add("is-active");
  if (reduced) return;

  gateOpen(s);
  beats(s);

  let visible = false;
  let phase = -1;
  const setPhase = (k: number) => {
    if (k === phase) return;
    phase = k;
    [rama, ravana].forEach((side) =>
      side.forEach((v, i) => {
        const on = i === Math.min(k, side.length - 1);
        v.classList.toggle("is-active", on);
        visible && on ? play(v) : pause(v);
      }),
    );
  };

  whileVisible(s, () => {
    visible = true;
    const k = Math.max(phase, 0);
    phase = -1;
    setPhase(k);
  }, () => {
    visible = false;
    [...rama, ...ravana].forEach(pause);
  });

  // The seam: it surges toward whoever is winning, then closes on the arrow.
  const sway = gsap
    .timeline({ paused: true })
    .fromTo(duel, { "--seam": "50%", "--tilt": "9%" }, { "--seam": "36%", "--tilt": "14%", duration: 1, ease: "sine.inOut" })
    .to(duel, { "--seam": "62%", "--tilt": "4%", duration: 1, ease: "sine.inOut" })
    .to(duel, { "--seam": "44%", "--tilt": "12%", duration: 1, ease: "sine.inOut" })
    .to(duel, { "--seam": "50%", "--tilt": "0%", duration: 1, ease: "sine.inOut" });

  const arrow = $(".arrow i", s);
  const white = $(".whiteout", s);
  const fell = $(".war__fell", s);
  const coda = $(".war__coda", s);
  let loosed = false;
  let struck = false;
  let lastMood: Mood | null = null;

  progress(s, (p) => {
    sway.progress(range(p, 0.04, 0.56));
    setPhase(p < 0.3 ? 0 : 1);
    const a = range(p, 0.6, 0.7);
    const w = range(p, 0.7, 0.73) - range(p, 0.75, 0.84);
    gsap.set(arrow, { scaleX: a });
    gsap.set(white, { autoAlpha: w });
    // Darken with an overlay rather than a filter: a filter re-renders both videos every frame.
    gsap.set(duel, { autoAlpha: 1 - range(p, 0.72, 0.74), "--dark": a * 0.55 });
    gsap.set(fell, { autoAlpha: range(p, 0.84, 0.88), y: 16 * (1 - range(p, 0.84, 0.88)) });
    gsap.set(coda, { autoAlpha: range(p, 0.9, 0.95) });
    $(".arrow", s).style.opacity = p > 0.74 ? "0" : "1";

    if (p > 0.6 && !loosed) {
      loosed = true;
      sound.whoosh(0.9);
    }
    if (p > 0.71 && !struck) {
      struck = true;
      sound.boom(1.2);
    }
    if (p < 0.5) loosed = struck = false;
    // After the fall, the drone almost disappears.
    const mood: Mood = p > 0.74 ? "hush" : "war";
    if (mood !== lastMood) {
      lastMood = mood;
      sound.setMood(mood);
    }
  });
}
