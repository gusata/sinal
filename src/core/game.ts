import { ANTENNAS, getAntenna, type AntennaDef } from '../data/antennas';
import {
  bytesPerSignal,
  decoderCapacity,
  decoderUpgradeCost,
  type DecoderUpgrade,
} from '../data/decoder';
import {
  EMPTY_SCAN_TEXTS,
  SCANS,
  SOURCES,
  SPECTRUM_REQUIRES,
  getScan,
  getSource,
  type ScanDef,
  type SourceDef,
} from '../data/spectrum';
import { STORY, getStory, type StoryEntry } from '../data/story';
import {
  getUpgrade,
  offlineCapS,
  offlineEfficiency,
  peakWindowS,
  tapSignalFraction,
  type UpgradeDef,
  type UpgradeId,
} from '../data/upgrades';
import { costOfN, maxAffordable, milestoneMultiplier, nextMilestone } from './economy';
import { computeOffline, OFFLINE_THRESHOLD_S, type OfflineResult } from './offline';
import { allMet } from './requirements';
import type { BuyMode, GameState, ScanResult } from './state';

export interface Rates {
  /** Sinal total captado pelas antenas, já com bônus de fontes (Hz). */
  signal: number;
  /** Quanto o decodificador aguenta processar (Hz). */
  capacity: number;
  /** Sinal efetivamente processado = min(signal, capacity). */
  processed: number;
  saturated: boolean;
  bytesPerSignal: number;
  /** Multiplicador do pico de ressonância ativo (1 se nenhum). */
  boost: number;
  /** Produção sem o boost (usada no cálculo offline). */
  baseDataPerSec: number;
  dataPerSec: number;
  /** Dados/s desperdiçados pelo sinal acima da capacidade (com boost, se houver). */
  lostDataPerSec: number;
}

export interface OfflineReport extends OfflineResult {
  /** IDs de história concluídos ao voltar (decifrações que terminaram, diário novo). */
  storyUnlocked: string[];
  /** Resultado de varredura concluída enquanto estava fora. */
  scan: ScanResult | null;
}

/** Quanto uma compra rende de verdade (sem contar boost). */
export interface GainPreview {
  /** Sinal a mais (Hz). */
  signal: number;
  /** Dados/s a mais, depois do limite do decodificador. */
  data: number;
  /** Parte do sinal novo que o decodificador não consegue processar (Hz). */
  wastedSignal: number;
}

export interface PurchaseQuote {
  amount: number;
  cost: number;
  affordable: boolean;
}

/** Pico de ressonância na tela. Transitório: não vai para o save. */
export interface Peak {
  /** Posição horizontal no osciloscópio (0..1). */
  x: number;
  spawnedAt: number;
  expiresAt: number;
}

export type PeakReward = { kind: 'boost'; mult: number; seconds: number } | { kind: 'bundle'; bytes: number };

// ─── Ajustes dos picos ───
const PEAK_FIRST_DELAY_S = 25;
const PEAK_MIN_INTERVAL_S = 120;
const PEAK_MAX_INTERVAL_S = 240;
/** Tolerância do toque em torno do pico (fração da largura). */
const PEAK_HIT_RADIUS = 0.12;
const BOOST_MULT = 7;
const BOOST_SECONDS = 30;
/** Pacote de dados = X segundos de produção (ou Y toques, o que for maior). */
const BUNDLE_SECONDS = 90;
const BUNDLE_MIN_TAPS = 30;

type LogListener = (message: string) => void;
type Rng = () => number;
/** Relógio em ms. No jogo é Date.now; na simulação, um relógio virtual. */
export type Clock = () => number;

/**
 * Regras do jogo. Não conhece DOM nem plataforma: só estado + ações.
 * A UI chama as ações e lê `state`/`rates()` para desenhar.
 */
export class Game {
  private logListeners: LogListener[] = [];
  peak: Peak | null = null;
  /** Quando o próximo pico pode aparecer (timestamp ms). */
  nextPeakAt: number;

