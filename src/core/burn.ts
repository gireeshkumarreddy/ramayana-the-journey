import { dpr } from "./env";

/**
 * Rāvaṇa's transition: one frame burns away into the next along a rising,
 * fractal edge of fire. Used only in his act.
 */
const VERT = `
attribute vec2 p;
varying vec2 uv;
void main() { uv = p * 0.5 + 0.5; gl_Position = vec4(p, 0.0, 1.0); }`;

const FRAG = `
precision mediump float;
uniform sampler2D a, b;
uniform vec2 res, sa, sb;
uniform float prog, time;
varying vec2 uv;

vec2 cover(vec2 q, vec2 s) {
  float rs = res.x / res.y, ri = s.x / s.y;
  vec2 k = rs < ri ? vec2(rs / ri, 1.0) : vec2(1.0, ri / rs);
  return (q - 0.5) * k + 0.5;
}
float hash(vec2 q) { return fract(sin(dot(q, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 q) {
  vec2 i = floor(q), f = fract(q), u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
float fbm(vec2 q) { float v = 0.0, w = 0.5; for (int i = 0; i < 5; i++) { v += w * noise(q); q *= 2.03; w *= 0.5; } return v; }

void main() {
  vec3 A = texture2D(a, cover(uv, sa)).rgb;
  vec3 B = texture2D(b, cover(uv, sb)).rgb;
  vec2 q = uv * vec2(res.x / res.y, 1.0) * 2.6;
  float n = fbm(q + vec2(0.0, -time * 0.08)) * 0.75 + uv.y * 0.35;
  float t = prog * 1.45 - 0.2;
  float d = n - t;
  float keep = smoothstep(0.0, 0.035, d);
  vec3 col = mix(B, A * (1.0 - 0.75 * smoothstep(0.12, 0.0, d)), keep);
  float rim = smoothstep(0.03, 0.0, abs(d)) * step(0.001, prog) * step(prog, 0.999);
  float ash = smoothstep(0.07, 0.0, abs(d)) * step(0.001, prog) * step(prog, 0.999);
  col = mix(col, col * vec3(0.35, 0.18, 0.12), ash * 0.6);
  col += vec3(1.0, 0.4, 0.07) * rim * 1.25 + vec3(1.0, 0.86, 0.55) * pow(rim, 8.0) * 1.1;
  gl_FragColor = vec4(col, 1.0);
}`;

export class Burn {
  private gl: WebGLRenderingContext;
  private tex: WebGLTexture[] = [];
  private u: Record<string, WebGLUniformLocation | null> = {};
  private posters: HTMLImageElement[] = [];
  value = 0;

  static supported() {
    try {
      return !!document.createElement("canvas").getContext("webgl");
    } catch {
      return false;
    }
  }

  constructor(private canvas: HTMLCanvasElement, private sources: HTMLVideoElement[]) {
    const gl = canvas.getContext("webgl", { premultipliedAlpha: false, antialias: false })!;
    this.gl = gl;
    const sh = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const p = gl.createProgram()!;
    gl.attachShader(p, sh(gl.VERTEX_SHADER, VERT));
    gl.attachShader(p, sh(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(p);
    gl.useProgram(p);
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
    const loc = gl.getAttribLocation(p, "p");
    gl.enableVertexAttribArray(loc);
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
    for (const n of ["a", "b", "res", "sa", "sb", "prog", "time"]) this.u[n] = gl.getUniformLocation(p, n);
    gl.uniform1i(this.u.a, 0);
    gl.uniform1i(this.u.b, 1);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    for (let i = 0; i < 2; i++) {
      const t = gl.createTexture()!;
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      this.tex.push(t);
    }
    // Posters stand in until each video has a frame to give.
    this.posters = sources.map((v) => {
      const img = new Image();
      img.src = v.poster;
      return img;
    });
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  private resize() {
    const r = Math.min(dpr(), 1.25);
    this.canvas.width = Math.round(this.canvas.clientWidth * r);
    this.canvas.height = Math.round(this.canvas.clientHeight * r);
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height);
  }

  private upload(unit: number, i: number): [number, number] {
    const gl = this.gl;
    const v = this.sources[i];
    const img = this.posters[i];
    gl.activeTexture(unit === 0 ? gl.TEXTURE0 : gl.TEXTURE1);
    gl.bindTexture(gl.TEXTURE_2D, this.tex[unit]);
    if (v.readyState >= 2 && v.videoWidth) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, v);
      return [v.videoWidth, v.videoHeight];
    }
    if (img.complete && img.naturalWidth) {
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, img);
      return [img.naturalWidth, img.naturalHeight];
    }
    return [16, 9];
  }

  render(time: number) {
    const gl = this.gl;
    const max = this.sources.length - 1;
    const v = Math.min(Math.max(this.value, 0), max);
    const i = Math.min(Math.floor(v), max - 1);
    const f = v - i;
    const sa = this.upload(0, i);
    const sb = this.upload(1, i + 1);
    gl.uniform2f(this.u.res, this.canvas.width, this.canvas.height);
    gl.uniform2f(this.u.sa, sa[0], sa[1]);
    gl.uniform2f(this.u.sb, sb[0], sb[1]);
    gl.uniform1f(this.u.prog, f);
    gl.uniform1f(this.u.time, time);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
  }
}
