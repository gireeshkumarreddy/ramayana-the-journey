import { gsap, ScrollTrigger } from "../core/scroll";
import { $, $$, coarse, desktop, range, reduced } from "../core/env";
import { play } from "../core/clips";
import { reveal } from "../core/fx";
import { sound } from "../core/audio";
import { PLACES, ROUTE, type Place } from "../data/story";

type Pt = [number, number];
const VW = 1100;
const VH = 1250;
const P = (lon: number, lat: number): Pt => [(lon - 68) * 50, (30.5 - lat) * 50];

// A painted, approximate coastline. No borders are drawn; the north fades into mist.
const COAST: Pt[] = [
  [68.9, 23.2], [69.8, 21.6], [71.0, 20.8], [72.6, 21.2], [72.8, 19.5], [73.0, 18.0], [73.4, 16.5], [73.8, 15.4],
  [74.4, 14.2], [74.8, 12.8], [75.4, 11.6], [76.0, 10.4], [76.5, 9.2], [77.2, 8.3], [77.55, 8.08], [78.1, 8.7],
  [78.9, 9.3], [79.3, 10.2], [79.85, 10.4], [79.85, 11.6], [80.3, 13.1], [80.2, 15.0], [81.2, 16.3], [82.3, 16.7],
  [83.3, 17.7], [84.8, 19.2], [86.0, 19.9], [86.9, 21.0], [87.8, 21.7], [88.6, 21.8], [89.4, 22.1], [90.4, 22.6],
  [92.5, 23.5], [92.5, 32], [66, 32], [66, 23.6],
].map(([a, b]) => P(a, b));

const LANKA: Pt[] = [
  [79.9, 9.8], [80.3, 9.55], [80.9, 8.9], [81.3, 8.4], [81.85, 7.4], [81.7, 6.6], [81.0, 6.12], [80.2, 6.0],
  [79.85, 6.9], [79.8, 7.9], [79.85, 8.9],
].map(([a, b]) => P(a, b));

const RIVERS: { name: string; pts: Pt[]; at: number }[] = [
  { name: "Gaṅgā", at: 6, pts: [[78.2, 30], [78.8, 28.6], [79.9, 27.2], [80.4, 26.4], [81.8, 25.4], [83.0, 25.3], [84.2, 25.6], [85.2, 25.6], [86.9, 25.3], [87.9, 24.6], [88.2, 23.4], [88.3, 22.2]].map(([a, b]) => P(a, b)) },
  { name: "Yamunā", at: 2, pts: [[77.2, 30], [77.3, 28.6], [78.0, 27.2], [79.3, 26.4], [80.6, 25.7], [81.8, 25.4]].map(([a, b]) => P(a, b)) },
  { name: "Sarayū", at: 1, pts: [[81.0, 28.8], [81.6, 27.8], [82.2, 26.8], [83.5, 26.3], [84.6, 25.7]].map(([a, b]) => P(a, b)) },
  { name: "Godāvarī", at: 4, pts: [[73.5, 19.9], [75.0, 19.4], [76.5, 19.0], [78.0, 18.8], [79.5, 18.6], [80.6, 17.8], [81.8, 16.9], [82.3, 16.6]].map(([a, b]) => P(a, b)) },
  { name: "Tuṅgabhadrā", at: 99, pts: [[75.0, 14.0], [75.9, 14.9], [76.5, 15.3], [77.6, 15.9], [78.2, 16.0], [79.6, 16.2], [80.6, 16.0], [81.0, 15.8]].map(([a, b]) => P(a, b)) },
];

const LIFT: Record<string, number> = {
  mithila: 34, ayodhya: 70, shringavera: 30, chitrakuta: 104,
  panchavati: 46, kishkindha: 46, mahendra: 30, setu: 66, lanka: 46,
};

function smooth(pts: Pt[], closed = false) {
  const n = pts.length;
  const get = (i: number) => (closed ? pts[(i + n) % n] : pts[Math.max(0, Math.min(n - 1, i))]);
  let d = `M${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  const last = closed ? n : n - 1;
  for (let i = 0; i < last; i++) {
    const p0 = get(i - 1), p1 = get(i), p2 = get(i + 1), p3 = get(i + 2);
    d += ` C${(p1[0] + (p2[0] - p0[0]) / 6).toFixed(1)} ${(p1[1] + (p2[1] - p0[1]) / 6).toFixed(1)} ${(p2[0] - (p3[0] - p1[0]) / 6).toFixed(1)} ${(p2[1] - (p3[1] - p1[1]) / 6).toFixed(1)} ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d + (closed ? "Z" : "");
}