  constructor(
    public state: GameState,
    private rng: Rng = Math.random,
    private clock: Clock = Date.now,
  ) {
    this.nextPeakAt = this.clock() + PEAK_FIRST_DELAY_S * 1000;
  }

  // ─── Eventos ──────────────────────────────────────────────────────

  onLog(cb: LogListener): void {
    this.logListeners.push(cb);
  }

  private log(message: string): void {
    for (const cb of this.logListeners) cb(message);
  }

  // ─── Taxas ────────────────────────────────────────────────────────

  antennaSignal(def: AntennaDef): number {
    const count = this.state.antennas[def.id] ?? 0;
    return count * def.baseSignal * milestoneMultiplier(count) * this.signalMultiplier();
  }

  /** 1 + soma dos bônus das fontes naturais descobertas. */
  signalMultiplier(): number {
    let bonus = 0;
    for (const id of this.state.spectrum.found) bonus += getSource(id)?.signalBonus ?? 0;
    return 1 + bonus;
  }

  boostMultiplier(now = this.clock()): number {
    const b = this.state.boost;
    return b && now < b.endsAt ? b.mult : 1;
  }

  rates(now = this.clock()): Rates {
    const signal = ANTENNAS.reduce((sum, def) => sum + this.antennaSignal(def), 0);
    const capacity = decoderCapacity(this.state.decoder.capacityLevel);
    const processed = Math.min(signal, capacity);
    const bps = bytesPerSignal(this.state.decoder.efficiencyLevel);
    const boost = this.boostMultiplier(now);
    const baseDataPerSec = processed * bps;
    return {
      signal,
      capacity,
      processed,
      saturated: signal > capacity,
      bytesPerSignal: bps,
      boost,
      baseDataPerSec,
      dataPerSec: baseDataPerSec * boost,
      lostDataPerSec: Math.max(0, signal - capacity) * bps * boost,
    };
  }

  // ─── Tempo ────────────────────────────────────────────────────────

  /**
   * Avança o jogo até `now`. Se a pausa foi longa (app em segundo plano/fechado),
   * aplica o cálculo offline e devolve um relatório.
   */
  tick(now = this.clock()): OfflineReport | null {
    const elapsed = Math.max(0, (now - this.state.lastSeen) / 1000);
    this.state.lastSeen = now;

    if (elapsed > OFFLINE_THRESHOLD_S) {
      // Offline não conta o boost: ele é para quem está olhando.
      const rates = this.rates(now);
      const result = computeOffline(
        rates.baseDataPerSec,
        elapsed,
        offlineEfficiency(this.upgradeLevel('gravador')),
        offlineCapS(this.upgradeLevel('turno')),
      );
      this.gain(result.gained);
      this.peak = null;
      this.nextPeakAt = now + PEAK_FIRST_DELAY_S * 1000;
      const scan = this.updateSpectrum(now);
      return { ...result, scan, storyUnlocked: this.updateStory(now) };
    }

    this.gain(this.rates(now).dataPerSec * elapsed);
    this.state.stats.playTime += elapsed;
    if (this.state.boost && now >= this.state.boost.endsAt) this.state.boost = null;
    this.updatePeak(now);
    this.updateSpectrum(now);
    this.updateStory(now);
    return null;
  }

  private gain(bytes: number): void {
    if (!(bytes > 0)) return;
    this.state.data += bytes;
    this.state.totalData += bytes;
    this.state.lifetimeData += bytes;
  }

  // ─── Toque ────────────────────────────────────────────────────────

  /** Pulso manual: base fixa + fração do sinal que o decodificador consegue processar. */
  tapSignal(): number {
    return 1 + tapSignalFraction(this.upgradeLevel('ouvido')) * this.rates().processed;
  }

  tapBytes(): number {
    return this.tapSignal() * bytesPerSignal(this.state.decoder.efficiencyLevel);
  }

  tap(): number {
    const bytes = this.tapBytes();
    this.gain(bytes);
    this.state.stats.taps++;
    return bytes;
  }

