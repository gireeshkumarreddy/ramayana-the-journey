/**
 * A painted trail: a soft luminous body, dry-brush bristle streaks that break
 * and rejoin, gold dust flowing along it toward where it leads, and a bright
 * spark at its leading edge. Drawn on a 2D canvas, every frame.
 */

export type Pt = { x: number; y: number };
type Sample = { x: number; y: number; nx: number; ny: number; w: number };
type Bristle = { off: number; width: number; alpha: number; dash: number[] };
type Mote = { p: number; o: number; v: number; s: number; tw: number };

export interface TrailStyle {
  /** rgb of the luminous body and dust */
  rgb: [number, number, number];
  /** draw as ink on a light page instead of light on dark */
  ink?: boolean;
}

export const GOLD: TrailStyle = { rgb: [255, 196, 118] };
export const EMBER: TrailStyle = { rgb: [255, 128, 64] };
export const BLOOD: TrailStyle = { rgb: [236, 74, 44] };
export const INK: TrailStyle = { rgb: [34, 22, 12], ink: true };

export function rng(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const stamps = new Map<string, HTMLCanvasElement>();
/** A soft round brush with speckled holes, so the body has grain rather than a clean gradient. */
function stamp(rgb: [number, number, number], ink = false) {
  const key = rgb.join(",") + ink;
  const hit = stamps.get(key);
  if (hit) return hit;
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const g = c.getContext("2d")!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  const [r, gg, b] = rgb;
  grad.addColorStop(0, `rgba(${r},${gg},${b},1)`);
  grad.addColorStop(0.45, `rgba(${r},${gg},${b},${ink ? 0.7 : 0.55})`);
  grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  g.globalCompositeOperation = "destination-out";
  const rand = rng(91);
  for (let i = 0; i < 160; i++) {
    g.globalAlpha = 0.2 + rand() * 0.6;
    g.beginPath();
    g.arc(rand() * 64, rand() * 64, 0.5 + rand() * 2.2, 0, Math.PI * 2);
    g.fill();
  }
  stamps.set(key, c);
  return c;
}

export class Trail {
  private s: Sample[] = [];
  private bristles: Bristle[] = [];
  private motes: Mote[] = [];
  private base = 40;

  /** A cubic Bézier from a to d, resampled evenly, tapering from `base` to `base * tip`. */
  build(a: Pt, b: Pt, c: Pt, d: Pt, base: number, seed: number, tip = 0.16) {
    this.base = base;
    const raw: Pt[] = [];
    for (let i = 0; i <= 600; i++) {
      const t = i / 600;
      const m = 1 - t;
      raw.push({
        x: m * m * m * a.x + 3 * m * m * t * b.x + 3 * m * t * t * c.x + t * t * t * d.x,
        y: m * m * m * a.y + 3 * m * m * t * b.y + 3 * m * t * t * c.y + t * t * t * d.y,
      });
    }
    const len = [0];
    for (let i = 1; i < raw.length; i++) len.push(len[i - 1] + Math.hypot(raw[i].x - raw[i - 1].x, raw[i].y - raw[i - 1].y));
    const total = len[len.length - 1];
    const n = 220;
    this.s = [];
    let j = 0;
    for (let k = 0; k < n; k++) {
      const target = (k / (n - 1)) * total;
      while (j < len.length - 2 && len[j + 1] < target) j++;
      const f = (target - len[j]) / Math.max(1e-6, len[j + 1] - len[j]);
      const x = raw[j].x + (raw[j + 1].x - raw[j].x) * f;
      const y = raw[j].y + (raw[j + 1].y - raw[j].y) * f;
      const dx = raw[j + 1].x - raw[j].x;
      const dy = raw[j + 1].y - raw[j].y;
      const dl = Math.hypot(dx, dy) || 1;
      const q = k / (n - 1);
      // Wide where we stand, narrowing as it recedes toward the window: a road into depth.
      const w = base * (tip + (1 - tip) * Math.pow(1 - q, 1.35));
      this.s.push({ x, y, nx: -dy / dl, ny: dx / dl, w });
    }
    const r = rng(seed);
    this.bristles = Array.from({ length: 11 }, (_, i) => {
      const dash: number[] = [];
      for (let k = 0; k < 14; k++) dash.push(18 + r() * 140, 2 + r() * 30);
      return { off: (i / 10 - 0.5) * 0.9 + (r() - 0.5) * 0.06, width: 0.6 + r() * 1.8, alpha: 0.18 + r() * 0.5, dash };
    });
    this.motes = Array.from({ length: 170 }, () => ({ p: r(), o: (r() - 0.5) * 1.6, v: 0.04 + r() * 0.1, s: 0.6 + r() * 2.2, tw: r() * 6.28 }));
  }

  /**
   * reveal: 0..1 along the path. scale/cx/cy: the world's zoom about the window centre.
   */
  draw(ctx: CanvasRenderingContext2D, reveal: number, scale: number, cx: number, cy: number, time: number, dt: number, style: TrailStyle, alpha = 1) {
    const S = this.s;
    if (!S.length || reveal <= 0 || alpha <= 0) return;
    const n = S.length;
    const k = Math.max(1, Math.min(n - 1, Math.floor(reveal * (n - 1))));
    const X = (p: { x: number }) => cx + (p.x - cx) * scale;
    const Y = (p: { y: number }) => cy + (p.y - cy) * scale;
    const [r, g, b] = style.rgb;
    const brush = stamp(style.rgb, style.ink);

    ctx.save();
    // 1. A shadow bed so light reads even over bright footage
    if (!style.ink) {
      ctx.globalCompositeOperation = "source-over";
      const shade = stamp([0, 0, 0]);
      for (let j = 0; j <= k; j += 2) {
        const p = S[j];
        const size = p.w * scale * 2.2;
        ctx.globalAlpha = 0.07 * alpha;
        ctx.drawImage(shade, X(p) - size / 2, Y(p) - size / 2, size, size);
      }
    }

    // 2. The body: overlapping grained stamps
    ctx.globalCompositeOperation = style.ink ? "source-over" : "lighter";
    for (let j = 0; j <= k; j++) {
      const p = S[j];
      const wob = 0.82 + 0.18 * Math.sin(j * 0.71 + 1.3) * Math.sin(j * 0.23);
      const size = p.w * scale * 1.15 * wob;
      ctx.globalAlpha = (style.ink ? 0.11 : 0.055) * alpha;
      ctx.drawImage(brush, X(p) - size / 2, Y(p) - size / 2, size, size);
    }

    // 3. Dry-brush bristles: broken streaks that converge with the taper
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    for (const br of this.bristles) {
      ctx.globalAlpha = br.alpha * alpha;
      ctx.strokeStyle = style.ink ? `rgb(${r},${g},${b})` : `rgb(${Math.min(255, r + 20)},${Math.min(255, g + 40)},${Math.min(255, b + 60)})`;
      ctx.lineWidth = br.width * scale * Math.max(0.5, S[0].w / this.base);
      ctx.setLineDash(br.dash.map((v) => v * scale));
      ctx.beginPath();
      for (let j = 0; j <= k; j++) {
        const p = S[j];
        const o = br.off * p.w;
        const x = X({ x: p.x + p.nx * o });
        const y = Y({ y: p.y + p.ny * o });
        j ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // 4. Dust flowing along the trail toward where it leads
    if (!style.ink) {
      ctx.globalCompositeOperation = "lighter";
      for (const m of this.motes) {
        m.p += m.v * dt;
        if (m.p > 1) m.p -= 1;
        const q = m.p * reveal;
        const i = Math.floor(q * (n - 1));
        const p = S[i];
        const o = m.o * p.w * 0.6;
        const tw = 0.45 + 0.55 * Math.sin(time * 5 + m.tw);
        const x = X({ x: p.x + p.nx * o });
        const y = Y({ y: p.y + p.ny * o });
        const size = m.s * scale * (0.5 + p.w / this.base);
        ctx.globalAlpha = tw * alpha * 0.9;
        ctx.fillStyle = `rgb(255,${Math.min(255, g + 50)},${Math.min(255, b + 90)})`;
        ctx.fillRect(x - size / 2, y - size / 2, size, size);
      }
    } else {
      // Ink spatters beside the stroke
      const rand = rng(7);
      ctx.fillStyle = `rgb(${r},${g},${b})`;
      for (let i = 0; i < 70; i++) {
        // Every random draw happens before the reveal test, so spatters never shuffle as the ink grows.
        const j = Math.floor(rand() * (n - 1));
        const side = rand() - 0.5;
        const rad = (0.6 + rand() * 2.6) * scale;
        const spread = 1.1 + rand() * 1.4;
        const a = 0.3 + rand() * 0.5;
        if (j > k) continue;
        const p = S[j];
        const o = side * p.w * spread;
        ctx.globalAlpha = a * alpha;
        ctx.beginPath();
        ctx.arc(X({ x: p.x + p.nx * o }), Y({ y: p.y + p.ny * o }), rad, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // 5. The leading spark
    if (reveal < 0.999) {
      const p = S[k];
      const rad = Math.max(10, p.w * scale * 1.6);
      ctx.globalCompositeOperation = "lighter";
      ctx.globalAlpha = alpha;
      const glow = ctx.createRadialGradient(X(p), Y(p), 0, X(p), Y(p), rad);
      const hot = style.ink ? "255,150,70" : "255,236,200";
      glow.addColorStop(0, `rgba(${hot},0.95)`);
      glow.addColorStop(0.25, `rgba(${r},${g},${b},0.5)`);
      glow.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(X(p), Y(p), rad, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

/**
 * A torn opening, in fractions of the viewport, pushed slightly past the edges
 * so it vanishes off-screen once it has grown to fill the frame.
 */
export function tornRect(seed: number): [number, number][] {
  const r = rng(seed);
  const N = 30;
  const amp = 0.04;
  const ph = [r() * 6, r() * 6, r() * 6, r() * 6, r() * 6];
  const wob = (t: number, k: number) => 0.5 + 0.32 * Math.sin(t * 6.3 + ph[k]) + 0.18 * Math.sin(t * 17.1 + ph[k + 1]);
  const j = (t: number, k: number) => amp * (0.6 * wob(t, k) + 0.4 * r());
  const lo = -0.03;
  const hi = 1.03;
  const span = hi - lo;
  const pts: [number, number][] = [];
  for (let i = 0; i <= N; i++) pts.push([lo + (i / N) * span, lo + j(i / N, 0)]);
  for (let i = 1; i <= N; i++) pts.push([hi - j(i / N, 1), lo + (i / N) * span]);
  for (let i = 1; i <= N; i++) pts.push([hi - (i / N) * span, hi - j(i / N, 2)]);
  for (let i = 1; i < N; i++) pts.push([lo + j(i / N, 3), hi - (i / N) * span]);
  return pts;
}

export const toClip = (pts: [number, number][]) =>
  `polygon(${pts.map(([x, y]) => `${(x * 100).toFixed(2)}% ${(y * 100).toFixed(2)}%`).join(",")})`;
