import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { reduced } from "./env";

gsap.registerPlugin(ScrollTrigger, SplitText);

export let lenis: Lenis | null = null;

export function initScroll() {
  if (reduced) return;
  lenis = new Lenis({ lerp: 0.085, wheelMultiplier: 0.9, touchMultiplier: 1.4 });
  lenis.on("scroll", ScrollTrigger.update);
  gsap.ticker.add((t) => lenis?.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  // Scenes add their scroll length after Lenis first measures the page; re-measure whenever layout settles.
  ScrollTrigger.addEventListener("refresh", () => lenis?.resize());
  if (import.meta.env.DEV) (window as unknown as { __lenis: Lenis }).__lenis = lenis;
}

export function lock(on: boolean) {
  if (lenis) on ? lenis.stop() : lenis.start();
  document.documentElement.style.overflow = on ? "hidden" : "";
}

export function scrollTo(target: number | HTMLElement, immediate = false) {
  if (lenis) lenis.scrollTo(target, { immediate, duration: 2.2, easing: (t) => 1 - Math.pow(1 - t, 4) });
  else if (typeof target === "number") window.scrollTo({ top: target, behavior: immediate ? "auto" : "smooth" });
  else target.scrollIntoView({ behavior: immediate ? "auto" : "smooth" });
}

export { gsap, ScrollTrigger, SplitText };
