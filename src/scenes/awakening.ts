import { gsap, SplitText, lock } from "../core/scroll";
import { $, $$, reduced } from "../core/env";
import { manage, play, pause } from "../core/clips";

const sec = () => $("#awakening");

export function mount() {
  const s = sec();
  const walk = $<HTMLVideoElement>('video[data-clip="walk"]', s);
  const storm = $<HTMLVideoElement>('video[data-clip="storm"]', s);
  manage(walk, storm);
  if (reduced) return;

  const lb = $(".letterbox", s);
  gsap.set(lb, { "--lbx": "50vh" });

  // Leaving the title: it lifts away, the plain pushes in, the gate closes.
  gsap
    .timeline({ scrollTrigger: { trigger: s, start: "top top", end: "bottom bottom", scrub: true } })
    .to(".awakening__title", { yPercent: -14, autoAlpha: 0, ease: "power1.in", duration: 0.55 }, 0.1)
    .to(".scroll-cue", { autoAlpha: 0, duration: 0.1 }, 0)
    .to(".awakening__storm", { scale: 1.16, ease: "none", duration: 1 }, 0)
    .to(lb, { "--lbx": "50vh", ease: "power2.in", duration: 0.35 }, 0.65);

  // Keep the storm alive only while it's on screen.
  new IntersectionObserver(([e]) => (e.isIntersecting && s.dataset.intro === "done" ? play(storm) : pause(storm))).observe(s);
}

/** The cold open. Resolves when finished or skipped. */
export function intro(): Promise<void> {
  const s = sec();
  const walk = $<HTMLVideoElement>('video[data-clip="walk"]', s);
  const storm = $<HTMLVideoElement>('video[data-clip="storm"]', s);
  const skipBtn = $<HTMLButtonElement>(".skip-intro");

  if (reduced) {
    s.dataset.intro = "done";
    return Promise.resolve();
  }

  lock(true);
  const once = new SplitText(".awakening__once", { type: "chars" });
  const chars = $$(".mega span", s);

  return new Promise((resolve) => {
    const finish = () => {
      s.dataset.intro = "done";
      skipBtn.hidden = true;
      removeEventListener("keydown", onKey);
      removeEventListener("wheel", skip);
      removeEventListener("touchstart", skip);
      lock(false);
      pause(walk);
      play(storm);
      resolve();
    };
    const tl = gsap.timeline({ onComplete: finish });
    const skip = () => {
      if (tl.progress() < 1) tl.progress(1);
    };
    const onKey = (e: KeyboardEvent) => {
      if (["Escape", "ArrowDown", "PageDown", " ", "Enter"].includes(e.key)) skip();
    };

    tl.add(() => {
      walk.currentTime = 0;
      play(walk);
    }, 0)
      .to($(".letterbox", s), { "--lbx": "0vh", duration: 1.3, ease: "power3.inOut" }, 0)
      .fromTo(".awakening__once", { autoAlpha: 1 }, { autoAlpha: 1, duration: 0.01 }, 0.7)
      .from(once.chars, { autoAlpha: 0, filter: "blur(8px)", y: 10, duration: 1.2, stagger: 0.035, ease: "power2.out" }, 0.7)
      // Match cut: the walking feet become the lone figure on the plain.
      .add(() => play(storm), 2.9)
      .to(".awakening__storm", { autoAlpha: 1, duration: 1.2, ease: "power1.inOut" }, 2.9)
      .to(".awakening__walk", { autoAlpha: 0, duration: 1.2 }, 3.2)
      .to(".awakening__once", { autoAlpha: 0, filter: "blur(6px)", duration: 1 }, 3.8)
      .to(".awakening__deva", { autoAlpha: 1, duration: 1.4 }, 4.1)
      .to(chars, { y: 0, duration: 1.8, stagger: 0.075, ease: "expo.out" }, 4.2)
      .fromTo(".awakening__sub", { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 1.4, ease: "power2.out" }, 5.2)
      .fromTo(".awakening__meta", { autoAlpha: 0 }, { autoAlpha: 1, duration: 1.2 }, 5.8)
      .to(".scroll-cue", { autoAlpha: 1, duration: 1 }, 6.2);

    skipBtn.hidden = false;
    skipBtn.onclick = skip;
    addEventListener("keydown", onKey);
    addEventListener("wheel", skip, { passive: true });
    addEventListener("touchstart", skip, { passive: true });
  });
}
