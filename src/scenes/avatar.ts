import { gsap, SplitText } from "../core/scroll";
import { $, $$, reduced, coarse } from "../core/env";
import { beats, gateOpen } from "../core/fx";
import { sound } from "../core/audio";

export function mount() {
  const s = $("#avatar");
  const sil = $(".silhouette", s);
  if (reduced) return;

  // First sight: the line arrives word by word under the band.
  const first = $(".avatar__first", s);
  const split = new SplitText($(".subtitle", first), { type: "words" });
  gsap.from(split.words, {
    autoAlpha: 0, y: 14, filter: "blur(6px)", duration: 1.2, stagger: 0.06, ease: "power2.out",
    scrollTrigger: { trigger: first, start: "top 55%" },
  });
  gsap.from($(".frame", first), {
    clipPath: "inset(50% 0 50% 0)", duration: 2, ease: "expo.inOut",
    scrollTrigger: { trigger: first, start: "top 75%" },
  });

  // RĀMA: sky, type and silhouette move as three planes.
  gateOpen(sil);
  beats(sil);
  const letters = $$(".silhouette__word span", sil);
  // GSAP owns this transform from here so the pointer parallax can add to it.
  gsap.set(".silhouette__word", { yPercent: -58, y: 0 });
  gsap
    .timeline({ scrollTrigger: { trigger: sil, start: "top bottom", end: "bottom bottom", scrub: 0.6 } })
    .fromTo(".silhouette__sky", { scale: 1.22, yPercent: 6 }, { scale: 1.02, yPercent: -2, ease: "none", duration: 1 }, 0)
    .fromTo(".silhouette__fg", { scale: 1.1, yPercent: 4 }, { scale: 1, yPercent: 0, ease: "none", duration: 1 }, 0)
    .fromTo(letters, { yPercent: 70, autoAlpha: 0 }, { yPercent: 0, autoAlpha: 1, stagger: 0.06, ease: "power3.out", duration: 0.45 }, 0.32)
    .fromTo(".silhouette__word", { letterSpacing: "0.2em" }, { letterSpacing: "0.02em", ease: "power2.out", duration: 0.6 }, 0.3)
    .fromTo(".silhouette__rays", { opacity: 0.2 }, { opacity: 0.85, duration: 0.6 }, 0.35);

  let chimed = false;
  gsap.timeline({
    scrollTrigger: {
      trigger: sil, start: "top 10%",
      onEnter: () => {
        if (chimed) return;
        chimed = true;
        sound.chime(261.63, 0.14);
      },
    },
  });

  if (!coarse) {
    const sky = $(".silhouette__sky", sil);
    const word = $(".silhouette__word", sil);
    const fg = $(".silhouette__fg", sil);
    const qs = [sky, word, fg].map((el) => ({ x: gsap.quickTo(el, "x", { duration: 1.2, ease: "power3" }), d: el === sky ? -14 : el === word ? 26 : 8 }));
    sil.addEventListener("pointermove", (e) => {
      const nx = e.clientX / innerWidth - 0.5;
      qs.forEach((q) => q.x(nx * q.d));
    });
  }
}
