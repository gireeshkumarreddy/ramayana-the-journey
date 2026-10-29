import { gsap } from "../core/scroll";
import { $, $$, reduced } from "../core/env";
import { reveal } from "../core/fx";

export function mount() {
  const s = $("#ayodhya");
  if (reduced) return;

  // Headline lines arrive one after another, each from its own indent.
  gsap.from($$(".stagger span", s), {
    yPercent: 60,
    autoAlpha: 0,
    filter: "blur(10px)",
    duration: 1.8,
    stagger: 0.14,
    ease: "expo.out",
    scrollTrigger: { trigger: ".ayodhya__head", start: "top 75%" },
  });
  reveal($(".ayodhya__head .eyebrow", s), s);

  // Each fragment of the city drifts at its own depth.
  const mm = gsap.matchMedia();
  mm.add("(min-width: 861px)", () => {
    $$<HTMLElement>(".tile", s).forEach((t) => {
      const speed = parseFloat(t.dataset.speed || "0");
      gsap.fromTo(
        t,
        { yPercent: speed * 120 },
        {
          yPercent: speed * -120,
          ease: "none",
          scrollTrigger: { trigger: ".ayodhya__collage", start: "top bottom", end: "bottom top", scrub: true },
        },
      );
    });
  });

  $$(".tile", s).forEach((t) =>
    gsap.from(t, {
      clipPath: "inset(18% 12% 18% 12%)",
      duration: 1.8,
      ease: "expo.out",
      scrollTrigger: { trigger: t, start: "top 88%" },
    }),
  );
  reveal($$(".ayodhya__text > *", s), $(".ayodhya__text", s));
  reveal($$(".lineage__list li", s), $(".lineage", s), { stagger: 0.16 });
  reveal($(".lineage .eyebrow", s), $(".lineage", s));
}
