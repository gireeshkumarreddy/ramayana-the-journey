import { gsap, ScrollTrigger } from "../core/scroll";
import { $, $$, clamp, range, reduced, desktop } from "../core/env";
import { manage, play, pause } from "../core/clips";
import { beats, gateOpen, progress, reveal, whileVisible } from "../core/fx";
import { Embers } from "../core/embers";
import { Burn } from "../core/burn";
import { sound } from "../core/audio";
import { FACES } from "../data/story";

/**
 * Daśānana. Rāvaṇa's act is the longest in the journey and the only one with its
 * own transition (the fire dissolve), its own sound (the drum that answers each
 * beat) and its own mark (ten hairlines).
 */
export function mount() {
  const s = $("#ravana");
  boon($(".boon", s));
  conquest($(".conquest", s));
  chant($(".chant", s));
  faces($(".faces", s));
  reveal($$(".lanka__copy > *", s), $(".lanka", s));
}

/* ── The boon: nine heads into the fire ─────────────────────────── */
function boon(el: HTMLElement) {
  const heads = $$(".heads i", el);
  const ring = $(".boon__ring", el);
  const cv = document.createElement("canvas");
  Object.assign(cv.style, { position: "absolute", inset: "0", width: "100%", height: "100%", zIndex: "5", pointerEvents: "none" });
  $(".stage", el).appendChild(cv);
  const embers = new Embers(cv, 46, [8, 34]);
  if (reduced) return;

  whileVisible(el, () => embers.start(), () => embers.stop());
  gateOpen(el);
  beats(el);

  let burnt = 0;
  let restored = false;
  progress(el, (p) => {
    const lit = range(p, 0.06, 0.2);
    const b = range(p, 0.3, 0.66) * 9;
    const restore = p > 0.8;
    heads.forEach((h, i) => {
      const f = !restore && i < 9 ? clamp(b - i) : 0;
      gsap.set(h, {
        opacity: f > 0 ? 1 - f : 0.25 + lit * 0.75,
        scaleY: 1 - f * 0.85,
        backgroundImage: f > 0 ? "linear-gradient(#ffd08a, #c2321f)" : "",
      });
    });
    const n = Math.floor(b);
    if (n > burnt && !restore) sound.tick();
    burnt = n;
    if (restore !== restored) {
      restored = restore;
      if (restore) {
        sound.boom(0.7);
        gsap.fromTo(heads, { boxShadow: "0 0 18px 3px rgba(255, 200, 120, 0.9)" }, { boxShadow: "0 0 0 0 rgba(0,0,0,0)", duration: 1.6, stagger: 0.04 });
      }
    }
    gsap.set(ring, { autoAlpha: range(p, 0.52, 0.66) });
    embers.intensity = 0.35 + range(p, 0.28, 0.7) * 1.5;
  });
}

/* ── Conquest: each frame burns into the next ───────────────────── */
function conquest(el: HTMLElement) {
  const vids = $$<HTMLVideoElement>(".conquest__sources video", el);
  manage(...vids);
  if (reduced) return;
  gateOpen(el);
  beats(el);

  const canvas = $<HTMLCanvasElement>(".burn", el);
  let burn: Burn | null = null;
  try {
    if (Burn.supported()) burn = new Burn(canvas, vids);
  } catch {
    burn = null;
  }
  if (!burn) {
    el.classList.add("no-webgl");
    canvas.remove();
  }

  let raf = 0;
  const loop = (t: number) => {
    burn?.render(t / 1000);
    raf = requestAnimationFrame(loop);
  };
  whileVisible(
    el,
    () => {
      vids.forEach(play);
      if (burn && !raf) raf = requestAnimationFrame(loop);
    },
    () => {
      vids.forEach(pause);
      cancelAnimationFrame(raf);
      raf = 0;
    },
  );

  let last = -1;
  progress(el, (p) => {
    const v = range(p, 0.24, 0.42) + range(p, 0.58, 0.76);
    if (burn) burn.value = v;
    else vids.forEach((vid, i) => vid.classList.toggle("is-active", i === Math.round(v)));
    const k = Math.round(v);
    if (k !== last && last !== -1) sound.boom(0.5);
    last = k;
  });
}

/* ── The chant: one cut per beat ────────────────────────────────── */
function chant(el: HTMLElement) {
  const reel = $$<HTMLVideoElement>(".chant__reel video", el);
  const words = $$(".chant__words span", el);
  const line = $(".chant__line", el);
  const count = $(".chant__count span", el);
  const flash = $(".chant__flash", el);
  manage(...reel);
  reel[0].classList.add("is-active");
  if (reduced) return;
  gateOpen(el);

  // Which word strikes on each beat; on the crown, all three stand together.
  const STRIKE = [-1, 0, 1, 2, -1, 3, -1, -1];
  let idx = -1;
  const show = (i: number) => {
    const clip = Math.min(i, reel.length - 1);
    reel.forEach((v, k) => {
      const on = k === clip;
      v.classList.toggle("is-active", on);
      on ? play(v) : pause(v);
    });
    count.textContent = String(clip + 1).padStart(2, "0");
    gsap.fromTo(flash, { opacity: 0.8 }, { opacity: 0, duration: 0.5, ease: "power2.out" });

    const w = STRIKE[i];
    gsap.to(words, { autoAlpha: 0, duration: 0.2, overwrite: true });
    if (w >= 0 && w < 3) {
      gsap.fromTo(
        words[w],
        { autoAlpha: 0, scale: 1.4, yPercent: 0, letterSpacing: "0.32em" },
        { autoAlpha: 1, scale: 1, letterSpacing: "0.06em", duration: 0.8, ease: "expo.out", overwrite: true },
      );
    } else if (w === 3) {
      words.forEach((word, k) =>
        gsap.fromTo(
          word,
          { autoAlpha: 0, scale: 0.62, yPercent: (k - 1) * 100, letterSpacing: "0.3em" },
          { autoAlpha: 0.95 - Math.abs(k - 1) * 0.35, letterSpacing: "0.12em", duration: 0.9, delay: k * 0.08, ease: "expo.out", overwrite: true },
        ),
      );
    }
    gsap.to(line, { autoAlpha: i >= 6 ? 1 : 0, y: i >= 6 ? 0 : 12, duration: 0.8 });
    sound.boom(w >= 0 ? 1 : 0.5);
  };

  progress(el, (p) => {
    const i = Math.min(7, Math.floor(p * 8));
    if (i !== idx) {
      idx = i;
      show(i);
    }
  });
  whileVisible(el, () => {}, () => reel.forEach(pause));
}

