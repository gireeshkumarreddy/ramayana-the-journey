/**
 * All sound is synthesised here: a tanpura-like drone, wind, and percussion
 * that answers the story's beats. Nothing plays until the visitor chooses sound.
 */

type Mood = "calm" | "divine" | "ravana" | "war" | "night" | "hush";

const SA = 130.81; // C3

const MOODS: Record<Mood, { drone: number; wind: number; sub: number; cutoff: number; first: number; shimmer: number }> = {
  calm: { drone: 0.5, wind: 0.08, sub: 0, cutoff: 2400, first: SA * 0.75, shimmer: 0 },
  divine: { drone: 0.42, wind: 0.14, sub: 0, cutoff: 3200, first: SA * 0.75, shimmer: 0.05 },
  ravana: { drone: 0.5, wind: 0.16, sub: 0.32, cutoff: 1300, first: SA * (2 / 3), shimmer: 0 },
  war: { drone: 0.36, wind: 0.22, sub: 0.38, cutoff: 1600, first: SA * 0.75, shimmer: 0 },
  night: { drone: 0.44, wind: 0.12, sub: 0.05, cutoff: 2000, first: SA * 0.75, shimmer: 0.035 },
  hush: { drone: 0.12, wind: 0.04, sub: 0, cutoff: 900, first: SA * 0.75, shimmer: 0 },
};

class Sound {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private comp!: DynamicsCompressorNode;
  private droneBus!: GainNode;
  private droneFilter!: BiquadFilterNode;
  private windGain!: GainNode;
  private subGain!: GainNode;
  private shimmerGain!: GainNode;
  private verb!: ConvolverNode;
  private verbSend!: GainNode;
  private noise!: AudioBuffer;
  private nextPluck = 0;
  private step = 0;
  private mood: Mood = "calm";
  on = false;
  private listeners: ((on: boolean) => void)[] = [];

  onChange(fn: (on: boolean) => void) {
    this.listeners.push(fn);
  }

  /** Must be called from a user gesture. */
  init() {
    if (this.ctx) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    const ctx = (this.ctx = new AC());

    const comp = (this.comp = ctx.createDynamicsCompressor());
    comp.threshold.value = -16;
    comp.ratio.value = 4;
    comp.connect(ctx.destination);
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(comp);

    // Reverb from a synthetic impulse: a long dark tail, like a stone hall.
    this.verb = ctx.createConvolver();
    const len = ctx.sampleRate * 4;
    const ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
    }
    this.verb.buffer = ir;
    this.verbSend = ctx.createGain();
    this.verbSend.gain.value = 0.55;
    this.verbSend.connect(this.verb);
    this.verb.connect(this.master);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const nd = this.noise.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    // Drone bus
    this.droneFilter = ctx.createBiquadFilter();
    this.droneFilter.type = "lowpass";
    this.droneFilter.frequency.value = MOODS.calm.cutoff;
    this.droneBus = ctx.createGain();
    this.droneBus.gain.value = MOODS.calm.drone;
    this.droneFilter.connect(this.droneBus);
    this.droneBus.connect(this.master);
    this.droneBus.connect(this.verbSend);

    // Wind: looping noise through a wandering band-pass
    const wind = ctx.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 420;
    bp.Q.value = 0.6;
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoAmt = ctx.createGain();
    lfoAmt.gain.value = 260;
    lfo.connect(lfoAmt).connect(bp.frequency);
    this.windGain = ctx.createGain();
    this.windGain.gain.value = MOODS.calm.wind;
    wind.connect(bp).connect(this.windGain).connect(this.master);
    wind.start();
    lfo.start();

    // Sub: a slow, low pulse that belongs to Rāvaṇa
    const sub = ctx.createOscillator();
    sub.frequency.value = 43.65;
    const trem = ctx.createOscillator();
    trem.frequency.value = 0.55;
    const tremAmt = ctx.createGain();
    tremAmt.gain.value = 0.5;
    this.subGain = ctx.createGain();
    this.subGain.gain.value = 0;
    const subAmp = ctx.createGain();
    subAmp.gain.value = 0.5;
    trem.connect(tremAmt).connect(subAmp.gain);
    sub.connect(subAmp).connect(this.subGain).connect(this.master);
    sub.start();
    trem.start();

    // Shimmer: high, airy partials for the gods and the night sky
    this.shimmerGain = ctx.createGain();
    this.shimmerGain.gain.value = 0;
    this.shimmerGain.connect(this.verbSend);
    [SA * 8, SA * 12, SA * 16.02].forEach((f, i) => {
      const o = ctx.createOscillator();
      o.type = "sine";
      o.frequency.value = f;
      const g = ctx.createGain();
      g.gain.value = 0.3 / (i + 1);
      const l = ctx.createOscillator();
      l.frequency.value = 0.11 + i * 0.07;
      const la = ctx.createGain();
      la.gain.value = 0.25 / (i + 1);
      l.connect(la).connect(g.gain);
      o.connect(g).connect(this.shimmerGain);
      o.start();
      l.start();
    });

