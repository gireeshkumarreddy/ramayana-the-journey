import { gsap } from "../core/scroll";
import { $, $$, reduced } from "../core/env";
import { Embers } from "../core/embers";
import { ready } from "../core/clips";
import { sound } from "../core/audio";

/**
 * The threshold. Loads what the opening needs, then lets the visitor choose
 * to enter with sound or in silence. That click is also the audio gesture.
 */
export function gate(): Promise<void> {
  const el = $("#gate");
  const bar = $(".gate__progress span", el);
  const status = $(".gate__status", el);
  const embers = new Embers($<HTMLCanvasElement>(".gate__embers", el), 60);
  embers.intensity = 0.7;
  embers.start();

  if (!reduced) {
    gsap.from([".gate__deva", ".gate__title", ".gate__gloss"], {
      autoAlpha: 0, y: 24, filter: "blur(12px)", duration: 2.2, stagger: 0.25, ease: "expo.out",
    });
  }

  let done = 0;
  const tasks: Promise<unknown>[] = [
    document.fonts.ready,
    ready($<HTMLVideoElement>('video[data-clip="walk"]')),
    ready($<HTMLVideoElement>('video[data-clip="storm"]')),
    new Promise((r) => setTimeout(r, reduced ? 0 : 1600)),
  ];
  tasks.forEach((t) =>
    t.then(() => {
      done++;
      gsap.to(bar, { scaleX: done / tasks.length, duration: 0.6, ease: "power2.out" });
    }),
  );

  return new Promise((resolve) => {
    Promise.all(tasks).then(() => {
      el.classList.add("is-ready");
      status.textContent = "Ready";
      $<HTMLButtonElement>("[data-enter]", el).focus({ preventScroll: true });
    });

    $$<HTMLButtonElement>("[data-enter]", el).forEach((btn) =>
      btn.addEventListener("click", () => {
        if (btn.dataset.enter === "sound") {
          sound.init();
          sound.setOn(true);
        }
        // Hand focus to the story before the gate disappears.
        const main = $("#awakening");
        main.setAttribute("tabindex", "-1");
        main.focus({ preventScroll: true });
        const tl = gsap.timeline({
          onComplete: () => {
            embers.stop();
            el.classList.add("is-gone");
            el.inert = true;
            resolve();
          },
        });
        if (reduced) return void tl.set({}, {}, 0);
        tl.to(".gate__inner", { autoAlpha: 0, y: -20, filter: "blur(10px)", duration: 0.8, ease: "power2.in" })
          .to(".gate__embers", { autoAlpha: 0, duration: 0.6 }, 0)
          .to(".gate__half--top", { yPercent: -100, duration: 1.6, ease: "expo.inOut" }, 0.5)
          .to(".gate__half--bottom", { yPercent: 100, duration: 1.6, ease: "expo.inOut" }, 0.5)
          // The cold open begins as the gate parts.
          .call(() => resolve(), [], 0.6);
      }, { once: true }),
    );
  });
}
