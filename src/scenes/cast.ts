import { gsap, ScrollTrigger, scrollTo } from "../core/scroll";
import { $, $$, desktop, reduced } from "../core/env";
import { manage, play, pause } from "../core/clips";
import { progress, gateOpen } from "../core/fx";
import { sound } from "../core/audio";
import { CAST, type Character } from "../data/story";
import { Sea } from "../core/sea";

const STEP = 24; // degrees between cards on the drum

/** Rendered sea scenes, keyed by their canvas, for the character the footage doesn't show. */
const seas = new WeakMap<HTMLCanvasElement, Sea>();
function seaFor(canvas: HTMLCanvasElement) {
  let sea = seas.get(canvas);
  if (!sea) {
    sea = new Sea(canvas, 0.6);
    sea.p = 0.62; // mid-leap, over the open sea
    seas.set(canvas, sea);
  }
  return sea;
}

function mediaFor(c: Character, managed = true): HTMLElement {
  if (c.illum) {
    const cv = document.createElement("canvas");
    cv.className = "sea-card";
    cv.setAttribute("aria-hidden", "true");
    return cv;
  }
  const v = document.createElement("video");
  v.className = "clip";
  v.dataset.clip = c.clip!;
  v.muted = true;
  v.loop = true;
  v.playsInline = true;
  v.preload = "none";
  v.poster = `/media/posters/${c.clip}.webp`;
  v.setAttribute("aria-hidden", "true");
  if (managed) manage(v);
  return v;
}