const NS = "http://www.w3.org/2000/svg";
const el = <K extends keyof SVGElementTagNameMap>(tag: K, attrs: Record<string, string | number>) => {
  const e = document.createElementNS(NS, tag);
  for (const k in attrs) e.setAttribute(k, String(attrs[k]));
  return e;
};

export function mount() {
  const s = $("#road");
  const map = $(".map", s);
  const plane = $(".map__plane", s);
  const svg = $<SVGSVGElement>(".map__svg", s);
  const byId = Object.fromEntries(PLACES.map((p) => [p.id, p])) as Record<string, Place>;
  const at = (id: string) => P(byId[id].lon, byId[id].lat);

  $(".map__land", svg).setAttribute("d", smooth(COAST, true));
  $(".map__lanka", svg).setAttribute("d", smooth(LANKA, true));
  const rivers = $(".map__rivers", svg);
  const labels = $(".map__labels", svg);
  RIVERS.forEach((r) => {
    rivers.appendChild(el("path", { d: smooth(r.pts) }));
    if (r.at < r.pts.length) {
      const [x, y] = r.pts[r.at];
      const t = el("text", { x: x + 10, y: y + 26 });
      t.textContent = r.name;
      labels.appendChild(t);
    }
  });
  [["Vindhya", 76.2, 22.4], ["Western Ghats", 75.2, 17.6]].forEach(([name, lon, lat]) => {
    const [x, y] = P(lon as number, lat as number);
    const t = el("text", { x, y, class: "range" });
    t.textContent = name as string;
    labels.appendChild(t);
  });
  [["Arabian Sea", 68.6, 12.2], ["Bay of Bengal", 84.2, 14.5], ["Indian Ocean", 74.5, 6.2]].forEach(([name, lon, lat]) => {
    const [x, y] = P(lon as number, lat as number);
    const t = el("text", { x, y, class: "sea" });
    t.textContent = name as string;
    labels.appendChild(t);
  });

  // Routes: a blurred glow, a rough-edged gilt body and a line of dust beads, drawn as one
  const routeD = smooth(ROUTE.map(at));
  const routeParts = $$<SVGPathElement>(".map__route", svg);
  routeParts.forEach((p) => p.setAttribute("d", routeD));
  const route = routeParts[1];
  const [mx, my] = at("mahendra");
  const [lx, ly] = at("lanka");
  const leapD = `M${mx} ${my} Q ${(mx + lx) / 2 - 60} ${Math.min(my, ly) - 300} ${lx} ${ly}`;
  $$<SVGPathElement>(".map__leap", svg).forEach((p) => p.setAttribute("d", leapD));
  const setu = $<SVGPathElement>(".map__setu", svg);
  const [sx, sy] = at("setu");
  setu.setAttribute("d", `M${sx} ${sy} L ${P(79.92, 9.08)[0]} ${P(79.92, 9.08)[1]} L ${lx - 6} ${ly - 30}`);

  const routeLen = route.getTotalLength();
  // Textured and dashed strokes can't be drawn with a dash offset, so each group is revealed by a solid masked copy.
  const masked = (target: SVGElement, d: string, id: string, width = 40) => {
    const defs = $("defs", svg);
    const m = el("mask", { id, maskUnits: "userSpaceOnUse", x: 0, y: 0, width: VW, height: VH });
    const solid = el("path", { d, fill: "none", stroke: "#fff", "stroke-width": width, "stroke-linecap": "round", "stroke-linejoin": "round" });
    m.appendChild(solid);
    defs.appendChild(m);
    target.setAttribute("mask", `url(#${id})`);
    const len = solid.getTotalLength();
    solid.style.strokeDasharray = `${len} ${len}`;
    return (k: number) => (solid.style.strokeDashoffset = String(len * (1 - k)));
  };
  const drawRoute = masked($(".map__trail", svg) as unknown as SVGElement, routeD, "routemask");
  const drawLeap = masked($(".map__leapgroup", svg) as unknown as SVGElement, leapD, "leapmask");
  const drawSetu = masked(setu, setu.getAttribute("d")!, "setumask", 24);
  gsap.set(plane, { xPercent: -50, rotateX: 24, rotateZ: -3 });

  // How far along the drawn route each place sits, so its pin appears as the line arrives.
  const reach: Record<string, number> = {};
  ROUTE.forEach((id) => {
    const [x, y] = at(id);
    let best = 0;
    let bd = Infinity;
    for (let l = 0; l <= routeLen; l += 6) {
      const pt = route.getPointAtLength(l);
      const d = Math.hypot(pt.x - x, pt.y - y);
      if (d < bd) {
        bd = d;
        best = l;
      }
    }
    reach[id] = (best / routeLen) * 0.72;
  });
  reach.lanka = 0.86;

  // Pins
  const pinsEl = $(".map__pins", s);
  const panel = $(".place", s);
  const pins = PLACES.map((pl) => {
    const [x, y] = P(pl.lon, pl.lat);
    const b = document.createElement("button");
    b.type = "button";
    b.className = `pin${pl.id === "lanka" ? " pin--lanka" : ""}`;
    b.style.left = `${(x / VW) * 100}%`;
    b.style.top = `${(y / VH) * 100}%`;
    b.style.setProperty("--lift", `${LIFT[pl.id] ?? 40}px`);
    b.setAttribute("aria-pressed", "false");
    b.setAttribute("aria-label", `${pl.name}: ${pl.kanda}`);
    b.innerHTML = `<span class="pin__name">${pl.name}</span><span class="pin__stem"></span><span class="pin__dot"></span>`;
    b.addEventListener("click", () => select(pl, b));
    pinsEl.appendChild(b);
    return b;
  });

  let current: HTMLButtonElement | null = null;
  function select(pl: Place, b: HTMLButtonElement) {
    current?.setAttribute("aria-pressed", "false");
    current = b;
    b.setAttribute("aria-pressed", "true");
    const media = $(".place__media", panel);
    media.innerHTML = "";
    if (pl.clip) {
      const v = document.createElement("video");
      v.className = "clip";
      v.dataset.clip = pl.clip;
      v.muted = v.loop = v.playsInline = true;
      v.poster = `/media/posters/${pl.clip}.webp`;
      v.setAttribute("aria-hidden", "true");
      media.appendChild(v);
      play(v);
    }
    $(".place__kanda", panel).textContent = pl.kanda;
    $(".place__name", panel).textContent = pl.name;
    $(".place__deva", panel).textContent = pl.deva;
    $(".place__text", panel).textContent = pl.text;
    panel.hidden = false;
    if (!reduced) {
      gsap.fromTo(
        panel,
        { autoAlpha: 0, x: desktop() ? 30 : 0, y: desktop() ? 0 : 40, yPercent: desktop() ? -50 : 0 },
        { autoAlpha: 1, x: 0, y: 0, duration: 0.7, ease: "expo.out" },
      );
    }
    sound.chime(pl.id === "lanka" ? 174.6 : 349.2, 0.12);
    // Lean the map toward the chosen place.
    if (desktop() && !reduced) {
      const [x, y] = P(pl.lon, pl.lat);
      gsap.to(plane, { rotateX: 20 + (y / VH) * 8, rotateZ: -3 + (x / VW - 0.5) * 6, duration: 1.2, ease: "power3.out" });
    }
  }
  const close = () => {
    panel.hidden = true;
    $(".place__media", panel).innerHTML = "";
    current?.setAttribute("aria-pressed", "false");
    current?.focus({ preventScroll: true });
    current = null;
  };
  $(".place__close", panel).addEventListener("click", close);
  addEventListener("keydown", (e) => e.key === "Escape" && !panel.hidden && close());
  // The panel floats over the viewport, so it leaves when the map does.
  ScrollTrigger.create({
    trigger: s,
    start: "top bottom",
    end: "bottom top",
    onLeave: () => !panel.hidden && close(),
    onLeaveBack: () => !panel.hidden && close(),
  });

  const draw = (p: number) => {
    const r = range(p, 0, 0.72);
    const l = range(p, 0.72, 0.86);
    const st = range(p, 0.86, 1);
    drawRoute(r);
    drawLeap(l);
    drawSetu(st);
    PLACES.forEach((pl, i) => {
      const k = reach[pl.id] ?? 1;
      pins[i].style.opacity = String(range(p, k - 0.02, k + 0.04));
    });
    map.dataset.state = p >= 0.999 ? "ready" : "drawing";
  };

  reveal($$(".road__head > *", s), $(".road__head", s));
  if (reduced) {
    draw(1);
    return;
  }
  draw(0);
  ScrollTrigger.create({
    trigger: map,
    start: "top 72%",
    end: desktop() ? "center 45%" : "bottom 90%",
    scrub: 0.6,
    onUpdate: (self) => draw(self.progress),
  });

  if (!coarse) {
    map.addEventListener("pointermove", (e) => {
      if (current) return;
      const r = map.getBoundingClientRect();
      const nx = (e.clientX - r.left) / r.width - 0.5;
      const ny = (e.clientY - r.top) / r.height - 0.5;
      gsap.to(plane, { rotateX: 24 - ny * 6, rotateZ: -3 + nx * 4, duration: 1.4, ease: "power3.out", overwrite: "auto" });
    });
  }
}
