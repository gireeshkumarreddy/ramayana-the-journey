/**
 * Records a desktop walkthrough of the whole site as a video, with the site's own sound.
 *
 *   npm run dev            (in another terminal)
 *   node tools/record.mjs  [url]
 *
 * Frames come from Chrome's screencast (headless, GPU-accelerated); sound is tapped from
 * the page's Web Audio engine with MediaRecorder. Both carry wall-clock timestamps, so
 * ffmpeg can lay them on one timeline. Output: ramayana-walkthrough.mp4
 */
import { chromium } from "playwright-core";
import { createWriteStream, mkdirSync, openSync, readSync, closeSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";

const URL = process.argv[2] || "http://localhost:5178/";
const W = 1920;
const H = 1080;
const OUT = resolve("ramayana-walkthrough.mp4");
const TMP = resolve("_rec");
mkdirSync(TMP, { recursive: true });
// Every frame goes into one stream file: thousands of small files would each be scanned by the OS.
const STREAM = join(TMP, "frames.mjpeg");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: [
    "--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist",
    "--autoplay-policy=no-user-gesture-required",
    "--disable-renderer-backgrounding", "--disable-background-timer-throttling",
  ],
});
const context = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });

// For the recording only: no scrollbar, no grain overlay (moving noise wastes the encoder's
// bits and the GPU's time), and a quiet ring cursor so the interactions read on screen.
await context.addInitScript(() => {
  addEventListener("DOMContentLoaded", () => {
    const st = document.createElement("style");
    st.textContent = `
      html { scrollbar-width: none; } ::-webkit-scrollbar { display: none; }
      .grain { display: none !important; }
      #rec-cursor { position: fixed; left: -50px; top: -50px; width: 26px; height: 26px; margin: -13px 0 0 -13px;
        border: 1px solid rgba(239,220,174,.9); border-radius: 50%; z-index: 2147483647; pointer-events: none;
        box-shadow: 0 0 14px rgba(216,180,106,.4); opacity: 0; transition: opacity .5s, transform .25s; }
      #rec-cursor::after { content: ""; position: absolute; left: 50%; top: 50%; width: 4px; height: 4px; margin: -2px;
        border-radius: 50%; background: #efdcae; }`;
    document.head.appendChild(st);
    const c = document.createElement("div");
    c.id = "rec-cursor";
    document.body.appendChild(c);
    addEventListener("mousemove", (e) => { c.style.left = e.clientX + "px"; c.style.top = e.clientY + "px"; }, true);
    addEventListener("mousedown", () => (c.style.transform = "scale(.7)"), true);
    addEventListener("mouseup", () => (c.style.transform = ""), true);
  });
});

const page = await context.newPage();
page.on("pageerror", (e) => log("page error:", e.message));
await page.goto(URL, { waitUntil: "load" });
await page.waitForFunction(() => document.querySelector("#gate")?.classList.contains("is-ready"), null, { timeout: 30000 });

// ── Capture ───────────────────────────────────────────────────────
const client = await context.newCDPSession(page);
const frames = [];
const out = createWriteStream(STREAM);
let offset = 0;
client.on("Page.screencastFrame", (e) => {
  client.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
  const buf = Buffer.from(e.data, "base64");
  frames.push({ at: offset, len: buf.length, t: e.metadata.timestamp ?? Date.now() / 1000 });
  offset += buf.length;
  out.write(buf);
});
await client.send("Page.startScreencast", { format: "jpeg", quality: 80, maxWidth: W, maxHeight: H, everyNthFrame: 1 });

// ── Choreography helpers ──────────────────────────────────────────
const cursor = (on) => page.evaluate((on) => (document.getElementById("rec-cursor").style.opacity = on ? "1" : "0"), on);
const top = (sel, dyVh = 0) =>
  page.evaluate(([sel, dy]) => document.querySelector(sel).getBoundingClientRect().top + scrollY + dy * innerHeight, [sel, dyVh]);
const end = (sel, f = 1) =>
  page.evaluate(([sel, f]) => {
    const e = document.querySelector(sel);
    return e.getBoundingClientRect().top + scrollY + Math.max(0, e.offsetHeight - innerHeight) * f;
  }, [sel, f]);