  // ─── Picos de ressonância ─────────────────────────────────────────

  private updatePeak(now: number): void {
    if (this.peak && now >= this.peak.expiresAt) this.peak = null;
    if (this.peak || now < this.nextPeakAt) return;
    // Só aparecem depois da primeira antena (antes disso o jogador ainda está aprendendo a tocar).
    if (!Object.values(this.state.antennas).some((n) => n > 0)) return;

    const windowMs = peakWindowS(this.upgradeLevel('reflexo')) * 1000;
    this.peak = { x: 0.15 + this.rng() * 0.7, spawnedAt: now, expiresAt: now + windowMs };
    const interval = PEAK_MIN_INTERVAL_S + this.rng() * (PEAK_MAX_INTERVAL_S - PEAK_MIN_INTERVAL_S);
    this.nextPeakAt = now + windowMs + interval * 1000;
  }

  /** Tenta pegar o pico com um toque em `xFrac` (0..1). Devolve a recompensa ou null. */
  claimPeak(xFrac: number, now = this.clock()): PeakReward | null {
    const peak = this.peak;
    if (!peak || now >= peak.expiresAt || Math.abs(xFrac - peak.x) > PEAK_HIT_RADIUS) return null;
    this.peak = null;
    this.state.stats.peaks++;

    // Começo do jogo: produção baixa, então o boost valeria pouco. Dá dados direto.
    const useBoost = this.rates(now).baseDataPerSec * 5 > this.tapBytes() && this.rng() < 0.5;
    if (useBoost) {
      const current = this.state.boost && now < this.state.boost.endsAt ? this.state.boost.endsAt : now;
      this.state.boost = { mult: BOOST_MULT, endsAt: current + BOOST_SECONDS * 1000 };
      this.log(`> Ressonância! Produção ×${BOOST_MULT} por ${BOOST_SECONDS}s.`);
      return { kind: 'boost', mult: BOOST_MULT, seconds: BOOST_SECONDS };
    }

    const bytes = Math.max(this.rates(now).baseDataPerSec * BUNDLE_SECONDS, this.tapBytes() * BUNDLE_MIN_TAPS);
    this.gain(bytes);
    this.log('> Ressonância! Pacote de dados captado.');
    return { kind: 'bundle', bytes };
  }

  // ─── Antenas ──────────────────────────────────────────────────────

  isAntennaUnlocked(def: AntennaDef): boolean {
    return (this.state.antennas[def.id] ?? 0) > 0 || allMet(def.requires, this.state);
  }

  quoteAntenna(def: AntennaDef, mode: BuyMode = this.state.settings.buyMode): PurchaseQuote {
    const owned = this.state.antennas[def.id] ?? 0;
    let amount: number;
    if (mode === 'max') amount = Math.max(1, maxAffordable(def.baseCost, owned, this.state.data));
    else amount = mode;
    const cost = costOfN(def.baseCost, owned, amount);
    return { amount, cost, affordable: cost <= this.state.data };
  }

  buyAntenna(id: string): boolean {
    const def = getAntenna(id);
    if (!def || !this.isAntennaUnlocked(def)) return false;
    const quote = this.quoteAntenna(def);
    if (!quote.affordable) return false;

    const before = this.state.antennas[id] ?? 0;
    this.state.data -= quote.cost;
    this.state.antennas[id] = before + quote.amount;

    if (milestoneMultiplier(before + quote.amount) > milestoneMultiplier(before)) {
      this.log(`${def.name}: produção dobrada.`);
    }
    this.updateStory(this.clock());
    return true;
  }

  /** Quanto comprar `amount` unidades desta antena rende em sinal e em dados/s. */
  previewAntenna(def: AntennaDef, amount: number): GainPreview {
    const owned = this.state.antennas[def.id] ?? 0;
    const after = owned + amount;
    const signal =
      (after * milestoneMultiplier(after) - owned * milestoneMultiplier(owned)) * def.baseSignal * this.signalMultiplier();
    const r = this.rates();
    const processedAfter = Math.min(r.signal + signal, r.capacity);
    const processedGain = processedAfter - r.processed;
    return { signal, data: processedGain * r.bytesPerSignal, wastedSignal: signal - processedGain };
  }

