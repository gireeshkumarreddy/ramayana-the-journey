import { dpr, lerp, range, smooth } from "./env";

/**
 * Sundara Kāṇḍa, rendered: a moonlit ocean whose waves mirror the sky, Mount Mahendra
 * on the shore, Laṅkā on the horizon, and Hanumān's leap as a saffron comet.
 * One fragment shader, driven by a single progress value.
 */

const VERT = `
attribute vec2 a;
varying vec2 vUv;
void main() { vUv = a * 0.5 + 0.5; gl_Position = vec4(a, 0.0, 1.0); }`;

const FRAG = `
precision highp float;
varying vec2 vUv;
uniform vec2 uRes;
uniform float uTime, uWhite, uFire, uGrow, uLeap, uLaunch;
uniform vec2 uMoon, uLanka, uA, uB, uC;
uniform vec3 uMount;

#define H0 -0.06

float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 p) { float v = 0.0, w = 0.5; for (int i = 0; i < 5; i++) { v += w * noise(p); p = p * 2.03 + vec2(1.7, 9.2); w *= 0.5; } return v; }

vec2 arc(float t) { float m = 1.0 - t; return m * m * uA + 2.0 * m * t * uB + t * t * uC; }

// Hanumān: a white-hot head, a long saffron tail, bloom and an anamorphic flare.
vec3 comet(vec2 p) {
  vec3 col = vec3(0.0);
  float size = uLaunch > 0.5 ? 1.0 : uGrow;
  if (size <= 0.0) return col;
  vec2 head = arc(uLeap);
  if (uLaunch > 0.5) {
    // A continuous tail: dense enough that neighbouring samples overlap into one stroke.
    for (int i = 0; i < 44; i++) {
      float k = float(i) / 43.0;
      float t = uLeap - k * 0.34;
      if (t < 0.0) break;
      vec2 q = arc(t);
      float d = length(p - q);
      float w = 0.0032 + k * 0.009;
      col += vec3(1.0, 0.52, 0.16) * pow(1.0 - k, 1.4) * exp(-d * d / (w * w)) * 0.3;
    }
  }
  float dh = length(p - head);
  col += vec3(1.0, 0.93, 0.82) * exp(-dh * dh / (0.00003 * size + 1e-6)) * 2.2 * size;
  col += vec3(1.0, 0.58, 0.22) * 0.012 * size / (dh * dh * 70.0 + 0.012);
  col += vec3(1.0, 0.7, 0.42) * exp(-abs(p.y - head.y) * 170.0) * exp(-abs(p.x - head.x) * 2.6) * 0.4 * size;
  return col;
}

vec3 sky(vec2 q, float mirrored) {
  float h = max(q.y - H0, 0.0);
  vec3 col = mix(vec3(0.12, 0.12, 0.24), vec3(0.01, 0.014, 0.042), smoothstep(0.0, 0.55, h));
  col += vec3(0.09, 0.08, 0.13) * exp(-h * 16.0);

  // Stars, left out of the reflection where they would only read as noise
  vec2 g = floor(q * 260.0);
  float st = hash(g);
  col += vec3(0.95, 0.9, 0.8) * step(0.9965, st) * (0.6 + 0.4 * sin(uTime * 3.0 + st * 40.0)) * smoothstep(0.02, 0.2, h) * (1.0 - mirrored);

  // Thin cloud bands, lit silver near the moon
  float dm = length(q - uMoon);
  float c = fbm(vec2(q.x * 1.3 + uTime * 0.008, q.y * 4.5));
  c = smoothstep(0.5, 0.86, c) * smoothstep(0.02, 0.14, h) * (1.0 - smoothstep(0.36, 0.62, h));
  vec3 lit = mix(vec3(0.15, 0.16, 0.25), vec3(0.64, 0.64, 0.72), exp(-dm * 3.2));
  col = mix(col, lit, c * 0.55);

  // The moon
  float disk = smoothstep(0.055, 0.0525, dm);
  col += vec3(0.98, 0.94, 0.84) * disk * (0.84 + 0.16 * fbm(q * 40.0)) * (1.0 - c * 0.6);
  col += vec3(0.9, 0.85, 0.7) * 0.0175 / (dm * dm * 30.0 + 0.05);

  // Laṅkā: a dark island ridge pricked with lamps; when it burns, fire and smoke
  float lx = (q.x - uLanka.x) / uLanka.y;
  float span = exp(-lx * lx * 9.0);
  vec3 cityGlow = mix(vec3(1.0, 0.72, 0.38), vec3(1.0, 0.3, 0.05), uFire);
  float glow = exp(-lx * lx * 6.0) * exp(-h * (16.0 / uLanka.y));
  col += cityGlow * glow * (0.12 + 0.12 * uLanka.y + uFire * 1.5);
  float ridge = H0 + uLanka.y * span * (0.012 + 0.016 * fbm(vec2(q.x * 40.0 / uLanka.y, 2.0)));
  if (uFire > 0.0) {
    // Smoke: heavy plumes leaning with the wind, lit orange from beneath
    float sm = fbm(vec2(q.x * 5.0 / uLanka.y + q.y * 1.2, (q.y - uTime * 0.04) * 3.2));
    float column = exp(-lx * lx * 3.5) * smoothstep(ridge, ridge + 0.12 * uLanka.y, q.y) * (1.0 - smoothstep(0.3, 0.75, h));
    vec3 smoke = vec3(0.04, 0.025, 0.022) + cityGlow * 0.35 * exp(-(q.y - ridge) * 9.0 / uLanka.y);
    col = mix(col, smoke, smoothstep(0.4, 0.75, sm) * column * uFire);
    // Flames: tongues that climb off the ridge and thin out as they rise
    float above = (q.y - ridge) / (0.1 * uLanka.y);
    if (above > 0.0 && above < 1.0) {
      float fl = fbm(vec2(q.x * 26.0 / uLanka.y, q.y * 16.0 / uLanka.y - uTime * 2.2));
      float tongue = smoothstep(0.42 + above * 0.4, 0.86, fl) * (1.0 - above) * span;
      col += mix(vec3(1.0, 0.82, 0.45), vec3(0.95, 0.22, 0.04), above) * tongue * uFire * 2.4;
    }
  }
  if (q.y < ridge && span > 0.04) {
    vec2 lg = floor(vec2(q.x * 420.0, q.y * 620.0));
    float lamp = step(0.92, hash(lg)) * span * (0.6 + 0.4 * sin(uTime * 4.0 + hash(lg) * 30.0));
    vec3 land = vec3(0.012, 0.009, 0.014) + cityGlow * lamp * (0.9 + uFire * 2.0);
    float fl = fbm(vec2(q.x * 30.0 / uLanka.y, q.y * 22.0 - uTime * 2.6));
    land += vec3(1.0, 0.45, 0.1) * uFire * smoothstep(0.55, 0.9, fl) * span * 2.2;
    col = land;
  }
  return col;
}

vec3 ocean(vec2 p) {
  float dy = H0 - p.y;
  float z = 0.06 / dy;
  vec2 w = vec2(p.x * z, z);
  float t = uTime;
  vec2 d1 = normalize(vec2(0.3, 1.0)), d2 = normalize(vec2(-0.6, 1.0)), d3 = normalize(vec2(0.9, 0.4));
  vec2 g = d1 * cos(dot(d1, w) * 9.0 + t * 1.2) * 0.9
         + d2 * cos(dot(d2, w) * 14.0 + t * 1.6) * 0.6
         + d3 * cos(dot(d3, w) * 23.0 + t * 2.1) * 0.35;
  g += (vec2(fbm(w * 30.0 + t * 0.4), fbm(w * 30.0 + 7.0 - t * 0.35)) - 0.5) * 1.6;
  vec2 n = g * clamp(dy * 6.0, 0.0, 1.0);

  // The sea mirrors the sky, broken by its own surface
  vec2 rq = vec2(p.x + n.x * 0.035, H0 + dy * 0.85 + n.y * 0.035 * (0.3 + dy * 2.0));
  vec3 refl = sky(rq, 1.0) + comet(rq) * 0.7;
  float fres = 0.16 + 0.84 * pow(1.0 - clamp(dy * 1.6, 0.0, 1.0), 4.0);
  vec3 col = mix(vec3(0.006, 0.012, 0.03), refl, fres);

  // Glitter on the moon's path, and on the burning city's
  float sparkle = pow(clamp((fbm(w * 60.0 + t) - 0.42) * 2.6, 0.0, 1.0), 3.0);
  float mx = p.x - uMoon.x;
  float lane = exp(-mx * mx / (0.0025 + dy * dy * 0.35));
  col += vec3(1.0, 0.95, 0.85) * lane * (sparkle * 2.2 + 0.06);
  // Wave crests catch a faint sheen of the sky
  col += vec3(0.05, 0.06, 0.1) * smoothstep(0.3, 1.2, length(n)) * fres;
  float lx = (p.x - uLanka.x) / uLanka.y;
  col += vec3(1.0, 0.4, 0.1) * uFire * exp(-lx * lx * 8.0) * sparkle * 2.2 * exp(-dy * 4.0);
  return mix(col, vec3(0.1, 0.1, 0.18), exp(-dy * 30.0) * 0.6);
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(uRes.x / uRes.y, 1.0);
  vec3 col = p.y > H0 ? sky(p, 0.0) : ocean(p);

  // Mount Mahendra: a broken massif that runs off the left of frame and falls in
  // ragged shoulders to the shore, with a lesser summit behind the main one.
  float x = p.x - uMount.x;
  float w = uMount.z;
  float fall = x > 0.0 ? pow(x / w, 1.15) * 0.62 : pow(-x / (w * 2.4), 1.5) * 0.3;
  float prof = uMount.y - fall;
  prof += 0.05 * exp(-pow((x + w * 0.55) / (w * 0.22), 2.0)) - 0.03 * exp(-pow((x - w * 0.42) / (w * 0.18), 2.0));
  prof += (fbm(vec2(p.x * 5.0, 3.1)) - 0.5) * 0.07 + (fbm(vec2(p.x * 26.0, 7.7)) - 0.5) * 0.018;
  float m = smoothstep(prof + 0.002, prof - 0.002, p.y);
  float rim = smoothstep(0.01, 0.0, prof - p.y) * m;
  // A little moonlit texture on the rock faces turned toward the sky
  float face = fbm(p * vec2(18.0, 30.0)) * smoothstep(0.25, 0.0, prof - p.y);
  col = mix(col, vec3(0.008, 0.008, 0.015) + vec3(0.03, 0.03, 0.045) * face, m) + vec3(0.3, 0.3, 0.38) * rim * 0.22;

  col += comet(p);

  col = col / (1.0 + col) * 1.18;
  vec2 v = vUv - 0.5;
  col *= 1.0 - dot(v, v) * 0.9;
  col = pow(col, vec3(0.92));
  gl_FragColor = vec4(mix(col, vec3(1.0, 0.98, 0.94), uWhite), 1.0);
}`;

