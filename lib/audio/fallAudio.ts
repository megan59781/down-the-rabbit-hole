// The sound of the fall, synthesised live with the Web Audio API (no audio files).
// Wind follows your falling speed; a drone sets the mood of each direction (deeper, stranger, astray); small
// bells mark grabbing a question and new ones rising.
import type { ExplorationMode } from "@/lib/types";

const MASTER_LEVEL = 0.7;
/** Below this falling speed the air is still: no constant hiss while you hover and read. */
const CALM_SPEED = 1.3;
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

const DEEPER_BELL = [392, 587.33, 783.99];
const STRANGE_SCALE = [659.25, 783.99, 880, 1046.5, 1174.66, 1318.51];
const pick = <T,>(items: T[]) => items[Math.floor(Math.random() * items.length)];

export class FallAudio {
  private readonly master: GainNode;
  private readonly fx: GainNode;
  private readonly noise: AudioBuffer;
  private readonly windGain: GainNode;
  private readonly windFilter: BiquadFilterNode;
  private readonly rumbleGain: GainNode;
  private readonly deeperBus: GainNode;
  private readonly strangerBus: GainNode;
  private readonly astrayBus: GainNode;
  private lastSpeedAt = 0;

  static create(): FallAudio | null {
    const Ctx =
      window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    return Ctx ? new FallAudio(new Ctx()) : null;
  }

