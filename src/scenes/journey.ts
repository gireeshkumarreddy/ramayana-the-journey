import { ScrollTrigger } from "../core/scroll";
import { $, $$, dpr, portrait, range, reduced } from "../core/env";
import { manage, play, pause } from "../core/clips";
import { progress, whileVisible } from "../core/fx";
import { sound } from "../core/audio";
import { Trail, tornRect, toClip, rng, GOLD, EMBER, BLOOD, INK, type TrailStyle } from "../core/trail";

/**
 * The Journey: a passage through worlds. Each world fills the screen. A trail of
 * gold dust leads to a torn window into the next world; scrolling carries the
 * visitor through the window, which grows until it becomes the world around them.
 */

type Spec = { cx: number; cy: number; w: number };
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function mount() {
  const s = $("#journey");
  const worlds = $$(".world", s);
  const N = worlds.length;
  const texts = worlds.map((w) => $(".world__text", w));
  const vids = worlds.map((w) => w.querySelector<HTMLVideoElement>("video"));
  const marks = $$(".passage li", s);
  const steps = $(".journey__steps", s);
  for (let i = 0; i < N; i++) steps.appendChild(Object.assign(document.createElement("div"), { className: "step" }));
  vids.forEach((v) => v && manage(v));

  if (reduced) {
    worlds.forEach((w) => w.classList.add("is-on"));
    return;
  }

  const canvas = $<HTMLCanvasElement>(".trail", s);
  const ctx = canvas.getContext("2d")!;
  const tears = worlds.map((_, i) => tornRect(i * 37 + 11));
  const clips = tears.map(toClip);
  const trails = worlds.map(() => new Trail());
  const styleOf = (i: number): TrailStyle => (i === 0 ? INK : i === N - 2 ? EMBER : i === N - 1 ? BLOOD : GOLD);
  let W = 0;
  let H = 0;
  let specs: (Spec | null)[] = [];

  const readSpec = (w: HTMLElement): Spec | null => {
    const raw = (portrait() && w.dataset.portalM) || w.dataset.portal;
    if (!raw) return null;
    const [cx, cy, ww] = raw.split(",").map(Number);
    return { cx, cy, w: ww };
  };

  const build = () => {
    const r = dpr();
    W = canvas.clientWidth;
    H = canvas.clientHeight;
    canvas.width = Math.round(W * r);
    canvas.height = Math.round(H * r);
    ctx.setTransform(r, 0, 0, r, 0, 0);
    specs = worlds.map(readSpec);
    const base = Math.max(28, Math.min(84, W * 0.05));
    trails.forEach((tr, i) => {
      const sp = specs[i];
      if (sp) {
        // From where we stand, at the bottom of the frame, up to the foot of the window.
        const C = { x: sp.cx * W, y: sp.cy * H };
        const end = { x: C.x, y: C.y + (sp.w * H) / 2 + 2 };
        const side = sp.cx > 0.5 ? 1 : -1;
        if (portrait()) {
          tr.build({ x: W * 0.5, y: H + 50 }, { x: W * 0.12, y: H * 0.86 }, { x: W * 0.9, y: end.y + H * 0.22 }, end, base * 1.2, i * 13 + 5);
        } else {
          tr.build(
            { x: W * (0.5 + side * 0.04), y: H + 60 },
            { x: W * (0.5 - side * 0.1), y: H * 0.8 },
            { x: end.x - side * W * 0.15, y: end.y + H * 0.22 },
            end,
            base,
            i * 13 + 5,
          );
        }
      } else {
        // The last world: the trail is carried up and away into the sky.
        tr.build({ x: W * 0.42, y: H + 60 }, { x: W * 0.2, y: H * 0.6 }, { x: W * 0.55, y: H * 0.3 }, { x: W * 0.38, y: -80 }, base, i * 13 + 5, 0.5);
      }
    });
  };
  new ResizeObserver(build).observe(canvas);
  build();

  // Embers that lift off the edge of the opening window
  type Ember = { x: number; y: number; vx: number; vy: number; life: number; r: number };
  const embers: Ember[] = [];
  const er = rng(3);

  let P = 0;
  let current = -1;
  let playing = "";
  let whooshed = false;
  let last = performance.now();

  const frame = (now: number) => {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const time = now / 1000;
    const f = Math.min(N - 0.0001, P * N);
    const i = Math.floor(f);
    const t = f - i;
    const sp = specs[i];
    const next = sp ? i + 1 : -1;
    const phone = portrait();

    // Timing within a world: arrive, read, the trail is drawn, the window opens, and through we go.
    const textIn = i === 0 ? 1 : easeOut(range(t, 0.02, 0.14));
    const textOut = 1 - range(t, phone ? 0.34 : 0.44, phone ? 0.42 : 0.52);
    const reveal = phone ? range(t, 0.4, 0.6) : range(t, 0.12, 0.52);
    const appear = sp ? easeOut(range(t, phone ? 0.42 : 0.22, phone ? 0.58 : 0.42)) : 0;
    const u = sp ? easeInOut(range(t, 0.56, 1)) : 0;
    const Z = sp ? 1 / sp.w : 1;
    const sCur = Math.pow(Z, u);
    const sNext = Math.pow(Z, u - 1) * (0.86 + 0.14 * appear);
    const fadeEnd = sp ? 1 : 1 - range(t, 0.82, 1);

    worlds.forEach((w, k) => {
      if (k === i) {
        w.classList.add("is-on");
        if (sp) w.style.transformOrigin = `${sp.cx * 100}% ${sp.cy * 100}%`;
        w.style.transform = `scale(${sCur})`;
        w.style.opacity = String((1 - range(u, 0.55, 1)) * fadeEnd);
        w.style.clipPath = "";
        w.style.zIndex = "1";
        // Darken the world being left so the one ahead pulls the eye through.
        w.style.setProperty("--dim", String(Math.min(0.85, (k === 0 ? 0 : 0.32 * appear) + 0.6 * u)));
      } else if (k === next) {
        w.classList.add("is-on");
        w.style.transformOrigin = `${sp!.cx * 100}% ${sp!.cy * 100}%`;
        w.style.transform = `scale(${sNext})`;
        w.style.opacity = String(appear);
        w.style.clipPath = clips[k];
        w.style.zIndex = "2";
        w.style.setProperty("--dim", "0");
      } else {
        w.classList.remove("is-on");
      }
    });
    texts.forEach((tx, k) => {
      if (k !== i) {
        tx.style.opacity = k === next ? "0" : "";
        return;
      }
      const a = textIn * textOut;
      tx.style.opacity = String(a);
      tx.style.transform = `translateY(${(1 - textIn) * 30 - (1 - textOut) * 20}px)`;
    });

    // Only the worlds on screen are playing.
    const pair = `${i},${next}`;
    if (pair !== playing) {
      playing = pair;
      vids.forEach((v, k) => v && (k === i || k === next ? play(v) : pause(v)));
    }
    if (i !== current) {
      const forward = i > current;
      current = i;
      s.classList.toggle("on-leaf", i === 0);
      marks.forEach((m, k) => {
        m.classList.toggle("is-here", k === i);
        m.classList.toggle("is-past", k < i);
      });
      if (forward && i > 0) sound.chime(261.63 * Math.pow(2, i / 7), 0.09);
      if (forward && i === N - 1) sound.boom(0.9);
    }
    if (u > 0.08 && !whooshed) {
      whooshed = true;
      sound.whoosh(1.3);
    }
    if (u < 0.02) whooshed = false;

    // Canvas: the trail in this world, and the edge of the window into the next
    ctx.clearRect(0, 0, W, H);
    const cx = sp ? sp.cx * W : W / 2;
    const cy = sp ? sp.cy * H : H / 2;
    trails[i].draw(ctx, reveal, sCur, cx, cy, time, dt, styleOf(i), (1 - range(u, 0.45, 0.95)) * fadeEnd);

    if (sp && appear > 0) {
      // The torn edge keeps burning as it grows past us, and only dies as it leaves the frame.
      const a = appear * (1 - range(u, 0.45, 0.92));
      const grow = 1 + u * 2.5;
      const pts = tears[next].map(([x, y]) => [cx + (x * W - cx) * sNext, cy + (y * H - cy) * sNext] as [number, number]);
      const path = new Path2D();
      pts.forEach(([x, y], k) => (k ? path.lineTo(x, y) : path.moveTo(x, y)));
      path.closePath();
      ctx.save();
      if (i === 0) {
        // Burning through the leaf: a charred lip with fire just inside it
        ctx.globalAlpha = a;
        ctx.strokeStyle = "rgba(40, 18, 6, 0.9)";
        ctx.lineWidth = 7;
        ctx.shadowColor = "rgba(30, 12, 4, 0.8)";
        ctx.shadowBlur = 14;
        ctx.stroke(path);
      }
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = a;
      ctx.strokeStyle = i === N - 2 ? "rgba(255, 110, 60, 0.9)" : "rgba(255, 170, 80, 0.85)";
      ctx.lineWidth = 2.4 * grow;
      ctx.shadowColor = "rgba(255, 140, 50, 1)";
      ctx.shadowBlur = 26 * grow;
      ctx.stroke(path);
      ctx.shadowBlur = 0;
      ctx.lineWidth = 0.9 * grow;
      ctx.strokeStyle = "rgba(255, 240, 215, 0.9)";
      ctx.stroke(path);
      ctx.restore();

      // The edge smoulders
      for (let e = 0; e < 3; e++) {
        const [x, y] = pts[Math.floor(er() * pts.length)];
        embers.push({ x, y, vx: (er() - 0.5) * 30, vy: -20 - er() * 50, life: 0, r: 0.6 + er() * 1.6 });
      }
    }
    ctx.save();
    ctx.globalCompositeOperation = "lighter";
    for (let e = embers.length - 1; e >= 0; e--) {
      const m = embers[e];
      m.life += dt;
      m.x += m.vx * dt;
      m.y += m.vy * dt;
      if (m.life > 1.4) {
        embers.splice(e, 1);
        continue;
      }
      ctx.globalAlpha = (1 - m.life / 1.4) * appear * (1 - u);
      ctx.fillStyle = "rgb(255, 170, 90)";
      ctx.fillRect(m.x, m.y, m.r * 2, m.r * 2);
    }
    ctx.restore();

    raf = requestAnimationFrame(frame);
  };

  let raf = 0;
  whileVisible(
    s,
    () => {
      if (!raf) {
        last = performance.now();
        raf = requestAnimationFrame(frame);
      }
    },
    () => {
      cancelAnimationFrame(raf);
      raf = 0;
      playing = "";
      vids.forEach((v) => v && pause(v));
    },
    "0px",
  );
  progress(s, (p) => (P = p));
  ScrollTrigger.addEventListener("refresh", build);
}
