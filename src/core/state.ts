// Formato do estado salvo. Ao mudar a estrutura: incremente SAVE_VERSION
// e adicione uma migração em save.ts.

export const SAVE_VERSION = 2;

export type BuyMode = 1 | 10 | 'max';

export interface DecodingJob {
  id: string;
  startedAt: number; // timestamp ms
  endsAt: number; // timestamp ms
}

export interface ScanJob {
  depth: number;
  startedAt: number;
  endsAt: number;
}

export interface ScanResult {
  /** Fonte encontrada, ou null se a varredura veio vazia. */
  sourceId: string | null;
  /** Texto exibido quando veio vazia. */
  text: string;
  at: number;
}

export interface Boost {
  mult: number;
  endsAt: number;
}

export interface GameState {
  version: number;
  /** Dados disponíveis para gastar (em bytes). */
  data: number;
  /** Total de dados ganhos nesta rodada (reseta no prestígio). */
  totalData: number;
  /** Total de dados ganhos desde sempre. */
  lifetimeData: number;
  /** Quantidade de cada antena, por id. */
  antennas: Record<string, number>;
  decoder: {
    capacityLevel: number;
    efficiencyLevel: number;
  };
  /** Nível de cada melhoria da estação, por id (data/upgrades.ts). */
  upgrades: Record<string, number>;
  /** Multiplicador temporário de produção (pico de ressonância). */
  boost: Boost | null;
  story: {
    /** Entradas concluídas (lidas/decifradas), em ordem. */
    done: string[];
    /** Entradas novas que o jogador ainda não viu no Diário. */
    unread: string[];
    decoding: DecodingJob | null;
  };
  spectrum: {
    scan: ScanJob | null;
    /** Fontes descobertas, em ordem. */
    found: string[];
    scans: number;
    last: ScanResult | null;
    /** Há resultado de varredura que o jogador ainda não viu. */
    unseen: boolean;
  };
  tutorial: {
    /** Dicas já vistas (ids de data/tutorial.ts). */
    done: string[];
  };
  stats: {
    taps: number;
    peaks: number;
    createdAt: number;
    /** Segundos jogados com o app aberto. */
    playTime: number;
  };
  settings: {
    haptics: boolean;
    crt: boolean;
    buyMode: BuyMode;
  };
  /** Último instante processado pelo jogo (para progresso offline). */
  lastSeen: number;
}

export function createInitialState(now = Date.now()): GameState {
  return {
    version: SAVE_VERSION,
    data: 0,
    totalData: 0,
    lifetimeData: 0,
    antennas: {},
    decoder: { capacityLevel: 0, efficiencyLevel: 0 },
    upgrades: {},
    boost: null,
    story: { done: [], unread: [], decoding: null },
    spectrum: { scan: null, found: [], scans: 0, last: null, unseen: false },
    tutorial: { done: [] },
    stats: { taps: 0, peaks: 0, createdAt: now, playTime: 0 },
    settings: { haptics: true, crt: true, buyMode: 1 },
    lastSeen: now,
  };
}
