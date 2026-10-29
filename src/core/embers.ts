import { dpr, reduced } from "./env";

interface Ember {
  x: number; y: number; vx: number; vy: number;
  r: number; life: number; max: number; hue: number; tw: number;
}

/** Rising embers on a transparent canvas. `intensity` scales count and speed. */
export class Embers {
  private ctx: CanvasRenderingContext2D;
  private list: Ember[] = [];
  private raf = 0;
  private w = 0;
  private h = 0;
  intensity = 1;
  running = false;

  constructor(private canvas: HTMLCanvasElement, private base = 70, private palette: [number, number] = [18, 42]) {
    this.ctx = canvas.getContext("2d")!;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  private resize() {
    const r = dpr();
    this.w = this.canvas.clientWidth;
    this.h = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.w * r);
    this.canvas.height = Math.round(this.h * r);
    this.ctx.setTransform(r, 0, 0, r, 0, 0);
  }

  private spawn(anywhere = false): Ember {
    const max = 4 + Math.random() * 6;
    return {
      x: Math.random() * this.w,
      y: anywhere ? Math.random() * this.h : this.h + 10,
      vx: (Math.random() - 0.5) * 12,
      vy: -(14 + Math.random() * 38),
      r: 0.6 + Math.random() * 1.8,
      life: anywhere ? Math.random() * max : 0,
      max,
      hue: this.palette[0] + Math.random() * (this.palette[1] - this.palette[0]),
      tw: Math.random() * Math.PI * 2,
    };
  }

  start() {
    if (this.running || reduced) return;
    this.running = true;
    if (!this.list.length) for (let i = 0; i < this.base; i++) this.list.push(this.spawn(true));
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      this.step(dt, now / 1000);
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  private step(dt: number, t: number) {
    const { ctx } = this;
    ctx.clearRect(0, 0, this.w, this.h);
    const target = Math.round(this.base * this.intensity);
    while (this.list.length < target) this.list.push(this.spawn());
    ctx.globalCompositeOperation = "lighter";
    for (let i = this.list.length - 1; i >= 0; i--) {
      const e = this.list[i];
      e.life += dt;
      const speed = 0.6 + this.intensity * 0.6;
      e.x += (e.vx + Math.sin(t * 0.7 + e.tw) * 10) * dt * speed;
      e.y += e.vy * dt * speed;
      const k = e.life / e.max;
      if (k >= 1 || e.y < -20) {
        if (this.list.length > target) this.list.splice(i, 1);
        else this.list[i] = this.spawn();
        continue;
      }
      const a = Math.sin(Math.PI * k) * (0.55 + 0.45 * Math.sin(t * 6 + e.tw));
      const g = ctx.createRadialGradient(e.x, e.y, 0, e.x, e.y, e.r * 5);
      g.addColorStop(0, `hsla(${e.hue}, 100%, 72%, ${a})`);
      g.addColorStop(0.3, `hsla(${e.hue - 8}, 100%, 55%, ${a * 0.45})`);
      g.addColorStop(1, `hsla(${e.hue - 14}, 100%, 40%, 0)`);
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(e.x, e.y, e.r * 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalCompositeOperation = "source-over";
  }
}