    this.nextPluck = ctx.currentTime + 0.2;
    window.setInterval(() => this.schedule(), 120);
  }

  private schedule() {
    const ctx = this.ctx!;
    const m = MOODS[this.mood];
    // Classic tanpura cycle: Pa (or Ma) – Sa' – Sa' – Sa
    const notes = [m.first, SA * 2, SA * 2, SA];
    const gaps = [0.9, 0.9, 0.9, 1.5];
    while (this.nextPluck < ctx.currentTime + 0.4) {
      const k = this.step % 4;
      this.pluck(notes[k], this.nextPluck, k === 3 ? 0.9 : 0.7);
      this.nextPluck += gaps[k] + (Math.random() - 0.5) * 0.06;
      this.step++;
    }
  }

  private pluck(f: number, t: number, amp: number) {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.16 * amp, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0008, t + 4.6);
    // The jawari bloom: brightness swells after the attack, then settles
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.Q.value = 7;
    lp.frequency.setValueAtTime(500, t);
    lp.frequency.linearRampToValueAtTime(2600, t + 0.35);
    lp.frequency.exponentialRampToValueAtTime(700, t + 4);
    [1, 1.0028, 0.9975].forEach((d, i) => {
      const o = ctx.createOscillator();
      o.type = i === 0 ? "sawtooth" : "triangle";
      o.frequency.value = f * d;
      o.connect(lp);
      o.start(t);
      o.stop(t + 4.8);
    });
    lp.connect(g).connect(this.droneFilter);
  }

  /** Everything the engine plays, as a MediaStream. Used to record walkthrough videos. */
  tap() {
    if (!this.ctx) return null;
    const dest = this.ctx.createMediaStreamDestination();
    this.comp.connect(dest);
    return dest.stream;
  }

  setOn(v: boolean) {
    if (v && !this.ctx) this.init();
    if (!this.ctx) return;
    this.on = v;
    if (v) this.ctx.resume();
    const now = this.ctx.currentTime;
    this.master.gain.cancelScheduledValues(now);
    this.master.gain.setTargetAtTime(v ? 0.75 : 0, now, v ? 1.2 : 0.25);
    this.listeners.forEach((fn) => fn(v));
  }

  setMood(m: Mood) {
    if (m === this.mood) return;
    this.mood = m;
    if (!this.ctx) return;
    const s = MOODS[m];
    const now = this.ctx.currentTime;
    this.droneBus.gain.setTargetAtTime(s.drone, now, 1.5);
    this.droneFilter.frequency.setTargetAtTime(s.cutoff, now, 1.5);
    this.windGain.gain.setTargetAtTime(s.wind, now, 2);
    this.subGain.gain.setTargetAtTime(s.sub, now, 2);
    this.shimmerGain.gain.setTargetAtTime(s.shimmer, now, 2);
  }

  /** A deep drum hit, like a struck dhol or a temple door closing. */
  boom(strength = 1) {
    if (!this.ctx || !this.on) return;
    const ctx = this.ctx;
    const t = ctx.currentTime + 0.005;
    const o = ctx.createOscillator();
    o.frequency.setValueAtTime(96, t);
    o.frequency.exponentialRampToValueAtTime(36, t + 0.45);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.9 * strength, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    o.connect(g).connect(this.master);
    g.connect(this.verbSend);
    o.start(t);
    o.stop(t + 1.6);

    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 380;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.5 * strength, t);
    ng.gain.exponentialRampToValueAtTime(0.001, t + 0.35);
    n.connect(lp).connect(ng).connect(this.master);
    n.start(t);
    n.stop(t + 0.4);
  }

  /** A small crackle: a head given to the fire. */
  tick() {
    if (!this.ctx || !this.on) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    n.playbackRate.value = 0.6 + Math.random() * 0.5;
    const hp = ctx.createBiquadFilter();
    hp.type = "bandpass";
    hp.frequency.value = 1800 + Math.random() * 1200;
    hp.Q.value = 2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.4, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
    n.connect(hp).connect(g).connect(this.master);
    g.connect(this.verbSend);
    n.start(t, Math.random());
    n.stop(t + 0.2);
  }

  /** A temple bell. */
  chime(f = 523.25, amp = 0.18) {
    if (!this.ctx || !this.on) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    [1, 2.76, 5.4, 8.93].forEach((r, i) => {
      const o = ctx.createOscillator();
      o.frequency.value = f * r;
      const g = ctx.createGain();
      g.gain.setValueAtTime(amp / (i + 1), t);
      g.gain.exponentialRampToValueAtTime(0.0005, t + 3.2 / (i * 0.6 + 1));
      o.connect(g).connect(this.master);
      g.connect(this.verbSend);
      o.start(t);
      o.stop(t + 3.4);
    });
  }

  /** Air torn by an arrow. */
  whoosh(dur = 0.7) {
    if (!this.ctx || !this.on) return;
    const ctx = this.ctx;
    const t = ctx.currentTime;
    const n = ctx.createBufferSource();
    n.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.Q.value = 3;
    bp.frequency.setValueAtTime(260, t);
    bp.frequency.exponentialRampToValueAtTime(4200, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(0.6, t + dur * 0.8);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur * 1.1);
    n.connect(bp).connect(g).connect(this.master);
    n.start(t);
    n.stop(t + dur * 1.2);
  }
}

export const sound = new Sound();
if (import.meta.env.DEV) (window as unknown as { __sound: Sound }).__sound = sound;
export type { Mood };
