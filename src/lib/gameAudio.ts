// Lightweight Web Audio API sound synthesizer for 2D arcade & board games.

class GameAudioEngine {
  private ctx: AudioContext | null = null;
  public muted = false;

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      void this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freq: number,
    durationSec: number,
    type: OscillatorType = 'sine',
    volume = 0.06,
    delaySec = 0
  ) {
    const ctx = this.ensureContext();
    if (!ctx) return;

    const now = ctx.currentTime + delaySec;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + durationSec + 0.02);
  }

  playMove() {
    this.playTone(320, 0.045, 'triangle', 0.035);
  }

  playCapture() {
    this.playTone(460, 0.08, 'triangle', 0.06, 0);
    this.playTone(620, 0.09, 'sine', 0.05, 0.05);
  }

  playScore() {
    this.playTone(523.25, 0.07, 'sine', 0.06, 0);
    this.playTone(659.25, 0.09, 'sine', 0.06, 0.06);
  }

  playLineClear(lines: number) {
    const notes =
      lines >= 4
        ? [523.25, 659.25, 783.99, 1046.5]
        : lines >= 2
          ? [523.25, 659.25, 783.99]
          : [523.25, 659.25];
    notes.forEach((f, idx) => {
      this.playTone(f, 0.1, 'triangle', 0.06, idx * 0.05);
    });
  }

  playCheck() {
    this.playTone(740, 0.1, 'sawtooth', 0.04, 0);
    this.playTone(587.33, 0.12, 'sawtooth', 0.04, 0.09);
  }

  playGameOver() {
    this.playTone(392, 0.14, 'triangle', 0.06, 0);
    this.playTone(329.63, 0.14, 'triangle', 0.06, 0.12);
    this.playTone(261.63, 0.24, 'triangle', 0.06, 0.24);
  }

  playVictory() {
    [523.25, 659.25, 783.99, 1046.5].forEach((f, idx) => {
      this.playTone(f, 0.14, 'sine', 0.065, idx * 0.08);
    });
  }
}

export const gameAudio = new GameAudioEngine();
