import type { VoicePlayback } from '../../audio/audioTypes';

export interface OpeningSpeaker { characterId: string; player: 0 | 1 }
export interface OpeningSpeechAudio {
  audible(): boolean;
  playIntro(speaker: OpeningSpeaker): void;
  onVoice(listener: (line: VoicePlayback | null) => void): () => void;
}

const END_GRACE_MS = 150;
const DISPATCH_GRACE_MS = 250;
const MAX_SINGLE_DURATION_MS = 10_000;
const UNKNOWN_DURATION_MS = 2_000;

/** A bounded presentation before sim starts. It never mutates, steps or delays a core tick. */
export class FightOpeningSpeech {
  private next = 0;
  private current: OpeningSpeaker | null = null;
  private waiting = false;
  private received = false;
  private lineElapsed = 0;
  private lineDeadline = 0;
  private elapsed = 0;
  private done = false;
  private readonly unsubscribe: () => void;
  private expectedWaitMs = 0;
  private dispatchDelayMs = 0;
  /** Normal budget follows real decoded durations; unknown/faulty cues remain bounded. */
  get maxMs(): number {
    const unknown = Math.max(0, this.speakers.length - this.next);
    const absolute = this.speakers.length * (MAX_SINGLE_DURATION_MS + END_GRACE_MS) + DISPATCH_GRACE_MS;
    return Math.min(absolute, this.expectedWaitMs + unknown * (MAX_SINGLE_DURATION_MS + END_GRACE_MS) + this.dispatchDelayMs + DISPATCH_GRACE_MS);
  }
  get active(): boolean { return !this.done; }
  constructor(private readonly speakers: readonly OpeningSpeaker[], private readonly audio: OpeningSpeechAudio) {
    this.unsubscribe = audio.onVoice(line => {
      if (!this.current || this.done) return;
      if (!line) { if (this.received) this.waiting = false; return; }
      if (line.player !== this.current.player || line.cueId !== `voice.${this.current.characterId}.intro`) return;
      const duration = Number.isFinite(line.durationMs) && line.durationMs > 0
        ? Math.min(line.durationMs, MAX_SINGLE_DURATION_MS) : UNKNOWN_DURATION_MS;
      const deadline = duration + END_GRACE_MS;
      if (!this.received) this.expectedWaitMs += deadline;
      this.received = true; this.waiting = true;
      this.lineDeadline = deadline;
    });
  }
  tick(deltaMs: number, skip = false): void {
    if (this.done) return;
    if (skip || !this.audio.audible()) { this.finish(); return; }
    const delta = Number.isFinite(deltaMs) ? Math.max(0, deltaMs) : 0;
    this.elapsed += delta; this.lineElapsed += delta;
    if (this.elapsed >= this.maxMs) { this.finish(); return; }
    if (this.waiting && this.lineElapsed < this.lineDeadline) return;
    // A missing/rejected exact cue emits no onVoice start; skip immediately, without a silent timer.
    while (this.next < this.speakers.length) {
      // Allow actual frame-dispatch delay between sentences, without inventing extra speech wait.
      this.dispatchDelayMs = Math.max(this.dispatchDelayMs, this.elapsed - this.expectedWaitMs);
      this.current = this.speakers[this.next++]!;
      this.received = false; this.waiting = false; this.lineElapsed = 0;
      this.audio.playIntro(this.current);
      if (this.received && this.waiting) return;
    }
    this.finish();
  }
  dispose(): void { this.finish(); }
  private finish(): void {
    if (this.done) return;
    this.done = true; this.waiting = false; this.current = null; this.unsubscribe();
  }
}
