import { gsap, ScrollTrigger } from "./scroll";
import { $, $$, reduced } from "./env";

/** Narration beats rise out of blur as they reach centre, and dissolve as they leave. */
export function beats(scope: HTMLElement) {
  if (reduced) return;
  $$(".beat", scope).forEach((beat) => {
    const items = Array.from(beat.children) as HTMLElement[];
    if (!items.length) return;
    // Timed against the words themselves, so only one line ever holds the screen:
    // it sharpens through the lower third, holds across the middle, and is gone
    // before it reaches the top bar.
    gsap
      .timeline({ scrollTrigger: { trigger: items[0], endTrigger: items[items.length - 1], start: "top 90%", end: "bottom 14%", scrub: 0.4 } })
      .fromTo(items, { autoAlpha: 0, y: 50, filter: "blur(10px)" }, { autoAlpha: 1, y: 0, filter: "blur(0px)", ease: "power2.out", duration: 0.3, stagger: 0.04 })
      .to(items, { autoAlpha: 1, duration: 0.3 })
      .to(items, { autoAlpha: 0, y: -40, filter: "blur(8px)", ease: "power2.in", duration: 0.26 })
      .to({}, { duration: 0.14 });
  });
}

/**
 * The film gate: bars close to black as a scene ends and open as the next begins.
 * Driven by the scene's own entry so every chapter cut is a breath of darkness.
 */
export function gateOpen(scene: HTMLElement, stage: HTMLElement = $(".stage", scene)) {
  const lb = $(".letterbox", stage);
  if (!lb || reduced) return;
  gsap.set(lb, { "--lbx": "50vh" });
  gsap.to(lb, {
    "--lbx": "0vh",
    ease: "power2.inOut",
    scrollTrigger: { trigger: scene, start: "top 70%", end: "top top", scrub: true },
  });
}

/** Fire a callback with 0..1 progress while the sticky stage is held. */
export function progress(scene: HTMLElement, fn: (p: number, self: ScrollTrigger) => void, opts: Partial<ScrollTrigger.Vars> = {}) {
  return ScrollTrigger.create({
    trigger: scene,
    start: "top top",
    end: "bottom bottom",
    onUpdate: (self) => fn(self.progress, self),
    onRefresh: (self) => fn(self.progress, self),
    ...opts,
  });
}

/** Simple one-shot reveal for editorial blocks. */
export function reveal(targets: gsap.TweenTarget, trigger: Element, opts: gsap.TweenVars = {}) {
  if (reduced) return;
  gsap.from(targets, {
    autoAlpha: 0,
    y: 40,
    filter: "blur(6px)",
    duration: 1.4,
    ease: "expo.out",
    stagger: 0.12,
    scrollTrigger: { trigger, start: "top 78%" },
    ...opts,
  });
}

/** Run `fn` only while the element is near the viewport. */
export function whileVisible(el: Element, on: () => void, off: () => void, margin = "10% 0px") {
  const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? on() : off())), { rootMargin: margin });
  io.observe(el);
  return io;
}
