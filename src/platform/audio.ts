// Áudio 100% procedural (Web Audio): nenhum arquivo de som.
//
// O navegador/WebView só deixa tocar som depois de um gesto do usuário,
// então o contexto é criado no primeiro toque (`unlock`).

export type SoundName =
  | 'tap'
  | 'buy'
  | 'decoded'
  | 'journal'
  | 'scanFound'
  | 'scanEmpty'
  | 'peak'
  | 'peakClaim'
  | 'silence';

const MASTER_GAIN = 0.6;
const AMBIENT_GAIN = 0.022;

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientOut: GainNode | null = null;
  private noise: AudioBuffer | null = null;
  private soundOn = true;
  private ambientOn = true;
  private lastTap = 0;

  configure(sound: boolean, ambient: boolean): void {
    this.soundOn = sound;
    this.ambientOn = ambient;
    this.applyAmbient();
  }

  /** Chamar no primeiro gesto do usuário (toque/clique). */
  unlock(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.master = this.ctx.createGain();
    this.master.gain.value = MASTER_GAIN;
    this.master.connect(this.ctx.destination);
    this.noise = this.makeNoise(2);
    this.startAmbient();
  }

  suspend(): void {
    void this.ctx?.suspend();
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  play(name: SoundName): void {
    const ctx = this.ctx;
    if (!ctx || !this.soundOn || ctx.state !== 'running') return;
    const t = ctx.currentTime;

    switch (name) {
      case 'tap': {
        // Limita a ~30 toques/s para não embolar.
        if (t - this.lastTap < 0.03) return;
        this.lastTap = t;
        this.noiseBurst(t, 0.04, 2200 + Math.random() * 1400, 0.09, 'bandpass');
        this.tone(t, 1800 + Math.random() * 300, 0.02, 'sine', 0.025);
        break;
      }
      case 'buy': // clique de relé
        this.tone(t, 150, 0.03, 'square', 0.05);
        this.noiseBurst(t, 0.015, 4000, 0.08, 'highpass');
        break;
      case 'journal':
        this.tone(t, 660, 0.09, 'sine', 0.06);
        break;
      case 'decoded':
        this.tone(t, 880, 0.12, 'sine', 0.08);
        this.tone(t + 0.13, 1320, 0.2, 'sine', 0.08);
        break;
      case 'scanFound':
        this.sweep(t, 300, 1200, 0.4, 'sine', 0.06);
        this.tone(t + 0.42, 1200, 0.18, 'sine', 0.07);
        break;
      case 'scanEmpty':
        this.sweep(t, 600, 280, 0.35, 'sine', 0.04);
        break;
      case 'peak':
        this.tone(t, 1046.5, 0.35, 'triangle', 0.04);
        this.tone(t + 0.05, 1568, 0.3, 'triangle', 0.03);
        break;
      case 'peakClaim':
        [784, 988, 1175, 1568].forEach((f, i) => this.tone(t + i * 0.07, f, 0.12, 'triangle', 0.06));
        break;
      case 'silence':
        this.tone(t, 110, 2.5, 'sine', 0.12);
        this.tone(t + 0.4, 164.8, 2.2, 'sine', 0.06);
        break;
    }
  }

  // ─── Ambiente: estática filtrada, respirando devagar ───

  private startAmbient(): void {
    const ctx = this.ctx;
    if (!ctx || !this.master || !this.noise) return;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    src.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 1200;
    filter.Q.value = 0.6;

    // LFO lento mexendo na frequência do filtro.
    const lfo = ctx.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 600;
    lfo.connect(lfoGain).connect(filter.frequency);

    this.ambientOut = ctx.createGain();
    this.ambientOut.gain.value = 0;
    src.connect(filter).connect(this.ambientOut).connect(this.master);
    src.start();
    lfo.start();
    this.applyAmbient();
  }

  private applyAmbient(): void {
    if (!this.ctx || !this.ambientOut) return;
    const target = this.soundOn && this.ambientOn ? AMBIENT_GAIN : 0;
    this.ambientOut.gain.setTargetAtTime(target, this.ctx.currentTime, 0.4);
  }

  // ─── Blocos de síntese ───

  private makeNoise(seconds: number): AudioBuffer {
    const ctx = this.ctx!;
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    return buf;
  }

  private envelope(start: number, dur: number, peak: number): GainNode {
    const ctx = this.ctx!;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.01, dur / 4));
    g.gain.exponentialRampToValueAtTime(0.0001, start + dur);
    g.connect(this.master!);
    return g;
  }

  private tone(start: number, freq: number, dur: number, type: OscillatorType, peak: number): void {
    const osc = this.ctx!.createOscillator();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(this.envelope(start, dur, peak));
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  private sweep(start: number, from: number, to: number, dur: number, type: OscillatorType, peak: number): void {
    const osc = this.ctx!.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(from, start);
    osc.frequency.exponentialRampToValueAtTime(to, start + dur);
    osc.connect(this.envelope(start, dur, peak));
    osc.start(start);
    osc.stop(start + dur + 0.02);
  }

  private noiseBurst(start: number, dur: number, freq: number, peak: number, type: BiquadFilterType): void {
    const ctx = this.ctx!;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const filter = ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    src.connect(filter).connect(this.envelope(start, dur, peak));
    src.start(start, Math.random() * 1.5);
    src.stop(start + dur + 0.02);
  }
}

export const sound = new SoundEngine();
