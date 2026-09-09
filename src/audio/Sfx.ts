/**
 * WebAudio 程序合成音效：无素材依赖。
 * AudioContext 在第一次用户输入后惰性创建（浏览器自动播放策略）。
 * 将来接入正式音效时，保持同样的方法名，内部改为播放采样即可。
 */
type Kind = 'hit_light' | 'hit_heavy' | 'block' | 'throw' | 'special' | 'ko' | 'menu_move' | 'menu_confirm' | 'round_start' | 'counter';

const STORAGE_KEY = 'opf.audio.v1';

class SfxEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  muted = false;
  volume = 0.5;

  constructor() {
    try {
      const raw = globalThis.localStorage?.getItem(STORAGE_KEY);
      if (raw) {
        const j = JSON.parse(raw) as { muted?: boolean; volume?: number };
        if (typeof j.muted === 'boolean') this.muted = j.muted;
        if (typeof j.volume === 'number') this.volume = Math.max(0, Math.min(1, j.volume));
      }
    } catch {
      // ignore
    }
  }

  /** 在用户手势回调里调用一次以解锁 */
  unlock(): void {
    if (typeof window === 'undefined' || !('AudioContext' in window)) return;
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : this.volume;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  toggleMute(): boolean {
    this.muted = !this.muted;
    if (this.master) this.master.gain.value = this.muted ? 0 : this.volume;
    this.save();
    return this.muted;
  }

  private save(): void {
    try {
      globalThis.localStorage?.setItem(STORAGE_KEY, JSON.stringify({ muted: this.muted, volume: this.volume }));
    } catch {
      // ignore
    }
  }

  play(kind: Kind): void {
    if (!this.ctx || !this.master || this.muted) return;
    const t = this.ctx.currentTime;
    switch (kind) {
      case 'hit_light':
        this.noise(t, 0.06, 0.5, 1800);
        this.tone(t, 0.08, 220, 90, 'square', 0.25);
        break;
      case 'hit_heavy':
        this.noise(t, 0.12, 0.7, 900);
        this.tone(t, 0.16, 160, 50, 'square', 0.4);
        break;
      case 'counter':
        this.noise(t, 0.14, 0.8, 1200);
        this.tone(t, 0.2, 880, 220, 'sawtooth', 0.35);
        break;
      case 'block':
        this.noise(t, 0.05, 0.35, 3500);
        this.tone(t, 0.06, 1200, 900, 'triangle', 0.2);
        break;
      case 'throw':
        this.noise(t, 0.2, 0.6, 500);
        this.tone(t, 0.25, 120, 40, 'sine', 0.4);
        break;
      case 'special':
        this.tone(t, 0.25, 300, 900, 'sawtooth', 0.18);
        this.noise(t, 0.2, 0.25, 2500);
        break;
      case 'ko':
        this.noise(t, 0.5, 0.9, 400);
        this.tone(t, 0.7, 200, 30, 'square', 0.5);
        this.tone(t + 0.05, 0.6, 100, 25, 'sawtooth', 0.4);
        break;
      case 'menu_move':
        this.tone(t, 0.05, 700, 700, 'square', 0.12);
        break;
      case 'menu_confirm':
        this.tone(t, 0.08, 600, 1200, 'square', 0.15);
        break;
      case 'round_start':
        this.tone(t, 0.12, 440, 440, 'square', 0.2);
        this.tone(t + 0.14, 0.25, 660, 660, 'square', 0.2);
        break;
    }
  }

  private tone(t: number, dur: number, f0: number, f1: number, type: OscillatorType, gain: number): void {
    if (!this.ctx || !this.master) return;
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f0, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(this.master);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  private noise(t: number, dur: number, gain: number, cutoff: number): void {
    if (!this.ctx || !this.master) return;
    const n = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    src.connect(filter).connect(g).connect(this.master);
    src.start(t);
  }
}

let engine: SfxEngine | null = null;
export function sfx(): SfxEngine {
  engine ??= new SfxEngine();
  return engine;
}
