/**
 * Records the site as a shot list and cuts it into a 75-second reel.
 *
 *   npm run dev                      (in another terminal)
 *   node tools/reel.mjs [url]        record every shot, then cut
 *   CUT_ONLY=1 node tools/reel.mjs   re-cut the last saved take
 *   RETAKE=war,lamps node tools/reel.mjs   re-record those shots only, then cut
 *
 * Each chapter is filmed as its own shot at its strongest moment, in a fresh page (a page
 * that has played through the whole site renders far slower). Clips don't loop for the
 * recording: each restarts as its shot begins and plays once. The shots are joined with
 * hard cuts, the site's own sound is crossfaded across each cut, and the last shot absorbs
 * whatever is left so the reel lands on exactly 75.0 seconds. Output: ramayana-reel-75s.mp4
 */
import { chromium } from "playwright-core";
import { createWriteStream, existsSync, mkdirSync, openSync, readFileSync, readSync, closeSync, writeFileSync } from "node:fs";
import { spawn } from "node:child_process";
import { join, resolve } from "node:path";

const URL = process.argv[2] || "http://localhost:5178/";
const W = 1920;
const H = 1080;
const FPS = 30;
const LENGTH = 75.0;
const XF = 0.08; // audio crossfade across each cut
const OUT = resolve("ramayana-reel-75s.mp4");
const TMP = resolve("_rec");
mkdirSync(TMP, { recursive: true });
const STREAM = join(TMP, "reel.mjpeg");
const TAKE = join(TMP, "reel-take.json");
const RETAKE = process.env.RETAKE ? new Set(process.env.RETAKE.split(",")) : null;
const want = (name) => !RETAKE || RETAKE.has(name);
// Seconds to drop from the head of a shot: dead frames before its moment begins.
const HEAD = { ayodhya: 0.6 };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const now = () => Date.now() / 1000;
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

if (!process.env.CUT_ONLY) await record();
await cut();