/* ── Ten faces ──────────────────────────────────────────────────── */
function faces(el: HTMLElement) {
  const list = $(".faces__list", el);
  const echoes = $(".faces__echoes", el);
  const king = $<HTMLImageElement>(".faces__king", el);
  const stage = $(".faces__stage", el);
  const num = $(".faces__detail-num", el);
  const title = $(".faces__detail-title", el);
  const text = $(".faces__detail-text", el);

  const imgs: HTMLImageElement[] = [];
  for (let k = 1; k < 10; k++) {
    const img = document.createElement("img");
    img.src = king.src;
    img.alt = "";
    img.decoding = "async";
    echoes.appendChild(img);
    imgs.push(img);
  }

  const buttons = FACES.map((f, i) => {
    const li = document.createElement("li");
    const b = document.createElement("button");
    b.type = "button";
    b.setAttribute("aria-pressed", "false");
    b.innerHTML = `<span>${String(i + 1).padStart(2, "0")}</span>${f.title}`;
    li.appendChild(b);
    list.appendChild(li);
    return b;
  });

  let spread = reduced ? 1 : 0;
  let focus = 0;
  let px = 0;

  // Echoes fan out to either side like the painted Daśānana: rank 1 nearest, rank 5
  // furthest, each step a little shorter so the row of heads curves like a crown.
  const layout = () => {
    const head = stage.clientHeight * 0.47; // the crowned head is ~47% of the plate's height
    imgs.forEach((img, j) => {
      const k = j + 1;
      const side = k % 2 ? -1 : 1;
      const rank = Math.ceil(k / 2);
      const lit = focus === k;
      const reach = head * (0.66 * rank - 0.03 * rank * rank) * (desktop() ? 1 : 0.8);
      gsap.set(img, {
        xPercent: -52.5,
        x: side * reach * spread + px * rank * 6,
        yPercent: -rank * 1.6 * spread,
        rotation: side * rank * 1.6 * spread,
        scale: 1 - rank * 0.06 + (lit ? 0.03 : 0),
        opacity: lit ? Math.max(0.95, spread) : spread * (0.85 - rank * 0.1),
        zIndex: lit ? 20 : 10 - rank,
      });
    });
  };

  const select = (i: number, quiet = false) => {
    focus = i;
    buttons.forEach((b, j) => b.setAttribute("aria-pressed", String(j === i)));
    imgs.forEach((img, j) => img.classList.toggle("is-lit", j + 1 === i));
    king.style.filter = i === 0 ? "drop-shadow(0 0 40px rgba(226, 87, 63, 0.55)) drop-shadow(0 30px 60px rgba(0,0,0,0.7))" : "";
    layout();
    const f = FACES[i];
    const apply = () => {
      num.textContent = String(i + 1).padStart(2, "0") + " / 10";
      title.textContent = f.title;
      text.textContent = f.text;
    };
    if (reduced || quiet) return apply();
    gsap.timeline()
      .to([title, text], { autoAlpha: 0, y: -8, duration: 0.2 })
      .add(apply)
      .to([title, text], { autoAlpha: 1, y: 0, duration: 0.6, ease: "expo.out", stagger: 0.05 });
    sound.chime(i === 0 ? 196 : 220 + i * 18, 0.12);
  };

  buttons.forEach((b, i) => {
    b.addEventListener("click", () => select(i));
    b.addEventListener("mouseenter", () => desktop() && select(i));
    b.addEventListener("keydown", (e) => {
      const d = e.key === "ArrowDown" || e.key === "ArrowRight" ? 1 : e.key === "ArrowUp" || e.key === "ArrowLeft" ? -1 : 0;
      if (!d) return;
      e.preventDefault();
      const n = (i + d + buttons.length) % buttons.length;
      buttons[n].focus();
      select(n);
    });
  });
  select(0, true);

  if (reduced) return;
  const proxy = { v: 0 };
  gsap.to(proxy, {
    v: 1,
    ease: "power2.out",
    scrollTrigger: { trigger: stage, start: "top 85%", end: "center 55%", scrub: 0.8 },
    onUpdate: () => {
      spread = proxy.v;
      layout();
    },
  });
  stage.addEventListener("pointermove", (e) => {
    const r = stage.getBoundingClientRect();
    px = ((e.clientX - r.left) / r.width - 0.5) * 2;
    layout();
  });
  reveal($$(".faces__head > *", el), el);
  ScrollTrigger.create({ trigger: el, start: "top 60%", once: true, onEnter: () => sound.boom(0.6) });
}
