/**
 * 音はすべて Web Audio で合成する（外部音源ファイルなし＝ライセンス問題なし、ロードも軽い）。
 * iOS Safari は最初のユーザー操作の中で AudioContext を resume しないと鳴らないため、
 * unlock() をタップハンドラから呼ぶ。
 */

export type SfxName =
  | 'tap'
  | 'pop'
  | 'sparkle'
  | 'mist'
  | 'munch'
  | 'scoop'
  | 'bounce'
  | 'whoosh'
  | 'chirp'
  | 'puff'
  | 'grow'
  | 'flap'
  | 'farewell'
  | 'pickup'
  | 'drop'
  | 'nope'
  | 'squeak'
  | 'cicada'
  | 'shutter'
  | 'correct';

export type BgmMood = 'day' | 'night' | 'title';

const PENTA = [0, 2, 4, 7, 9]; // メジャーペンタトニック
const midi = (n: number) => 440 * Math.pow(2, (n - 69) / 12);

class AudioEngine {
  private ctx: AudioContext | null = null;
  private master!: GainNode;
  private bgmGain!: GainNode;
  private sfxGain!: GainNode;
  private noise!: AudioBuffer;
  private bgmVol = 0.5;
  private sfxVol = 0.8;
  private bgmMood: BgmMood | null = null;
  private bgmTimer: number | null = null;
  private nextNoteTime = 0;
  private step = 0;

  get unlocked() {
    return this.ctx !== null && this.ctx.state === 'running';
  }

  /** 最初のタップで呼ぶ */
  unlock() {
    if (typeof window === 'undefined') return;
    if (!this.ctx) {
      const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx({ latencyHint: 'interactive' });
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.9;
      this.master.connect(this.ctx.destination);
      this.bgmGain = this.ctx.createGain();
      this.sfxGain = this.ctx.createGain();
      this.bgmGain.connect(this.master);
      this.sfxGain.connect(this.master);
      this.applyVolumes();
      this.noise = this.makeNoise();
      document.addEventListener('visibilitychange', () => {
        if (!this.ctx) return;
        if (document.hidden) void this.ctx.suspend();
        else void this.ctx.resume();
      });
    }
    // iOS: 無音バッファを鳴らしてオーディオ経路を開く
    const src = this.ctx.createBufferSource();
    src.buffer = this.ctx.createBuffer(1, 1, 22050);
    src.connect(this.ctx.destination);
    src.start(0);
    void this.ctx.resume();
  }

  setVolumes(bgm: number, sfx: number) {
    this.bgmVol = bgm;
    this.sfxVol = sfx;
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    // 人の耳に合わせて二乗カーブ
    this.bgmGain.gain.setTargetAtTime(this.bgmVol * this.bgmVol * 0.35, t, 0.05);
    this.sfxGain.gain.setTargetAtTime(this.sfxVol * this.sfxVol, t, 0.02);
  }

  private makeNoise() {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    return buf;
  }

