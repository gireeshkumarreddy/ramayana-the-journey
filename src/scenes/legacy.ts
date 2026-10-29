import { gsap, SplitText, scrollTo } from "../core/scroll";
import { $, $$, reduced } from "../core/env";
import { gateOpen, reveal } from "../core/fx";
import { sound } from "../core/audio";

export function mount() {
  const s = $("#legacy");

  // The marquee needs a second copy of its items to loop without a seam.
  const track = $(".tellings__track", s);
  Array.from(track.children).forEach((li) => {
    const c = li.cloneNode(true) as HTMLElement;
    c.setAttribute("aria-hidden", "true");
    track.appendChild(c);
  });

  $(".finale__again", s).addEventListener("click", () => {
    const veil = document.createElement("div");
    Object.assign(veil.style, { position: "fixed", inset: "0", background: "#07060a", zIndex: "300", opacity: "0" });
    document.body.appendChild(veil);
    sound.chime(130.81, 0.16);
    gsap.timeline({ onComplete: () => veil.remove() })
      .to(veil, { opacity: 1, duration: 1.2, ease: "power2.inOut" })
      .add(() => {
        scrollTo(0, true);
        $<HTMLElement>("#awakening").focus({ preventScroll: true });
      })
      .to(veil, { opacity: 0, duration: 1.6, ease: "power2.inOut" }, "+=0.4");
  });

  if (reduced) return;

  const ret = $(".legacy__return", s);
  gsap.from($(".frame", ret), {
    clipPath: "inset(50% 0 50% 0)", duration: 2, ease: "expo.inOut",
    scrollTrigger: { trigger: ret, start: "top 70%" },
  });
  reveal($$(".legacy__return-copy > *", s), $(".legacy__return-copy", s));

  const origin = $(".legacy__origin", s);
  const deva = new SplitText($(".verse__deva", origin), { type: "words" });
  gsap.from(deva.words, {
    autoAlpha: 0, y: 12, filter: "blur(8px)", duration: 1.4, stagger: 0.08, ease: "power2.out",
    scrollTrigger: { trigger: origin, start: "top 65%", onEnter: () => sound.chime(392, 0.1) },
  });
  reveal($$(".verse__iast, .verse__en, footer", origin), origin, { delay: 0.8 });
  reveal($$(".tellings > .eyebrow, .tellings__note", s), $(".tellings", s));

  const fin = $(".finale", s);
  gateOpen(fin);
  gsap
    .timeline({ scrollTrigger: { trigger: fin, start: "top 20%", end: "bottom bottom", scrub: 0.6 } })
    .from($$(".finale__line", fin), { autoAlpha: 0, y: 30, filter: "blur(10px)", stagger: 0.25, duration: 0.5 })
    .from($(".finale__iti", fin), { autoAlpha: 0, duration: 0.3 }, ">-0.1")
    .from($(".finale__again", fin), { autoAlpha: 0, y: 12, duration: 0.3 }, ">");
}
