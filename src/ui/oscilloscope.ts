// Osciloscópio: o "personagem" visual do jogo.
// Quanto mais história o jogador desbloqueia (`order`), mais organizada fica a onda.

export interface ScopeParams {
  /** Sinal total (Hz): controla amplitude e velocidade. */
  signal: number;
  saturated: boolean;
  /** 0 = puro ruído, 1 = onda limpa. */
  order: number;
  glow: boolean;
  /** Pico de ressonância ativo: posição (0..1) e vida restante (1 → 0). */
  peak: { x: number; life: number } | null;
}

interface Pulse {
  x: number; // 0..1
  t: number; // timestamp ms
}

const COLOR = '#33ff66';
const COLOR_SAT = '#ffb000';
const COLOR_PEAK = '#ffe08a';
const GRID = 'rgba(51, 255, 102, 0.07)';
const PULSE_LIFE_MS = 900;

export class Oscilloscope {
  private ctx: CanvasRenderingContext2D;
  private pulses: Pulse[] = [];
  private phase = 0;
  private lastFrame = 0;
  private raf = 0;
  private width = 0;
  private height = 0;
  private dpr = 1;

  constructor(
    private canvas: HTMLCanvasElement,
    private params: () => ScopeParams,
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D indisponível');
    this.ctx = ctx;
    new ResizeObserver(() => this.resize()).observe(canvas);
    this.resize();
  }

  start(): void {
    const loop = (now: number) => {
      this.draw(now);
      this.raf = requestAnimationFrame(loop);
    };
    this.raf = requestAnimationFrame(loop);
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
  }

  /** Dispara uma perturbação na onda na posição horizontal `xFrac` (0..1). */
  pulse(xFrac: number): void {
    this.pulses.push({ x: xFrac, t: performance.now() });
    if (this.pulses.length > 12) this.pulses.shift();
  }

  private resize(): void {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = this.canvas.clientWidth;
    this.height = this.canvas.clientHeight;
    this.canvas.width = Math.round(this.width * this.dpr);
    this.canvas.height = Math.round(this.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  private draw(now: number): void {
    const { ctx, width: w, height: hgt } = this;
    if (w === 0 || hgt === 0) return;
    const p = this.params();
    const dt = this.lastFrame ? Math.min(0.1, (now - this.lastFrame) / 1000) : 0;
    this.lastFrame = now;

    const intensity = Math.min(1, Math.log10(p.signal + 1) / 4); // 0..1 até ~10 kHz
    this.phase += dt * (1.2 + intensity * 4);

    ctx.clearRect(0, 0, w, hgt);
    this.drawGrid(w, hgt);

    const mid = hgt / 2;
    const amp = hgt * (0.08 + 0.26 * intensity);
    const noiseAmt = (1 - p.order) * 0.55 + (p.saturated ? 0.35 : 0) + 0.05;
    const k1 = (Math.PI * 2 * (1.5 + p.order * 2)) / w;
    const k2 = (Math.PI * 2 * 5.3) / w;
    this.pulses = this.pulses.filter((pl) => now - pl.t < PULSE_LIFE_MS);

    ctx.beginPath();
    for (let x = 0; x <= w; x += 2) {
      let y =
        0.6 * Math.sin(x * k1 + this.phase) +
        0.25 * Math.sin(x * k2 - this.phase * 1.7) * p.order +
        (Math.random() * 2 - 1) * noiseAmt;

      if (p.peak) {
        const dx = (x - p.peak.x * w) / (w * 0.022);
        y -= 2.4 * Math.exp(-dx * dx) * (0.85 + 0.15 * Math.sin(now / 70));
      }

      for (const pl of this.pulses) {
        const age = (now - pl.t) / 1000;
        const dx = (x - pl.x * w) / (w * 0.06);
        y += 1.6 * Math.exp(-dx * dx) * Math.exp(-age * 4) * Math.sin(age * 28 + x * 0.25);
      }

      const py = mid + y * amp;
      if (x === 0) ctx.moveTo(x, py);
      else ctx.lineTo(x, py);
    }

    ctx.strokeStyle = p.saturated ? COLOR_SAT : COLOR;
    ctx.lineWidth = 1.6;
    if (p.glow) {
      ctx.shadowColor = ctx.strokeStyle;
      ctx.shadowBlur = 8;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;

    if (p.peak) this.drawPeakMarker(p.peak.x * w, mid - amp * 2.4, p.peak.life, now, p.glow);
  }

  /** Anel pulsante sobre o pico, com um arco mostrando o tempo restante. */
  private drawPeakMarker(x: number, tipY: number, life: number, now: number, glow: boolean): void {
    const { ctx } = this;
    const y = Math.max(16, tipY - 14);
    const r = 9 + 2 * Math.sin(now / 120);
    ctx.strokeStyle = COLOR_PEAK;
    ctx.lineWidth = 2;
    if (glow) {
      ctx.shadowColor = COLOR_PEAK;
      ctx.shadowBlur = 12;
    }
    ctx.beginPath();
    ctx.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * life);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fillStyle = COLOR_PEAK;
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  private drawGrid(w: number, hgt: number): void {
    const { ctx } = this;
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    const cols = 8;
    const rows = 4;
    for (let i = 1; i < cols; i++) {
      const x = Math.round((w / cols) * i) + 0.5;
      ctx.moveTo(x, 0);
      ctx.lineTo(x, hgt);
    }
    for (let i = 1; i < rows; i++) {
      const y = Math.round((hgt / rows) * i) + 0.5;
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
  }
}