export class Sea {
  private gl: WebGLRenderingContext;
  private u: Record<string, WebGLUniformLocation | null> = {};
  private raf = 0;
  /** Story progress through the chapter, 0..1 */
  p = 0;

  static supported() {
    try {
      return !!document.createElement("canvas").getContext("webgl");
    } catch {
      return false;
    }
  }

  constructor(private canvas: HTMLCanvasElement, private quality = 0.75) {
    const gl = canvas.getContext("webgl", { antialias: false, alpha: false })!;
    this.gl = gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) console.error(gl.getShaderInfoLog(s));
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(prog, "a");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ["uRes", "uTime", "uWhite", "uFire", "uGrow", "uLeap", "uLaunch", "uMoon", "uLanka", "uA", "uB", "uC", "uMount"]) {
      this.u[n] = gl.getUniformLocation(prog, n);
    }
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  private resize() {
    const r = Math.min(dpr(), 1) * this.quality;
    this.canvas.width = Math.max(2, Math.round(this.canvas.clientWidth * r));
    this.canvas.height = Math.max(2, Math.round(this.canvas.clientHeight * r));
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  render(time: number) {
    const { gl, u } = this;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const a = W / H;
    const narrow = Math.min(1, a / 1.2);
    const p = this.p;
    const cam = smooth(range(p, 0.25, 0.85));
    const lankaX = lerp(0.34, 0.12, cam) * a;
    const lankaS = lerp(0.6, 1.8, cam) * Math.max(0.55, narrow);
    const peakX = lerp(-0.3, -0.95, cam) * a;
    const peakY = -0.06 + 0.24 * Math.max(0.7, narrow);
    const A: [number, number] = [peakX, peakY + 0.008];
    const C: [number, number] = [lankaX, -0.06 + 0.02 * lankaS];
    const leap = smooth(range(p, 0.4, 0.82));

    gl.uniform2f(u.uRes, W, H);
    gl.uniform1f(u.uTime, time);
    gl.uniform1f(u.uWhite, 1 - range(p, 0, 0.05));
    gl.uniform1f(u.uFire, range(p, 0.84, 0.97));
    gl.uniform1f(u.uGrow, leap >= 1 ? 0 : range(p, 0.24, 0.4));
    gl.uniform1f(u.uLeap, leap);
    gl.uniform1f(u.uLaunch, leap > 0 && leap < 1 ? 1 : 0);
    gl.uniform2f(u.uMoon, lerp(0.26, 0.1, cam) * a, 0.3);
    gl.uniform2f(u.uLanka, lankaX, lankaS);
    gl.uniform2f(u.uA, A[0], A[1]);
    gl.uniform2f(u.uB, (A[0] + C[0]) / 2, 0.42);
    gl.uniform2f(u.uC, C[0], C[1]);
    gl.uniform3f(u.uMount, peakX, peakY, 0.35 * Math.max(0.7, narrow));
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }

  start() {
    if (this.raf) return;
    const loop = (now: number) => {
      this.render(now / 1000);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }
}