  private constructor(private readonly ctx: AudioContext) {
    const now = ctx.currentTime;
    this.master = ctx.createGain();
    this.master.gain.value = 0;
    this.master.connect(ctx.destination);

    // A soft echo shared by the bells, so they shimmer down the tunnel.
    this.fx = ctx.createGain();
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.28;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.35;
    const wet = ctx.createGain();
    wet.gain.value = 0.5;
    this.fx.connect(this.master);
    this.fx.connect(delay);
    delay.connect(feedback).connect(delay);
    delay.connect(wet).connect(this.master);

    this.noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const data = this.noise.getChannelData(0);
    let brown = 0;
    for (let i = 0; i < data.length; i++) {
      // Slightly brownian noise: softer and more like air than pure static.
      brown = (brown + 0.04 * (Math.random() * 2 - 1)) / 1.04;
      data[i] = brown * 3.5 + (Math.random() * 2 - 1) * 0.15;
    }

    // Wind: looping noise through a band that opens up as you fall faster.
    const wind = ctx.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    this.windFilter = ctx.createBiquadFilter();
    this.windFilter.type = "bandpass";
    this.windFilter.frequency.value = 500;
    this.windFilter.Q.value = 0.8;
    this.windGain = ctx.createGain();
    this.windGain.gain.value = 0;
    wind.connect(this.windFilter).connect(this.windGain).connect(this.master);

    // Rumble: the same air, very low, felt more than heard.
    const rumble = ctx.createBufferSource();
    rumble.buffer = this.noise;
    rumble.loop = true;
    rumble.playbackRate.value = 0.7;
    const rumbleFilter = ctx.createBiquadFilter();
    rumbleFilter.type = "lowpass";
    rumbleFilter.frequency.value = 120;
    this.rumbleGain = ctx.createGain();
    this.rumbleGain.gain.value = 0;
    rumble.connect(rumbleFilter).connect(this.rumbleGain).connect(this.master);
    wind.start(now);
    rumble.start(now + 0.37);

    // Deeper: a low, cold, slowly breathing hum.
    this.deeperBus = ctx.createGain();
    this.deeperBus.gain.value = 0;
    const deepFilter = ctx.createBiquadFilter();
    deepFilter.type = "lowpass";
    deepFilter.frequency.value = 300;
    deepFilter.connect(this.deeperBus).connect(this.master);
    const breath = ctx.createOscillator();
    breath.frequency.value = 0.06;
    const breathDepth = ctx.createGain();
    breathDepth.gain.value = 60;
    breath.connect(breathDepth).connect(deepFilter.frequency);
    breath.start(now);
    for (const [freq, type, level, detune] of [
      [55, "sine", 0.045, 0],
      [82.41, "sine", 0.018, 4],
      [110, "sine", 0.01, -3],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.type = type;
      osc.frequency.value = freq;
      osc.detune.value = detune;
      const gain = ctx.createGain();
      gain.gain.value = level;
      osc.connect(gain).connect(deepFilter);
      osc.start(now);
    }

    // Stranger: a warbling chord with a shimmer drifting in and out above it.
    this.strangerBus = ctx.createGain();
    this.strangerBus.gain.value = 0;
    this.strangerBus.connect(this.master);
    const vibrato = ctx.createOscillator();
    vibrato.frequency.value = 5.2;
    const vibratoDepth = ctx.createGain();
    vibratoDepth.gain.value = 2;
    vibrato.connect(vibratoDepth);
    vibrato.start(now);
    for (const [freq, level] of [
      [146.83, 0.022],
      [220, 0.014],
      [277.18, 0.007],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      vibratoDepth.connect(osc.frequency);
      const gain = ctx.createGain();
      gain.gain.value = level;
      osc.connect(gain).connect(this.strangerBus);
      osc.start(now);
    }
    const shimmerGain = ctx.createGain();
    shimmerGain.gain.value = 0.004;
    const tremolo = ctx.createOscillator();
    tremolo.frequency.value = 0.3;
    const tremoloDepth = ctx.createGain();
    tremoloDepth.gain.value = 0.004;
    tremolo.connect(tremoloDepth).connect(shimmerGain.gain);
    tremolo.start(now);
    for (const freq of [880, 1318.51]) {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      osc.connect(shimmerGain);
      osc.start(now);
    }
    shimmerGain.connect(this.strangerBus);

    // Astray: two tones not quite a fifth apart, so they beat slowly and never settle,
    // with the whole drone wandering in pitch. Unsettled, but quiet.
    this.astrayBus = ctx.createGain();
    this.astrayBus.gain.value = 0;
    const astrayFilter = ctx.createBiquadFilter();
    astrayFilter.type = "lowpass";
    astrayFilter.frequency.value = 700;
    astrayFilter.connect(this.astrayBus).connect(this.master);
    const wander = ctx.createOscillator();
    wander.frequency.value = 0.045;
    const wanderDepth = ctx.createGain();
    wanderDepth.gain.value = 18; // cents
    wander.connect(wanderDepth);
    wander.start(now);
    for (const [freq, level] of [
      [98, 0.03],
      [146.2, 0.016],
      [196.7, 0.006],
    ] as const) {
      const osc = ctx.createOscillator();
      osc.frequency.value = freq;
      wanderDepth.connect(osc.detune);
      const gain = ctx.createGain();
      gain.gain.value = level;
      osc.connect(gain).connect(astrayFilter);
      osc.start(now);
    }
  }

  /** Fade in. Must be called from a user gesture the first time (browser autoplay rules). */
  async start(mode: ExplorationMode) {
    await this.ctx.resume();
    this.setMode(mode, 0.01);
    this.master.gain.setTargetAtTime(MASTER_LEVEL, this.ctx.currentTime, 0.5);
  }

  async stop() {
    this.master.gain.setTargetAtTime(0, this.ctx.currentTime, 0.12);
    await new Promise((resolve) => setTimeout(resolve, 500));
    await this.ctx.suspend();
  }

  dispose() {
    void this.ctx.close();
  }

  /** Crossfade the drone between directions. */
  setMode(mode: ExplorationMode, time = 0.7) {
    const now = this.ctx.currentTime;
    this.deeperBus.gain.setTargetAtTime(mode === "deeper" ? 1 : 0, now, time);
    this.strangerBus.gain.setTargetAtTime(mode === "stranger" ? 1 : 0, now, time);
    this.astrayBus.gain.setTargetAtTime(mode === "astray" ? 1 : 0, now, time);
  }

  /** Called every animation frame by the tunnel; throttled here. */
  setSpeed(speed: number) {
    const nowMs = performance.now();
    if (nowMs - this.lastSpeedAt < 80) return;
    this.lastSpeedAt = nowMs;
    const s = clamp(speed, 0, 6);
    // Only falling faster than a drift makes any air: scrolling or diving, not hovering.
    const rush = Math.max(0, s - CALM_SPEED);
    const now = this.ctx.currentTime;
    this.windGain.gain.setTargetAtTime(Math.min(rush * 0.03, 0.12), now, 0.25);
    this.windFilter.frequency.setTargetAtTime(260 + s * 180, now, 0.25);
    this.rumbleGain.gain.setTargetAtTime(Math.min(rush * 0.012, 0.05), now, 0.3);
  }

  private bell(freq: number, at: number, level: number, decay: number) {
    const osc = this.ctx.createOscillator();
    osc.frequency.value = freq;
    const overtone = this.ctx.createOscillator();
    overtone.frequency.value = freq * 2.76;
    const gain = this.ctx.createGain();
    const overtoneGain = this.ctx.createGain();
    overtoneGain.gain.value = 0.25;
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level, at + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + decay);
    osc.connect(gain);
    overtone.connect(overtoneGain).connect(gain);
    gain.connect(this.fx);
    osc.start(at);
    overtone.start(at);
    osc.stop(at + decay + 0.05);
    overtone.stop(at + decay + 0.05);
  }

  /** Grabbing a question: low and clean when deeper, a strange arpeggio when stranger, a wrong turn when astray. */
  chime(mode: ExplorationMode) {
    const now = this.ctx.currentTime;
    if (mode === "deeper") {
      DEEPER_BELL.forEach((f, i) => this.bell(f, now + i * 0.015, 0.09, 2.2));
    } else if (mode === "astray") {
      // A phrase that starts somewhere familiar and steps off to the side.
      [523.25, 587.33, 554.37].forEach((f, i) => this.bell(f, now + i * 0.12, 0.07, 1.8));
    } else {
      for (let i = 0; i < 3; i++) this.bell(pick(STRANGE_SCALE) * (1 + (Math.random() - 0.5) * 0.01), now + i * 0.09, 0.07, 1.6);
    }
  }

  /** The rush of air as you dive. */
  whoosh() {
    const now = this.ctx.currentTime;
    const source = this.ctx.createBufferSource();
    source.buffer = this.noise;
    const filter = this.ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.Q.value = 1.1;
    filter.frequency.setValueAtTime(260, now);
    filter.frequency.exponentialRampToValueAtTime(2400, now + 0.7);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(0.35, now + 0.18);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 1);
    source.connect(filter).connect(gain).connect(this.master);
    source.start(now);
    source.stop(now + 1.1);
  }

  /** A faint plink for each question rising, staggered like the questions themselves. */
  sparkle(count = 4) {
    const now = this.ctx.currentTime;
    for (let i = 0; i < count; i++) this.bell(pick(STRANGE_SCALE) * 2, now + 0.5 + i * 0.25, 0.025, 0.9);
  }
}
