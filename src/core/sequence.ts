import { clamp, dpr } from "./env";

/**
 * A scroll-scrubbed image sequence drawn into a canvas with object-fit: cover.
 * Frames load coarse-to-fine (every 8th, then 4th, 2nd, all) so scrubbing works
 * almost immediately and sharpens as the rest arrive.
 */
export class FrameSequence {
  private frames: (HTMLImageElement | null)[];
  private ctx: CanvasRenderingContext2D;
  private drawn = -1;
  private want = 0;
  private started = false;
  private fx = 0.5;
  private ro: ResizeObserver;

  constructor(private canvas: HTMLCanvasElement, private id: string, private count: number) {
    this.frames = new Array(count).fill(null);
    this.ctx = canvas.getContext("2d", { alpha: false })!;
    const fx = getComputedStyle(canvas).getPropertyValue("--fx").trim();
    if (fx.endsWith("%")) this.fx = parseFloat(fx) / 100;
    this.ro = new ResizeObserver(() => this.resize());
    this.ro.observe(canvas);
  }

  private src(i: number) {
    return `/media/seq/${this.id}/${String(i + 1).padStart(3, "0")}.webp`;
  }

  /** Begin loading. The first frame is awaited so the canvas is never blank. */
  async start() {
    if (this.started) return;
    this.started = true;
    await this.fetch(0);
    this.draw(true);
    const order: number[] = [];
    for (const stride of [8, 4, 2, 1]) {
      for (let i = 0; i < this.count; i += stride) if (!order.includes(i)) order.push(i);
    }
    // A few parallel lanes keep the network busy without flooding it.
    let next = 0;
    const lane = async () => {
      while (next < order.length) {
        const i = order[next++];
        if (!this.frames[i]) await this.fetch(i);
        if (Math.abs(i - this.want) < 8) this.draw();
      }
    };
    await Promise.all([lane(), lane(), lane(), lane()]);
  }

  private fetch(i: number) {
    return new Promise<void>((res) => {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => {
        this.frames[i] = img;
        res();
      };
      img.onerror = () => res();
      img.src = this.src(i);
    });
  }

  private resize() {
    const r = dpr();
    const w = Math.round(this.canvas.clientWidth * r);
    const h = Math.round(this.canvas.clientHeight * r);
    if (w && h && (this.canvas.width !== w || this.canvas.height !== h)) {
      this.canvas.width = w;
      this.canvas.height = h;
      this.draw(true);
    }
  }

  /** progress 0..1 */
  set(p: number) {
    this.want = Math.round(clamp(p) * (this.count - 1));
    this.draw();
  }

  private nearest(i: number) {
    if (this.frames[i]) return i;
    for (let d = 1; d < this.count; d++) {
      if (this.frames[i - d]) return i - d;
      if (this.frames[i + d]) return i + d;
    }
    return -1;
  }

  private draw(force = false) {
    const i = this.nearest(this.want);
    if (i < 0 || (i === this.drawn && !force)) return;
    const img = this.frames[i]!;
    const { width: cw, height: ch } = this.canvas;
    if (!cw || !ch) return;
    const s = Math.max(cw / img.naturalWidth, ch / img.naturalHeight);
    const w = img.naturalWidth * s;
    const h = img.naturalHeight * s;
    this.ctx.drawImage(img, (cw - w) * this.fx, (ch - h) / 2, w, h);
    this.drawn = i;
  }
}
