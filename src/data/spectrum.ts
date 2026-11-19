import type { Requirement } from '../core/requirements';

// Espectro: o jogador paga dados para varrer o céu. A varredura leva tempo real
// (inclusive offline) e pode encontrar uma FONTE ou nada.
//
// Fonte natural    → bônus permanente de sinal (soma: +10% e +15% = +25%).
// Fonte artificial → libera transmissões novas no Diário (story.ts, requisito kind 'source').

export const SPECTRUM_REQUIRES: Requirement[] = [{ kind: 'story', id: 't02-pulsar' }];

export interface ScanDef {
  depth: 1 | 2 | 3;
  name: string;
  desc: string;
  cost: number;
  /** Segundos. */
  duration: number;
  /** Chance de não encontrar nada, mesmo havendo fontes disponíveis. */
  emptyChance: number;
  requires: Requirement[];
}

export const SCANS: readonly ScanDef[] = [
  {
    depth: 1,
    name: 'Varredura rápida',
    desc: 'Uma passada pela faixa mais barulhenta do céu.',
    cost: 200e3,
    duration: 30,
    emptyChance: 0.4,
    requires: [],
  },
  {
    depth: 2,
    name: 'Varredura profunda',
    desc: 'A parabólica para em cada grau por alguns segundos.',
    cost: 20e6,
    duration: 5 * 60,
    emptyChance: 0.25,
    requires: [{ kind: 'antenna', id: 'parabolica', count: 1 }],
  },
  {
    depth: 3,
    name: 'Varredura total',
    desc: 'Todas as antenas, todo o céu, a noite inteira.',
    cost: 5e9,
    duration: 60 * 60,
    emptyChance: 0.1,
    requires: [{ kind: 'antenna', id: 'dipolos', count: 1 }],
  },
];

export interface SourceDef {
  id: string;
  name: string;
  kind: 'natural' | 'artificial';
  /** Frequência mostrada (só sabor). */
  freq: string;
  /** Profundidade mínima de varredura para encontrar. */
  depth: 1 | 2 | 3;
  /** Só naturais: bônus de sinal (0.1 = +10%). */
  signalBonus: number;
  requires: Requirement[];
  lines: string[];
}

export const SOURCES: readonly SourceDef[] = [
  // ─── Naturais ───
  {
    id: 'vela',
    name: 'Pulsar de Vela',
    kind: 'natural',
    freq: '843.00 MHz',
    depth: 1,
    signalBonus: 0.1,
    requires: [],
    lines: ['Outra estrela morta, girando onze vezes por segundo.', 'Começo a gostar delas.'],
  },
  {
    id: 'hidrogenio',
    name: 'Linha do hidrogênio',
    kind: 'natural',
    freq: '1420.41 MHz',
    depth: 1,
    signalBonus: 0.15,
    requires: [],
    lines: ['O elemento mais comum do universo tem uma nota só.', 'Dizem que quem quisesse ser ouvido escolheria esta frequência.'],
  },
  {
    id: 'jupiter',
    name: 'Tempestades de Júpiter',
    kind: 'natural',
    freq: '22.20 MHz',
    depth: 1,
    signalBonus: 0.1,
    requires: [],
    lines: ['Parece mar quebrando numa praia de pedras.', 'É um planeta inteiro gritando.'],
  },
  {
    id: 'quasar',
    name: 'Quasar 3C 273',
    kind: 'natural',
    freq: '5.00 GHz',
    depth: 2,
    signalBonus: 0.25,
    requires: [],
    lines: ['A luz que chega aqui saiu de lá há dois bilhões de anos.', 'Estou ouvindo algo que já não existe.'],
  },
  {
    id: 'magnetar',
    name: 'Magnetar',
    kind: 'natural',
    freq: '1.38 GHz',
    depth: 2,
    signalBonus: 0.3,
    requires: [],
    lines: ['Um estalo seco, forte o bastante para saturar tudo.', 'Depois, nada por horas.'],
  },
  {
    id: 'fundo',
    name: 'Radiação cósmica de fundo',
    kind: 'natural',
    freq: '160.20 GHz',
    depth: 3,
    signalBonus: 0.5,
    requires: [],
    lines: ['O ruído do primeiro dia de tudo.', 'Estava aqui desde o começo, atrás de todo o resto.'],
  },
  // ─── Artificiais (liberam transmissões) ───
  {
    id: 'satelite',
    name: 'Satélite abandonado',
    kind: 'artificial',
    freq: '137.62 MHz',
    depth: 1,
    signalBonus: 0,
    requires: [{ kind: 'story', id: 'd02-caderno' }],
    lines: ['Um bipe regular, cansado.', 'Alguém lançou isso e se esqueceu de desligar.'],
  },
  {
    id: 'faixa-caderno',
    name: 'A frequência circulada',
    kind: 'artificial',
    freq: '1612.23 MHz',
    depth: 2,
    signalBonus: 0,
    requires: [{ kind: 'story', id: 'd03-circulos' }],
    lines: ['O número que aparece mais vezes no caderno.', 'Ele circulou três vezes. Depois riscou.'],
  },
  {
    id: 'ida-volta',
    name: 'Ida e volta',
    kind: 'artificial',
    freq: '8.42 GHz',
    depth: 3,
    signalBonus: 0,
    requires: [{ kind: 'story', id: 't05-intervalo' }],
    lines: ['Um sinal que parece sair daqui mesmo.', 'E voltar.'],
  },
];

/** Textos para quando a varredura não encontra nada. */
export const EMPTY_SCAN_TEXTS: readonly string[] = [
  'Só ruído. O céu estava ocupado consigo mesmo.',
  'Nada. Um avião passou e estragou metade da leitura.',
  'Estática limpa. Quase bonita, se você não estiver procurando nada.',
  'Um pico às 02h40. Era o micro-ondas.',
  'Silêncio, de um lado a outro da faixa.',
  'Nada novo. Os pulsares de sempre mandaram lembranças.',
];

export function getSource(id: string): SourceDef | undefined {
  return SOURCES.find((s) => s.id === id);
}

export function getScan(depth: number): ScanDef | undefined {
  return SCANS.find((s) => s.depth === depth);
}