  antennaNextMilestone(def: AntennaDef): number | null {
    return nextMilestone(this.state.antennas[def.id] ?? 0);
  }

  // ─── Decodificador ────────────────────────────────────────────────

  decoderLevel(kind: DecoderUpgrade): number {
    return kind === 'capacity' ? this.state.decoder.capacityLevel : this.state.decoder.efficiencyLevel;
  }

  /** Quanto o próximo nível do decodificador rende em dados/s agora. */
  previewDecoder(kind: DecoderUpgrade): number {
    const r = this.rates();
    if (kind === 'capacity') {
      const processed = Math.min(r.signal, decoderCapacity(this.state.decoder.capacityLevel + 1));
      return (processed - r.processed) * r.bytesPerSignal;
    }
    return r.processed * (bytesPerSignal(this.state.decoder.efficiencyLevel + 1) - r.bytesPerSignal);
  }

  decoderCost(kind: DecoderUpgrade): number {
    return decoderUpgradeCost(kind, this.decoderLevel(kind));
  }

  buyDecoder(kind: DecoderUpgrade): boolean {
    const cost = this.decoderCost(kind);
    if (this.state.data < cost) return false;
    this.state.data -= cost;
    if (kind === 'capacity') this.state.decoder.capacityLevel++;
    else this.state.decoder.efficiencyLevel++;
    this.updateStory(this.clock());
    return true;
  }

  // ─── Melhorias da estação ─────────────────────────────────────────

  upgradeLevel(id: UpgradeId): number {
    return this.state.upgrades[id] ?? 0;
  }

  isUpgradeUnlocked(def: UpgradeDef): boolean {
    return this.upgradeLevel(def.id) > 0 || allMet(def.requires, this.state);
  }

  /** Custo do próximo nível, ou null se já está no máximo. */
  upgradeCost(def: UpgradeDef): number | null {
    const level = this.upgradeLevel(def.id);
    return level >= def.maxLevel ? null : def.baseCost * def.costGrowth ** level;
  }

  buyUpgrade(id: UpgradeId): boolean {
    const def = getUpgrade(id);
    if (!def || !this.isUpgradeUnlocked(def)) return false;
    const cost = this.upgradeCost(def);
    if (cost === null || this.state.data < cost) return false;
    this.state.data -= cost;
    this.state.upgrades[id] = this.upgradeLevel(id) + 1;
    return true;
  }

  // ─── Espectro ─────────────────────────────────────────────────────

  isSpectrumUnlocked(): boolean {
    return allMet(SPECTRUM_REQUIRES, this.state);
  }

  availableScans(): ScanDef[] {
    return SCANS.filter((s) => allMet(s.requires, this.state));
  }

  startScan(depth: number, now = this.clock()): boolean {
    const def = getScan(depth);
    if (!def || !this.isSpectrumUnlocked() || this.state.spectrum.scan) return false;
    if (!allMet(def.requires, this.state) || this.state.data < def.cost) return false;
    this.state.data -= def.cost;
    this.state.spectrum.scan = { depth, startedAt: now, endsAt: now + def.duration * 1000 };
    this.log(`Varrendo o céu (${def.name.toLowerCase()})…`);
    return true;
  }

  scanProgress(now = this.clock()): number {
    const job = this.state.spectrum.scan;
    if (!job) return 0;
    const total = job.endsAt - job.startedAt;
    return total <= 0 ? 1 : Math.min(1, Math.max(0, (now - job.startedAt) / total));
  }

  /** Fontes que uma varredura desta profundidade ainda pode encontrar. */
  sourcePool(depth: number): SourceDef[] {
    const found = this.state.spectrum.found;
    return SOURCES.filter((s) => s.depth <= depth && !found.includes(s.id) && allMet(s.requires, this.state));
  }