export function mount() {
  const s = $("#cast");
  const ring = $(".drum__ring", s);
  const index = $(".cast__index", s);
  const steps = $(".beats--steps", s);
  const n = CAST.length;

  const cards = CAST.map((c, i) => {
    const card = document.createElement("div");
    card.className = "card" + (c.illum ? " card--illum" : "");
    card.style.setProperty("--fx", c.fx || "50%");
    card.appendChild(mediaFor(c));
    if (c.illum) card.insertAdjacentHTML("beforeend", `<span class="card__illum">Rendered</span>`);
    const tag = document.createElement("span");
    tag.className = "card__tag";
    tag.textContent = `${String(i + 1).padStart(2, "0")} · ${c.name}`;
    card.appendChild(tag);
    card.addEventListener("click", () => open(i));
    ring.appendChild(card);

    const b = document.createElement("button");
    b.type = "button";
    b.textContent = String(i + 1).padStart(2, "0");
    b.setAttribute("aria-label", c.name);
    if (c.id === "ravana") b.classList.add("is-ravana");
    b.addEventListener("click", () => go(i));
    const li = document.createElement("li");
    li.appendChild(b);
    index.appendChild(li);

    const step = document.createElement("div");
    step.className = "step";
    steps.appendChild(step);
    return card;
  });
  const vids = cards.map((c) => c.querySelector("video"));
  const canvases = cards.map((c) => c.querySelector<HTMLCanvasElement>("canvas.sea-card"));
  const webgl = Sea.supported();
  const dots = $$<HTMLButtonElement>("button", index);

  let R = 800;
  const size = () => {
    const cw = desktop() ? Math.min(innerWidth * 0.44, 760) : innerWidth * 0.84;
    const ch = cw / (desktop() ? 1.6 : 1.22);
    s.style.setProperty("--cw", `${cw}px`);
    s.style.setProperty("--ch", `${ch}px`);
    R = (ch / 2 / Math.tan(((STEP / 2) * Math.PI) / 180)) * 1.04;
    cards.forEach((card, i) => (card.style.transform = `rotateX(${-i * STEP}deg) translateZ(${R}px)`));
  };
  size();
  addEventListener("resize", size);

  // Asides
  const num = $(".cast__num", s);
  const name = $(".cast__name", s);
  const deva = $(".cast__deva", s);
  const epithet = $(".cast__epithet", s);
  const essence = $(".cast__essence", s);
  const openBtn = $<HTMLButtonElement>(".cast__open", s);
  const openName = $("span", openBtn);

  let active = -1;
  const setActive = (i: number) => {
    if (i === active) return;
    active = i;
    const c = CAST[i];
    s.style.setProperty("--accent", c.accent);
    s.classList.toggle("is-ravana", c.id === "ravana");
    dots.forEach((d, j) => d.setAttribute("aria-current", String(j === i)));
    vids.forEach((v, j) => v && (Math.abs(j - i) <= 1 ? play(v) : pause(v)));
    canvases.forEach((cv, j) => {
      if (!cv || !webgl) return;
      const sea = seaFor(cv);
      if (Math.abs(j - i) <= 1 && !reduced) sea.start();
      else {
        sea.stop();
        sea.render(0);
      }
    });
    const apply = () => {
      num.textContent = String(i + 1).padStart(2, "0");
      name.textContent = c.name;
      deva.textContent = c.deva;
      epithet.textContent = c.epithet;
      essence.textContent = c.essence;
      openName.textContent = c.name;
    };
    if (reduced) return apply();
    gsap.timeline()
      .to([num, name, deva, epithet, essence], { autoAlpha: 0, y: -10, duration: 0.18, stagger: 0.02 })
      .add(apply)
      .fromTo([num, name, deva, epithet, essence], { y: 14 }, { autoAlpha: 1, y: 0, duration: 0.6, stagger: 0.04, ease: "expo.out" });
    if (c.id === "ravana") sound.boom(0.9);
    else sound.chime(196 * Math.pow(2, i / 7), 0.07);
  };

  const turn = (theta: number) => {
    ring.style.transform = `translateZ(${-R}px) rotateX(${theta}deg)`;
    cards.forEach((card, i) => {
      const d = Math.abs(theta - i * STEP);
      card.style.visibility = d > 78 ? "hidden" : "visible";
      card.style.opacity = String(Math.max(0, 1 - d / 100));
      card.style.setProperty("--dim", String(Math.min(1, d / 40)));
    });
    setActive(Math.max(0, Math.min(n - 1, Math.round(theta / STEP))));
  };
  turn(0);

  let st: ScrollTrigger | null = null;
  if (!reduced) {
    gateOpen(s);
    st = progress(s, (p) => turn(p * (n - 1) * STEP));
  }

  function go(i: number) {
    if (!st) return turn(i * STEP);
    scrollTo(st.start + ((st.end - st.start) * i) / (n - 1));
  }

  // Dialog
  const dlg = $<HTMLDialogElement>(".persona");
  const dMedia = $(".persona__media", dlg);
  let personaCanvas: HTMLCanvasElement | undefined;
  function open(i: number) {
    const c = CAST[i];
    dlg.style.setProperty("--accent", c.accent);
    dlg.style.setProperty("--fx", c.fx || "50%");
    dMedia.innerHTML = "";
    // One canvas serves every opening of the rendered card, so WebGL contexts don't pile up.
    const m = c.illum ? (personaCanvas ??= mediaFor(c, false) as HTMLCanvasElement) : mediaFor(c, false);
    dMedia.appendChild(m);
    if (m instanceof HTMLVideoElement) play(m);
    else if (m instanceof HTMLCanvasElement && webgl) {
      const sea = seaFor(m);
      reduced ? sea.render(0) : sea.start();
    }
    $(".persona__deva", dlg).textContent = c.deva;
    $(".persona__name", dlg).textContent = c.name;
    $(".persona__titles", dlg).textContent = c.titles;
    $(".persona__text", dlg).textContent = c.text;
    $(".persona__moments", dlg).innerHTML = c.moments.map((m, k) => `<li><span>${String(k + 1).padStart(2, "0")}</span>${m}</li>`).join("");
    $(".persona__note", dlg).textContent = c.note || "";
    dlg.showModal();
    if (!reduced) gsap.fromTo($$(".persona__body > *", dlg), { autoAlpha: 0, y: 20 }, { autoAlpha: 1, y: 0, stagger: 0.05, duration: 0.9, ease: "expo.out" });
    sound.chime(c.id === "ravana" ? 146.8 : 293.7, 0.12);
  }
  openBtn.addEventListener("click", () => open(active));
  $(".persona__close", dlg).addEventListener("click", () => dlg.close());
  dlg.addEventListener("close", () => {
    dMedia.querySelector("video")?.pause();
    const cv = dMedia.querySelector<HTMLCanvasElement>("canvas");
    if (cv) seas.get(cv)?.stop();
    openBtn.focus({ preventScroll: true });
  });
}
