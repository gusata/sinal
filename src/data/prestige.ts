import type { Requirement } from '../core/requirements';

// Prestígio — "Silêncio".
// Encerrar o turno reinicia a economia (dados, antenas, decodificador, melhorias)
// e dá CLAREZA. O Diário e as fontes do Espectro ficam (são memórias da estação).
//
// Clareza tem dois usos que não competem entre si:
//  - cada ponto GANHO dá +2% de dados para sempre (gastar não tira o bônus);
//  - os pontos podem ser GASTOS na árvore abaixo.

/** Requisito para o primeiro Silêncio. Depois do primeiro, fica sempre disponível. */
export const SILENCE_REQUIRES: Requirement[] = [{ kind: 'story', id: 'd10-fim-arco2' }];

/** Bônus de dados por ponto de Clareza ganho. */
export const CLARITY_BONUS = 0.02;

/** Clareza ganha ao encerrar um turno com `totalData` bytes captados. */
export function clarityForRun(totalData: number): number {
  return Math.floor(Math.sqrt(Math.max(0, totalData) / 1e9));
}

export type PrestigeNodeId = 'heranca' | 'eco' | 'afinacao' | 'paciencia' | 'memoria' | 'antecessor';

export interface PrestigeNodeDef {
  id: PrestigeNodeId;
  name: string;
  desc: string;
  maxLevel: number;
  /** Custo do nível n+1 = baseCost × (n+1) pontos. */
  baseCost: number;
  effect(level: number): string;
}

// ─── Efeitos (fonte única da verdade) ───
export const herancaStart = (l: number) => ({ fio: 10 * l, yagi: 3 * l });
export const ecoTapMult = (l: number) => 1 + 0.5 * l;
export const afinacaoPeakMult = (l: number) => 1 - 0.15 * l;
export const pacienciaScanMult = (l: number) => 1 - 0.2 * l;
export const memoriaOfflineBonus = (l: number) => 0.1 * l;
export const antecessorDecodeMult = (l: number) => 1 - 0.25 * l;

export const PRESTIGE_NODES: readonly PrestigeNodeDef[] = [
  {
    id: 'heranca',
    name: 'Herança',
    desc: 'O novo operador encontra antenas já montadas.',
    maxLevel: 3,
    baseCost: 2,
    effect: (l) => {
      const s = herancaStart(l);
      return l === 0 ? 'começa sem antenas' : `começa com ${s.fio} fios e ${s.yagi} Yagis`;
    },
  },
  {
    id: 'eco',
    name: 'Eco',
    desc: 'Os toques ressoam com os turnos anteriores.',
    maxLevel: 5,
    baseCost: 1,
    effect: (l) => `toques ×${ecoTapMult(l).toFixed(1)}`,
  },
  {
    id: 'afinacao',
    name: 'Afinação',
    desc: 'Picos de ressonância aparecem com mais frequência.',
    maxLevel: 3,
    baseCost: 2,
    effect: (l) => `intervalo entre picos −${Math.round((1 - afinacaoPeakMult(l)) * 100)}%`,
  },
  {
    id: 'paciencia',
    name: 'Paciência',
    desc: 'Você já sabe onde procurar no céu.',
    maxLevel: 3,
    baseCost: 2,
    effect: (l) => `varreduras −${Math.round((1 - pacienciaScanMult(l)) * 100)}% de tempo`,
  },
  {
    id: 'memoria',
    name: 'Memória',
    desc: 'A estação continua trabalhando direito quando você não está.',
    maxLevel: 3,
    baseCost: 3,
    effect: (l) => `offline +${Math.round(memoriaOfflineBonus(l) * 100)}%`,
  },
  {
    id: 'antecessor',
    name: 'Notas do antecessor',
    desc: 'O caderno ajuda a decifrar mais rápido.',
    maxLevel: 3,
    baseCost: 2,
    effect: (l) => `decifrar −${Math.round((1 - antecessorDecodeMult(l)) * 100)}% de tempo`,
  },
];

export function getPrestigeNode(id: string): PrestigeNodeDef | undefined {
  return PRESTIGE_NODES.find((n) => n.id === id);
}

/** Nomes dos operadores que assumem a estação a cada Silêncio. */
export const OPERATOR_NAMES: readonly string[] = [
  'Irene Vasconcelos',
  'Tomás Albuquerque',
  'Lia Moreno',
  'Benedito Sá',
  'Ruth Carvalhal',
  'Caio Lemos',
  'Odete Brandão',
  'Félix Aranha',
  'Marta Quintela',
  'Nuno Ferraz',
  'Helena Duarte',
  'Joaquim Paiva',
];