// ═════════════════════════════════════════════════════════════════
async function record() {
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
  await context.addInitScript(() => {
    // Clips play once: no loop attribute on any video, now or later.
    const once = (v) => {
      v.loop = false;
      v.removeAttribute("loop");
    };
    new MutationObserver((ms) =>
      ms.forEach((m) => m.addedNodes.forEach((n) => {
        if (n instanceof HTMLVideoElement) once(n);
        else if (n instanceof Element) n.querySelectorAll("video").forEach(once);
      })),
    ).observe(document, { childList: true, subtree: true });
    addEventListener("DOMContentLoaded", () => {
      document.querySelectorAll("video").forEach(once);
      const st = document.createElement("style");
      st.textContent = `
        html { scrollbar-width: none; } ::-webkit-scrollbar { display: none; }
        .grain, .skip-intro { display: none !important; }
        #rec-cursor { position: fixed; left: -50px; top: -50px; width: 26px; height: 26px; margin: -13px 0 0 -13px;
          border: 1px solid rgba(239,220,174,.9); border-radius: 50%; z-index: 2147483647; pointer-events: none;
          box-shadow: 0 0 14px rgba(216,180,106,.4); opacity: 0; transition: opacity .35s, transform .2s; }
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

  const prior = RETAKE ? JSON.parse(readFileSync(TAKE, "utf8")) : null;
  const out = createWriteStream(STREAM, { flags: RETAKE ? "a" : "w" });
  const frames = prior ? prior.frames : [];
  const shots = prior ? prior.shots : [];
  let offset = prior ? frames.reduce((m, f) => Math.max(m, f.at + f.len), 0) : 0;
  const keep = (shot) => {
    const i = shots.findIndex((s) => s.name === shot.name);
    i >= 0 ? (shots[i] = shot) : shots.push(shot);
  };
  let page = null;

  // ── Helpers, all acting on the current page ──
  const cursor = (on) => page.evaluate((on) => (document.getElementById("rec-cursor").style.opacity = on ? "1" : "0"), on);
  const T = (sel, dy = 0) =>
    page.evaluate(([sel, dy]) => document.querySelector(sel).getBoundingClientRect().top + scrollY + dy * innerHeight, [sel, dy]);
  const P = (sel, f) =>
    page.evaluate(([sel, f]) => {
      const e = document.querySelector(sel);
      return e.getBoundingClientRect().top + scrollY + Math.max(0, e.offsetHeight - innerHeight) * f;
    }, [sel, f]);
  const jump = async (y, settle) => {
    await page.evaluate((y) => window.__lenis.scrollTo(y, { immediate: true }), y);
    await sleep(settle);
  };
  const glide = (y, dur) =>
    page.evaluate(
      ([y1, dur]) =>
        new Promise((done) => {
          const L = window.__lenis;
          const y0 = scrollY;
          const D = y1 - y0;
          const a = Math.min(0.6, dur / 4);
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
  const rewind = () =>
    page.evaluate(() => {
      document.querySelectorAll("video").forEach((v) => {
        const r = v.getBoundingClientRect();
        const onScreen = r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth;
        if (!onScreen || getComputedStyle(v).visibility === "hidden" || !v.src) return;
        if (!v.paused || v.ended) {
          v.currentTime = 0;
          v.play().catch(() => {});
        }
      });
    });
  const point = async (sel, ms) => {
    const box = await page.locator(sel).first().boundingBox();
    if (box) await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, { steps: Math.max(6, Math.round(ms / 16)) });
  };
  const click = async () => {
    await page.mouse.down();
    await page.mouse.up();
  };

  // ── Page lifecycle ──
  let cdp = null;
  const capture = async (on) => {
    if (on) {
      cdp = await context.newCDPSession(page);
      cdp.on("Page.screencastFrame", (e) => {
        cdp.send("Page.screencastFrameAck", { sessionId: e.sessionId }).catch(() => {});
        const buf = Buffer.from(e.data, "base64");
        frames.push({ at: offset, len: buf.length, t: e.metadata.timestamp ?? now() });
        offset += buf.length;
        out.write(buf);
      });
      await cdp.send("Page.startScreencast", { format: "jpeg", quality: 82, maxWidth: W, maxHeight: H, everyNthFrame: 1 });
    } else {
      await cdp.send("Page.stopScreencast");
      await cdp.detach();
    }
  };
  const open = async () => {
    page = await context.newPage();
    page.on("pageerror", (e) => log("page error:", e.message));
    await page.goto(URL, { waitUntil: "load" });
    await page.waitForFunction(() => document.querySelector("#gate")?.classList.contains("is-ready"), null, { timeout: 30000 });
  };
  /** Choose sound and start recording it; returns the wall-clock time the recording began. */
  const tapSound = () =>
    page.evaluate(() => {
      const st = window.__sound.tap();
      const rec = new MediaRecorder(st, { mimeType: "audio/webm;codecs=opus", audioBitsPerSecond: 192000 });
      window.__chunks = [];
      rec.ondataavailable = (e) => e.data.size && window.__chunks.push(e.data);
      rec.start(500);
      window.__rec = rec;
      return (performance.timeOrigin + performance.now()) / 1000;
    });
  const saveSound = async (name) => {
    const b64 = await page.evaluate(
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
    );
    const file = join(TMP, `reel-audio-${name}.webm`);
    writeFileSync(file, Buffer.from(b64, "base64"));
    return file;
  };
  /** A fresh page, already through the gate with sound at full level. */
  const enter = async () => {
    await open();
    await page.click('[data-enter="sound"]');
    const t = await tapSound();
    await sleep(900);
    await page.evaluate(() => document.querySelector(".skip-intro").click());
    await page.waitForFunction(() => document.querySelector("#awakening").dataset.intro === "done");
    await page.evaluate(() => {
      const s = window.__sound;
      s.master.gain.cancelScheduledValues(0);
      s.master.gain.setValueAtTime(0.75, s.ctx.currentTime);
    });
    return t;
  };
  /** One shot: a fresh page, set up off-camera, filmed only for the action itself. */
  const take = async (name, setup, action) => {
    if (!want(name)) return;
    const audioT0 = await enter();
    await setup();
    await page.mouse.move(W * 0.62, H * 0.6); // park the (hidden) cursor near the action
    await capture(true);
    await sleep(120);
    await rewind();
    const a = now();
    await action();
    const b = now();
    await sleep(XF * 1000 + 200);
    await capture(false);
    const audio = await saveSound(name);
    keep({ name, a, b, audio, audioT0 });
    log(name.padEnd(12), (b - a).toFixed(2) + "s");
    await page.close();
  };

  // ── 1–3. The gate and the cold open, in one continuous page ──
  if (want("opening")) {
  await open();
  await page.mouse.move(W / 2, H + 30);
  await sleep(2600);
  await capture(true);
  await sleep(120);
  const g0 = now();
  await cursor(true);
  await point('[data-enter="sound"]', 800);
  await sleep(380);
  await click();
  const tClick = now();
  const openT0 = await tapSound();
  await sleep(260);
  const g1 = now();
  await cursor(false);
  await page.mouse.move(W / 2, H + 30);
  await sleep(7600);
  await capture(false);
  const openAudio = await saveSound("opening");
  keep({ name: "gate", a: g0, b: g1, audio: openAudio, audioT0: openT0 });
  keep({ name: "feet", a: tClick + 1.35, b: tClick + 3.35, audio: openAudio, audioT0: openT0 });
  keep({ name: "title", a: tClick + 4.55, b: tClick + 7.4, audio: openAudio, audioT0: openT0 });
  log("opening      recorded");
  await page.close();
  }

  // ── 4–22. One fresh page per shot ──
  await take("gods", async () => jump(await P("#gods", 0.1), 2200), async () => glide(await P("#gods", 0.66), 3.0));
  await take("ayodhya", async () => jump(await T("#ayodhya", -0.62), 1400), async () => glide(await T("#ayodhya", 0.92), 3.4));
  await take("boon", async () => jump(await P(".boon", 0.26), 1500), async () => glide(await P(".boon", 0.7), 3.35));
  await take("conquest", async () => jump(await P(".conquest", 0.16), 1800), async () => glide(await P(".conquest", 0.46), 2.6));
  await take("chant", async () => jump(await P(".chant", 0.06), 1500), async () => glide(await P(".chant", 0.9), 4.6));
  await take("faces", async () => jump(await T(".faces", -0.42), 1500), async () => {
    await glide(await T(".faces", 0.1), 1.2);
    await cursor(true);
    for (const k of [3, 10]) {
      await point(`.faces__list li:nth-child(${k}) button`, 260);
      await sleep(620);
    }
  });
  await take("avatar", async () => jump(await T(".avatar__first", 0.02), 2600), async () => glide(await T(".avatar__first", 0.16), 2.0));
  await take("silhouette", async () => jump(await T(".silhouette", -0.04), 1500), async () => glide(await P(".silhouette", 0.92), 3.35));
  await take("cast", async () => jump(await P("#cast", 0), 1600), async () => {
    await glide(await P("#cast", 1), 2.8);
    await cursor(true);
    await point(".cast__open", 260);
    await click();
    await sleep(850);
  });
  await take("journey-1", async () => jump(await P("#journey", 0.015), 1900), async () => glide(await P("#journey", 0.25), 5.35));
  await take("journey-2", async () => jump(await P("#journey", 0.735), 1700), async () => glide(await P("#journey", 0.94), 3.6));
  await take("jatayu", async () => jump(await P(".jatayu__flight", 0), 2400), async () => glide(await P(".jatayu__flight", 0.46), 2.6));
  await take("vow", async () => jump(await P(".vow", 0), 2000), async () => glide(await P(".vow", 0.99), 3.8));
  await take("sundara", async () => jump(await P("#sundara", 0), 1500), async () => glide(await P("#sundara", 0.97), 4.8));
  await take("map", async () => jump(await T(".map", -0.36), 1800), async () => {
    await glide(await T(".map", 0.42), 2.5);
    await cursor(true);
    await point(".pin--lanka .pin__dot", 260);
    await click();
    await sleep(1100);
  });
  await take("war", async () => jump(await P("#war", 0.22), 1800), async () => glide(await P("#war", 0.93), 4.45));
  await take("lamps", async () => jump(await T(".legacy__return", 0.12), 2600), async () => glide(await T(".legacy__return", 0.3), 1.9));
  await take("verse", async () => jump(await T(".legacy__origin", -0.22), 1400), async () => glide(await T(".legacy__origin", 0.12), 1.8));
  await take("finale", async () => jump(await T(".finale", -0.04), 1400), async () => {
    await glide(await P(".finale", 1), 2.6);
    await sleep(3000);
  });

  await new Promise((r) => out.end(r));
  await browser.close();
  writeFileSync(TAKE, JSON.stringify({ frames, shots }));
  log(`captured ${frames.length} frames`);
}

// ═════════════════════════════════════════════════════════════════
async function cut() {
  const { frames, shots } = JSON.parse(readFileSync(TAKE, "utf8"));

  shots.forEach((s) => (s.a += HEAD[s.name] || 0));
  // Whole frames per shot; the last shot takes exactly what's left of 75 seconds.
  const total = Math.round(LENGTH * FPS);
  const counts = shots.map((s) => Math.round((s.b - s.a) * FPS));
  counts[counts.length - 1] = total - counts.slice(0, -1).reduce((x, y) => x + y, 0);
  if (counts[counts.length - 1] < 2 * FPS) throw new Error(`shots run long: only ${counts[counts.length - 1]} frames left for the finale`);
  shots.forEach((s, i) => (s.b = s.a + counts[i] / FPS));
  log(shots.map((s, i) => `${s.name} ${(counts[i] / FPS).toFixed(2)}`).join(" | "));

  // Per-shot capture rate, so a choppy shot is visible before anyone watches the reel.
  shots.forEach((s) => {
    const n = frames.filter((f) => f.t >= s.a && f.t < s.b).length;
    s.fps = n / (s.b - s.a);
  });
  log("capture fps:", shots.map((s) => `${s.name} ${s.fps.toFixed(0)}`).join(" | "));

  const audioFiles = [...new Set(shots.map((s) => s.audio))].filter((f) => f && existsSync(f));
  const args = ["-y", "-v", "error", "-f", "image2pipe", "-c:v", "mjpeg", "-framerate", String(FPS), "-i", "-"];
  audioFiles.forEach((f) => args.push("-i", f));

  // Each shot's sound, extended by the crossfade length so every join stays on its cut.
  const parts = shots.map((s, i) => {
    const len = s.b - s.a + (i < shots.length - 1 ? XF : 0);
    const input = audioFiles.indexOf(s.audio) + 1;
    const start = s.a - s.audioT0;
    if (!input || start + len <= 0) return `anullsrc=r=48000:cl=stereo,atrim=duration=${len.toFixed(3)}[s${i}]`;
    const lead = Math.max(0, -start);
    const body = `[${input}:a]atrim=start=${Math.max(0, start).toFixed(3)}:duration=${(len - lead).toFixed(3)},asetpts=PTS-STARTPTS,aformat=sample_rates=48000:channel_layouts=stereo`;
    return lead > 0
      ? `anullsrc=r=48000:cl=stereo,atrim=duration=${lead.toFixed(3)}[l${i}];${body}[b${i}];[l${i}][b${i}]concat=n=2:v=0:a=1[s${i}]`
      : `${body}[s${i}]`;
  });
  let filter = `[0:v]format=yuv420p,fade=t=in:st=0:d=0.4,fade=t=out:st=${(LENGTH - 0.8).toFixed(2)}:d=0.8[vout];` + parts.join(";");
  let prev = "s0";
  for (let i = 1; i < shots.length; i++) {
    filter += `;[${prev}][s${i}]acrossfade=d=${XF}:c1=qsin:c2=qsin[x${i}]`;
    prev = `x${i}`;
  }
  filter += `;[${prev}]afade=t=out:st=${(LENGTH - 1).toFixed(2)}:d=1,atrim=duration=${LENGTH}[aout]`;
  args.push(
    "-filter_complex", filter, "-map", "[vout]", "-map", "[aout]",
    "-c:v", "libx264", "-preset", "medium", "-crf", "18", "-maxrate", "16M", "-bufsize", "32M",
    "-c:a", "aac", "-b:a", "192k",
    "-r", String(FPS), "-t", LENGTH.toFixed(2), "-movflags", "+faststart", OUT,
  );

  log("cutting");
  const ff = spawn("ffmpeg", args, { stdio: ["pipe", "inherit", "inherit"] });
  const fd = openSync(STREAM, "r");
  let cached = -1;
  let bytes = null;
  for (let i = 0; i < shots.length; i++) {
    // Start from the frame on screen at the shot's first instant.
    let j = frames.findIndex((f) => f.t > shots[i].a) - 1;
    if (j < 0) j = Math.max(0, frames.findIndex((f) => f.t >= shots[i].a));
    for (let k = 0; k < counts[i]; k++) {
      const t = shots[i].a + k / FPS;
      while (j + 1 < frames.length && frames[j + 1].t <= t) j++;
      if (j !== cached) {
        bytes = Buffer.alloc(frames[j].len);
        readSync(fd, bytes, 0, frames[j].len, frames[j].at);
        cached = j;
      }
      if (!ff.stdin.write(bytes)) await new Promise((r) => ff.stdin.once("drain", r));
    }
  }
  ff.stdin.end();
  closeSync(fd);
  await new Promise((r, x) => ff.on("close", (code) => (code === 0 ? r() : x(new Error("ffmpeg exited " + code)))));
  log("done", OUT);
}
