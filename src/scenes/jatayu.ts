import { gsap } from "../core/scroll";
import { $, range, reduced } from "../core/env";
import { FrameSequence } from "../core/sequence";
import { manage, play, pause } from "../core/clips";
import { beats, gateOpen, progress, whileVisible } from "../core/fx";
import { sound } from "../core/audio";
import media from "../data/media.json";

export function mount() {
  flight($(".jatayu__flight"));
  vow($(".vow"));
}

/* Jaṭāyu: the scrubbed charge, the fight on the chariot, the fall into gold. */
function flight(el: HTMLElement) {
  const seq = new FrameSequence($<HTMLCanvasElement>(".seq", el), "jatayu", media.seq.jatayu);
  const claws = $(".jatayu__claws", el);
  const gold = $(".jatayu__gold", el);
  const cv = $<HTMLVideoElement>("video", claws);
  const gv = $<HTMLVideoElement>("video", gold);
  manage(cv, gv);
  whileVisible(el, () => seq.start(), () => {}, "150% 0px");
  if (reduced) {
    seq.set(0.8);
    return;
  }
  gateOpen(el);
  beats(el);

  let screamed = false;
  progress(el, (p) => {
    seq.set(range(p, 0.02, 0.42));
    const c = range(p, 0.4, 0.48);
    const g = range(p, 0.68, 0.76);
    gsap.set(claws, { autoAlpha: c * (1 - g) });
    gsap.set(gold, { autoAlpha: g });
    c > 0 && g < 1 ? play(cv) : pause(cv);
    g > 0 ? play(gv) : pause(gv);
    if (p > 0.3 && !screamed) {
      screamed = true;
      sound.boom(0.7);
    }
    if (p < 0.1) screamed = false;
  });
  whileVisible(el, () => {}, () => [cv, gv].forEach(pause));
}

/* The vow, then the visitor scrolls into the light. */
function vow(el: HTMLElement) {
  const seq = new FrameSequence($<HTMLCanvasElement>(".vow__vortex", el), "vortex", media.seq.vortex);
  const clip = $<HTMLVideoElement>(".vow__clip video", el);
  manage(clip);
  whileVisible(el, () => {
    seq.start();
    play(clip);
  }, () => pause(clip), "60% 0px");
  if (reduced) return;
  gateOpen(el);

  const lines = el.querySelectorAll(".vow__line");
  gsap
    .timeline({ scrollTrigger: { trigger: el, start: "top top", end: "bottom bottom", scrub: 0.5 } })
    .fromTo(lines[0], { autoAlpha: 0, y: 20, filter: "blur(8px)" }, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.1 }, 0.04)
    .fromTo(lines[1], { autoAlpha: 0, y: 20, filter: "blur(8px)" }, { autoAlpha: 1, y: 0, filter: "blur(0px)", duration: 0.1 }, 0.14)
    .fromTo(".vow__title", { autoAlpha: 0, scale: 1.2, letterSpacing: "0.3em" }, { autoAlpha: 1, scale: 1, letterSpacing: "0.04em", duration: 0.14, ease: "expo.out" }, 0.26)
    .to(".vow__words", { autoAlpha: 0, scale: 0.94, filter: "blur(10px)", duration: 0.1 }, 0.5)
    .to(".vow__vortex", { autoAlpha: 1, duration: 0.08 }, 0.52)
    .to(".vow__clip", { autoAlpha: 0, duration: 0.08 }, 0.58)
    .to(el.querySelector(".whiteout"), { autoAlpha: 1, duration: 0.08, ease: "power2.in" }, 0.9)
    .to({}, { duration: 0.02 }, 0.98);

  let struck = false;
  progress(el, (p) => {
    seq.set(range(p, 0.54, 0.96));
    if (p > 0.27 && !struck) {
      struck = true;
      sound.boom(1);
      sound.chime(130.81, 0.1);
    }
    if (p < 0.2) struck = false;
  });
}