  markSpectrumSeen(): void {
    this.state.spectrum.unseen = false;
  }

  /** Conclui a varredura se terminou. Retorna o resultado (ou null). */
  private updateSpectrum(now: number): ScanResult | null {
    const sp = this.state.spectrum;
    const job = sp.scan;
    if (!job || now < job.endsAt) return null;
    sp.scan = null;
    sp.scans++;

    const def = getScan(job.depth);
    const pool = this.sourcePool(job.depth);
    let result: ScanResult;

    if (pool.length === 0 || this.rng() < (def?.emptyChance ?? 0)) {
      const text = EMPTY_SCAN_TEXTS[Math.floor(this.rng() * EMPTY_SCAN_TEXTS.length)] ?? 'Só ruído.';
      result = { sourceId: null, text, at: now };
      this.log('> Varredura concluída: nada novo.');
    } else {
      // Fontes da mesma profundidade da varredura têm o dobro de chance.
      const weights = pool.map((s) => (s.depth === job.depth ? 2 : 1));
      let roll = this.rng() * weights.reduce((a, b) => a + b, 0);
      let source = pool[pool.length - 1]!;
      for (let i = 0; i < pool.length; i++) {
        roll -= weights[i]!;
        if (roll < 0) {
          source = pool[i]!;
          break;
        }
      }
      sp.found.push(source.id);
      result = { sourceId: source.id, text: source.lines.join(' '), at: now };
      this.log(`> Nova fonte: ${source.name}.`);
    }

    sp.last = result;
    sp.unseen = true;
    this.updateStory(now); // fontes artificiais liberam transmissões
    return result;
  }

  // ─── História ─────────────────────────────────────────────────────

  /** Transmissões captadas, prontas para decifrar. */
  availableTransmissions(): StoryEntry[] {
    const { done, decoding } = this.state.story;
    return STORY.filter(
      (e) => e.kind === 'transmission' && !done.includes(e.id) && decoding?.id !== e.id && allMet(e.requires, this.state),
    );
  }

  startDecoding(id: string, now = this.clock()): boolean {
    const entry = getStory(id);
    if (!entry || entry.kind !== 'transmission') return false;
    if (this.state.story.decoding) return false;
    if (!this.availableTransmissions().some((e) => e.id === id)) return false;
    const cost = entry.cost ?? 0;
    if (this.state.data < cost) return false;

    this.state.data -= cost;
    this.state.story.decoding = { id, startedAt: now, endsAt: now + (entry.duration ?? 0) * 1000 };
    this.log(`Decifrando "${entry.title}"…`);
    return true;
  }

  decodingProgress(now = this.clock()): number {
    const job = this.state.story.decoding;
    if (!job) return 0;
    const total = job.endsAt - job.startedAt;
    return total <= 0 ? 1 : Math.min(1, Math.max(0, (now - job.startedAt) / total));
  }

  markRead(): void {
    this.state.story.unread = [];
  }

  /** Conclui decifrações prontas e libera entradas de diário. Retorna os IDs novos. */
  private updateStory(now: number): string[] {
    const story = this.state.story;
    const unlocked: string[] = [];
    const complete = (entry: StoryEntry) => {
      story.done.push(entry.id);
      story.unread.push(entry.id);
      unlocked.push(entry.id);
    };

    const job = story.decoding;
    if (job && now >= job.endsAt) {
      story.decoding = null;
      const entry = getStory(job.id);
      if (entry && !story.done.includes(entry.id)) {
        complete(entry);
        this.log(`> Transmissão decifrada: "${entry.title}"`);
      }
    }

    // Repete até estabilizar: uma entrada nova pode liberar a próxima.
    let changed = true;
    while (changed) {
      changed = false;
      for (const entry of STORY) {
        if (entry.kind !== 'log' || story.done.includes(entry.id)) continue;
        if (!allMet(entry.requires, this.state)) continue;
        complete(entry);
        this.log('> Nova entrada no diário.');
        changed = true;
      }
    }

    return unlocked;
  }
}