  private tone(
    freq: number,
    t0: number,
    dur: number,
    opts: { type?: OscillatorType; gain?: number; slideTo?: number; attack?: number; out?: AudioNode } = {},
  ) {
    const ctx = this.ctx!;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = opts.type ?? 'sine';
    osc.frequency.setValueAtTime(freq, t0);
    if (opts.slideTo) osc.frequency.exponentialRampToValueAtTime(opts.slideTo, t0 + dur);
    const peak = opts.gain ?? 0.3;
    const a = opts.attack ?? 0.005;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(peak, t0 + a);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(opts.out ?? this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  private noiseBurst(
    t0: number,
    dur: number,
    opts: { type?: BiquadFilterType; freq?: number; q?: number; gain?: number; freqTo?: number } = {},
  ) {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = opts.type ?? 'bandpass';
    f.frequency.setValueAtTime(opts.freq ?? 2000, t0);
    if (opts.freqTo) f.frequency.exponentialRampToValueAtTime(opts.freqTo, t0 + dur);
    f.Q.value = opts.q ?? 1;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(opts.gain ?? 0.3, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.sfxGain);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.02);
  }

  play(name: SfxName) {
    if (!this.ctx || this.ctx.state !== 'running') return;
    const t = this.ctx.currentTime + 0.005;
    switch (name) {
      case 'tap':
        this.tone(880, t, 0.08, { type: 'triangle', gain: 0.18 });
        break;
      case 'pop':
        this.tone(420, t, 0.12, { type: 'sine', gain: 0.35, slideTo: 900 });
        break;
      case 'pickup':
        this.tone(520, t, 0.1, { type: 'triangle', gain: 0.2, slideTo: 780 });
        break;
      case 'drop':
        this.tone(600, t, 0.14, { type: 'sine', gain: 0.25, slideTo: 300 });
        break;
      case 'bounce':
        this.tone(300, t, 0.18, { type: 'sine', gain: 0.3, slideTo: 620 });
        this.tone(620, t + 0.08, 0.14, { type: 'sine', gain: 0.18, slideTo: 450 });
        break;
      case 'sparkle':
        [0, 4, 7, 12, 16].forEach((n, i) =>
          this.tone(midi(84 + n), t + i * 0.05, 0.35, { type: 'triangle', gain: 0.12 }),
        );
        break;
      case 'grow':
        [0, 4, 7, 12].forEach((n, i) => this.tone(midi(72 + n), t + i * 0.12, 0.6, { type: 'triangle', gain: 0.2 }));
        this.tone(midi(84), t + 0.5, 1.2, { type: 'sine', gain: 0.15 });
        break;
      case 'mist':
        this.noiseBurst(t, 0.25, { type: 'highpass', freq: 3500, gain: 0.18 });
        break;
      case 'munch':
        for (let i = 0; i < 3; i++) this.noiseBurst(t + i * 0.11, 0.06, { freq: 900 + i * 200, q: 3, gain: 0.25 });
        break;
      case 'scoop':
        this.noiseBurst(t, 0.22, { type: 'lowpass', freq: 1200, freqTo: 300, gain: 0.3 });
        break;
      case 'whoosh':
        this.noiseBurst(t, 0.4, { type: 'bandpass', freq: 400, freqTo: 2400, q: 0.8, gain: 0.2 });
        break;
      case 'flap':
        for (let i = 0; i < 2; i++) this.noiseBurst(t + i * 0.09, 0.07, { type: 'lowpass', freq: 700, gain: 0.2 });
        break;
      case 'chirp': {
        // スズムシ風「リーン」：約 4.5kHz の短いパルスの連なり
        for (let i = 0; i < 8; i++) this.tone(4500, t + i * 0.045, 0.04, { type: 'sine', gain: 0.06, attack: 0.004 });
        break;
      }
      case 'puff':
        // ミイデラゴミムシの「ぷっ」
        this.tone(160, t, 0.08, { type: 'square', gain: 0.12, slideTo: 90 });
        this.noiseBurst(t, 0.3, { type: 'lowpass', freq: 1800, freqTo: 400, gain: 0.35 });
        break;
      case 'farewell':
        [7, 4, 2, 0, -5].forEach((n, i) => this.tone(midi(76 + n), t + i * 0.18, 0.7, { type: 'triangle', gain: 0.15 }));
        break;
      case 'squeak':
        // カミキリムシの「キィキィ」（むねを こする 音）
        for (let i = 0; i < 5; i++) this.noiseBurst(t + i * 0.11, 0.07, { type: 'bandpass', freq: 3200, q: 6, gain: 0.25 });
        break;
      case 'cicada':
        // アブラゼミの「ジジジ…」（ざらついた 連続音）
        for (let i = 0; i < 14; i++) this.noiseBurst(t + i * 0.05, 0.05, { type: 'bandpass', freq: 4200 + (i % 3) * 300, q: 4, gain: 0.12 });
        break;
      case 'shutter':
        this.noiseBurst(t, 0.05, { type: 'highpass', freq: 2500, gain: 0.35 });
        this.noiseBurst(t + 0.09, 0.06, { type: 'highpass', freq: 1800, gain: 0.3 });
        break;
      case 'correct':
        this.tone(midi(79), t, 0.18, { type: 'triangle', gain: 0.22 });
        this.tone(midi(84), t + 0.12, 0.4, { type: 'triangle', gain: 0.22 });
        break;
      case 'nope':
        this.tone(330, t, 0.12, { type: 'sine', gain: 0.2 });
        this.tone(262, t + 0.12, 0.16, { type: 'sine', gain: 0.2 });
        break;
    }
  }

  /** 自動生成のオルゴール風 BGM */
  startBgm(mood: BgmMood) {
    if (!this.ctx) return;
    if (this.bgmMood === mood && this.bgmTimer !== null) return;
    this.bgmMood = mood;
    if (this.bgmTimer === null) {
      this.nextNoteTime = this.ctx.currentTime + 0.1;
      this.bgmTimer = window.setInterval(() => this.schedule(), 100);
    }
  }

  stopBgm() {
    if (this.bgmTimer !== null) window.clearInterval(this.bgmTimer);
    this.bgmTimer = null;
    this.bgmMood = null;
  }

  private schedule() {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.bgmMood) return;
    const night = this.bgmMood === 'night';
    const beat = night ? 0.6 : 0.42;
    const root = night ? 60 : this.bgmMood === 'title' ? 67 : 65;
    while (this.nextNoteTime < ctx.currentTime + 0.3) {
      const t = this.nextNoteTime;
      const s = this.step++;
      const bar = Math.floor(s / 8) % 4;
      const chordRoot = [0, 5, 7, 5][bar]!;
      // ベース（小節頭）
      if (s % 8 === 0) {
        this.tone(midi(root - 24 + chordRoot), t, beat * 6, { type: 'sine', gain: 0.22, attack: 0.05, out: this.bgmGain });
      }
      // メロディ（ゆらぎのある確率で鳴らす）
      const density = night ? 0.35 : 0.6;
      if (Math.random() < density || s % 4 === 0) {
        const deg = PENTA[Math.floor(Math.random() * PENTA.length)]!;
        const oct = Math.random() < 0.3 ? 12 : 0;
        this.tone(midi(root + deg + oct), t, beat * 2.5, { type: 'triangle', gain: 0.16, out: this.bgmGain });
      }
      // 夜は虫の声をときどき混ぜる
      if (night && s % 16 === 10) {
        for (let i = 0; i < 6; i++) this.tone(4500, t + i * 0.045, 0.04, { type: 'sine', gain: 0.025, out: this.bgmGain });
      }
      this.nextNoteTime += beat;
    }
  }
}

export const audio = new AudioEngine();