/** Travel to y at a steady speed, easing in and out like a camera move. */
async function glide(y, speed, label) {
  const y0 = await page.evaluate(() => scrollY);
  const dist = Math.abs(y - y0);
  const dur = Math.max(0.9, dist / speed);
  if (label) log(label, `${Math.round(dist)}px in ${dur.toFixed(1)}s`);
  await page.evaluate(
    ([y1, dur]) =>
      new Promise((done) => {
        const L = window.__lenis;
        const y0 = scrollY;
        const D = y1 - y0;
        const a = Math.min(1.1, dur / 4); // ramp time
        const v = D / (dur - a);
        const t0 = performance.now();
        const at = (t) =>
          t < a ? (0.5 * v * t * t) / a : t < dur - a ? 0.5 * v * a + v * (t - a) : D - (0.5 * v * (dur - t) * (dur - t)) / a;
        const step = (now) => {
          const t = Math.min(dur, (now - t0) / 1000);
          L.scrollTo(y0 + at(t), { immediate: true });
          t < dur ? requestAnimationFrame(step) : done();
        };
        requestAnimationFrame(step);
      }),
    [y, dur],
  );
}
async function point(sel, ms = 600) {
  const box = await page.locator(sel).first().boundingBox();
  if (!box) return;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: Math.max(8, Math.round(ms / 16)) });
}

// ── The tour ──────────────────────────────────────────────────────
log("gate");
await page.mouse.move(W / 2, H * 0.78);
await sleep(3200);
await cursor(true);
await point('[data-enter="sound"]', 900);
await sleep(700);
await page.mouse.down();
await page.mouse.up();

// Tap the site's own sound from the moment the visitor chooses it
await sleep(150);
const audioT0 = await page.evaluate(() => {
  const st = window.__sound?.tap();
  if (!st) return null;
  const rec = new MediaRecorder(st, { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 192000 });
  window.__chunks = [];
  rec.ondataavailable = (e) => e.data.size && window.__chunks.push(e.data);
  rec.start(1000);
  window.__rec = rec;
  return performance.timeOrigin + performance.now();
});
await sleep(400);
await cursor(false);
await page.mouse.move(W / 2, H + 40);
log("opening");
await sleep(9600);

await glide(await end("#awakening"), 380, "awakening");
await glide(await end("#gods"), 360, "gods");
await glide(await top("#ayodhya", 0.12), 420, "ayodhya");
await sleep(1300);
await glide(await top(".ayodhya__collage", 0.25), 360);
await glide(await top(".lineage", -0.25), 340);
await sleep(900);

await glide(await end(".boon"), 330, "the boon");
await glide(await end(".conquest"), 350, "conquest");
await glide(await end(".chant"), 320, "the chant");
await sleep(600);
await glide(await top(".faces", 0.1), 420, "ten faces");
await sleep(900);
await cursor(true);
for (const k of [1, 2, 3, 5, 8, 9]) {
  await point(`.faces__list li:nth-child(${k + 1}) button`, 500);
  await sleep(1150);
}
const stage = await page.locator(".faces__stage").boundingBox();
await page.mouse.move(stage.x + stage.width * 0.3, stage.y + stage.height * 0.4, { steps: 30 });
await page.mouse.move(stage.x + stage.width * 0.7, stage.y + stage.height * 0.45, { steps: 90 });
await cursor(false);
await glide(await top(".lanka", 0.05), 420, "lanka");
await sleep(2200);

await glide(await top(".avatar__first", -0.05), 420, "avatar");
await sleep(1600);
await glide(await end(".silhouette"), 290, "silhouette");
await sleep(1600);

await glide(await end("#cast"), 330, "cast");
await sleep(900);
await cursor(true);
await point(".cast__open", 700);
await sleep(400);
await page.mouse.down();
await page.mouse.up();
await sleep(4200);
await page.keyboard.press("Escape");
await sleep(700);
await cursor(false);

await glide(await end("#journey"), 380, "journey");
await glide(await end(".jatayu__flight"), 340, "jatayu");
await glide(await end(".vow"), 300, "vow");
await glide(await end("#sundara"), 320, "sundara");

