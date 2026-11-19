import { createInitialState, SAVE_VERSION, type BuyMode, type GameState, type ScanResult } from './state';

/**
 * Migrações de save. Chave = versão de origem; a função converte para versão + 1.
 * Campos novos com valor padrão não precisam de migração (o sanitize preenche);
 * migração é para quando um campo muda de significado ou de lugar.
 */
type RawSave = Record<string, unknown> & { version?: number };
const MIGRATIONS: Record<number, (s: RawSave) => RawSave> = {
  // v2: upgrades, boost e espectro (campos novos, preenchidos pelo sanitize).
  1: (s) => ({ ...s, version: 2 }),
};

export class SaveError extends Error {}

export function serialize(state: GameState): string {
  return JSON.stringify(state);
}

export function deserialize(raw: string, now = Date.now()): GameState {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new SaveError('Save corrompido (JSON inválido).');
  }
  if (!parsed || typeof parsed !== 'object') throw new SaveError('Save inválido.');

  let s = parsed as RawSave;
  let version = typeof s.version === 'number' ? s.version : 1;
  if (version > SAVE_VERSION) throw new SaveError('Save de uma versão mais nova do jogo.');
  while (version < SAVE_VERSION) {
    const migrate = MIGRATIONS[version];
    if (!migrate) throw new SaveError(`Sem migração para a versão ${version}.`);
    s = migrate(s);
    version++;
  }

  return sanitize(s, now);
}

// ─── Sanitização: garante que o estado carregado tem todos os campos e tipos certos ───

function num(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 0 ? v : fallback;
}

function obj(v: unknown): Record<string, unknown> {
  return v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : {};
}

function strArray(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [];
}

function sanitize(s: RawSave, now: number): GameState {
  const base = createInitialState(now);
  const decoder = obj(s.decoder);
  const story = obj(s.story);
  const stats = obj(s.stats);
  const settings = obj(s.settings);
  const decoding = obj(story.decoding);
  const spectrum = obj(s.spectrum);
  const scan = obj(spectrum.scan);
  const last = obj(spectrum.last);
  const boost = obj(s.boost);
  const prestige = obj(s.prestige);
  const prestigeNodes: Record<string, number> = {};
  for (const [id, level] of Object.entries(obj(prestige.nodes))) {
    const n = Math.floor(num(level, 0));
    if (n > 0) prestigeNodes[id] = n;
  }
  const bool = (v: unknown, fallback: boolean) => (typeof v === 'boolean' ? v : fallback);

  const antennas: Record<string, number> = {};
  for (const [id, count] of Object.entries(obj(s.antennas))) {
    const n = Math.floor(num(count, 0));
    if (n > 0) antennas[id] = n;
  }

  const upgrades: Record<string, number> = {};
  for (const [id, level] of Object.entries(obj(s.upgrades))) {
    const n = Math.floor(num(level, 0));
    if (n > 0) upgrades[id] = n;
  }

  const lastResult: ScanResult | null =
    typeof last.text === 'string'
      ? { sourceId: typeof last.sourceId === 'string' ? last.sourceId : null, text: last.text, at: num(last.at, now) }
      : null;

  const buyMode: BuyMode = settings.buyMode === 10 || settings.buyMode === 'max' ? settings.buyMode : 1;

  return {
    version: SAVE_VERSION,
    data: num(s.data, 0),
    totalData: num(s.totalData, 0),
    lifetimeData: num(s.lifetimeData, 0),
    antennas,
    decoder: {
      capacityLevel: Math.floor(num(decoder.capacityLevel, 0)),
      efficiencyLevel: Math.floor(num(decoder.efficiencyLevel, 0)),
    },
    upgrades,
    boost:
      typeof boost.endsAt === 'number' && boost.endsAt > now
        ? { mult: num(boost.mult, 1), endsAt: boost.endsAt }
        : null,
    story: {
      done: strArray(story.done),
      unread: strArray(story.unread),
      decoding:
        typeof decoding.id === 'string'
          ? { id: decoding.id, startedAt: num(decoding.startedAt, now), endsAt: num(decoding.endsAt, now) }
          : null,
    },
    spectrum: {
      scan:
        typeof scan.depth === 'number'
          ? { depth: scan.depth, startedAt: num(scan.startedAt, now), endsAt: num(scan.endsAt, now) }
          : null,
      found: strArray(spectrum.found),
      scans: Math.floor(num(spectrum.scans, 0)),
      last: lastResult,
      unseen: spectrum.unseen === true,
    },
    tutorial: { done: strArray(obj(s.tutorial).done) },
    prestige: {
      clarity: Math.floor(num(prestige.clarity, 0)),
      spent: Math.floor(num(prestige.spent, 0)),
      silences: Math.floor(num(prestige.silences, 0)),
      nodes: prestigeNodes,
      operators: strArray(prestige.operators),
    },
    stats: {
      taps: Math.floor(num(stats.taps, 0)),
      peaks: Math.floor(num(stats.peaks, 0)),
      createdAt: num(stats.createdAt, now),
      playTime: num(stats.playTime, 0),
    },
    settings: {
      haptics: bool(settings.haptics, base.settings.haptics),
      crt: bool(settings.crt, base.settings.crt),
      sound: bool(settings.sound, base.settings.sound),
      ambient: bool(settings.ambient, base.settings.ambient),
      notifications: bool(settings.notifications, base.settings.notifications),
      buyMode,
    },
    lastSeen: num(s.lastSeen, now),
  };
}

// ─── Exportar / importar (texto que o jogador pode copiar e colar) ───

export function exportSave(state: GameState): string {
  const bytes = new TextEncoder().encode(serialize(state));
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

export function importSave(text: string, now = Date.now()): GameState {
  let json: string;
  try {
    const bin = atob(text.trim());
    json = new TextDecoder().decode(Uint8Array.from(bin, (c) => c.charCodeAt(0)));
  } catch {
    throw new SaveError('Código de save inválido.');
  }
  return deserialize(json, now);
}
