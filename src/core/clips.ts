import { $$, reduced } from "./env";

const BASE = "/media/clips/";

/** Attach the source lazily. Safe to call repeatedly. */
export function load(v: HTMLVideoElement) {
  if (v.dataset.loaded) return;
  v.dataset.loaded = "1";
  v.src = BASE + v.dataset.clip + ".mp4";
  v.load();
}

export function play(v: HTMLVideoElement) {
  if (reduced) return;
  load(v);
  if (v.paused) v.play().catch(() => {});
}

export function pause(v: HTMLVideoElement) {
  if (!v.paused) v.pause();
}

/** Mark videos a scene drives itself, so the automatic observer leaves them alone. */
export function manage(...videos: HTMLVideoElement[]) {
  videos.forEach((v) => (v.dataset.managed = "1"));
}

/** Videos within a scene: load when near, play only while on screen. */
export function initAuto() {
  const vids = $$<HTMLVideoElement>("video.clip");
  const near = new IntersectionObserver(
    (es) => es.forEach((e) => e.isIntersecting && load(e.target as HTMLVideoElement)),
    { rootMargin: "120% 0px" },
  );
  vids.forEach((v) => near.observe(v));
  if (reduced) return;

  const seen = new IntersectionObserver(
    (es) =>
      es.forEach((e) => {
        const v = e.target as HTMLVideoElement;
        e.isIntersecting ? play(v) : pause(v);
      }),
    { threshold: 0.02 },
  );
  vids.filter((v) => !v.dataset.managed).forEach((v) => seen.observe(v));
}

/** Resolve once the video can play through (or after a timeout, so nothing ever hangs). */
export function ready(v: HTMLVideoElement, timeout = 7000) {
  load(v);
  return new Promise<void>((res) => {
    if (v.readyState >= 3) return res();
    const done = () => {
      v.removeEventListener("canplaythrough", done);
      res();
    };
    v.addEventListener("canplaythrough", done);
    setTimeout(done, timeout);
  });
}