await glide(await top(".road__head", -0.1), 420, "road");
await sleep(1100);
await glide(await top(".map", 0.42), 230);
await sleep(1500);
await cursor(true);
await point(".pin--lanka .pin__dot", 800);
await page.mouse.down();
await page.mouse.up();
await sleep(3400);
const ayodhya = page.locator(".pin", { hasText: "Ayodhyā" });
const ab = await ayodhya.locator(".pin__dot").boundingBox();
await page.mouse.move(ab.x + ab.width / 2, ab.y + ab.height / 2, { steps: 50 });
await page.mouse.down();
await page.mouse.up();
await sleep(3000);
await page.keyboard.press("Escape");
await sleep(500);
await cursor(false);

await glide(await end("#war"), 330, "war");
await sleep(2600);
await glide(await top(".legacy__return", 0.02), 420, "legacy");
await sleep(2000);
await glide(await top(".legacy__origin", 0.1), 420);
await sleep(3200);
await glide(await top(".tellings", -0.22), 420);
await sleep(3000);
await glide(await end(".finale"), 300, "finale");
await sleep(5000);

// ── Wrap up ───────────────────────────────────────────────────────
await client.send("Page.stopScreencast");
await new Promise((r) => out.end(r));
const audioB64 =
  audioT0 &&
  (await page.evaluate(
    () =>
      new Promise((done) => {
        window.__rec.onstop = async () => {
          const buf = new Uint8Array(await new Blob(window.__chunks).arrayBuffer());
          let s = "";
          for (let i = 0; i < buf.length; i += 0x8000) s += String.fromCharCode(...buf.subarray(i, i + 0x8000));
          done(btoa(s));
        };
        window.__rec.stop();
      }),
  ));
await browser.close();
log(`captured ${frames.length} frames`);

// Resample to a steady 30 fps: each output frame shows the latest capture at that instant.
const FPS = 30;
const t0 = frames[0].t;
const total = frames[frames.length - 1].t - t0 + 1.5;
const span = [];
for (let i = 1; i < frames.length; i++) span.push(frames[i].t - frames[i - 1].t);
log(`average capture rate ${(frames.length / (total - 1.5)).toFixed(1)} fps, longest gap ${Math.max(...span).toFixed(2)}s`);

const args = ["-y", "-v", "error", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FPS), "-i", "-"];
if (audioB64) {
  writeFileSync(join(TMP, "audio.webm"), Buffer.from(audioB64, "base64"));
  args.push("-itsoffset", (audioT0 / 1000 - t0).toFixed(3), "-i", join(TMP, "audio.webm"));
}
const fadeOut = (total - 2).toFixed(2);
args.push(
  "-vf", `format=yuv420p,fade=t=in:st=0:d=1.2,fade=t=out:st=${fadeOut}:d=2`,
  "-c:v", "libx264", "-preset", "medium", "-crf", "20", "-maxrate", "14M", "-bufsize", "28M",
  "-t", total.toFixed(2),
);
if (audioB64) args.push("-af", `afade=t=out:st=${fadeOut}:d=2`, "-c:a", "aac", "-b:a", "192k");
args.push("-movflags", "+faststart", OUT);

log("encoding");
const ff = spawn("ffmpeg", args, { stdio: ["pipe", "inherit", "inherit"] });
const fd = openSync(STREAM, "r");
const read = (f) => {
  const b = Buffer.alloc(f.len);
  readSync(fd, b, 0, f.len, f.at);
  return b;
};
let j = 0;
let cached = -1;
let bytes = null;
for (let k = 0; k * (1 / FPS) <= total; k++) {
  const t = t0 + k / FPS;
  while (j + 1 < frames.length && frames[j + 1].t <= t) j++;
  if (j !== cached) {
    bytes = read(frames[j]);
    cached = j;
  }
  if (!ff.stdin.write(bytes)) await new Promise((r) => ff.stdin.once("drain", r));
}
ff.stdin.end();
closeSync(fd);
await new Promise((r, x) => ff.on("close", (code) => (code === 0 ? r() : x(new Error("ffmpeg exited " + code)))));
log("done", OUT, `${total.toFixed(1)}s`);
