import type { Requirement } from '../core/requirements';

// Melhorias da estação: upgrades com nível máximo que mexem em toque, picos e offline.

export type UpgradeId = 'ouvido' | 'reflexo' | 'gravador' | 'turno';

export interface UpgradeDef {
  id: UpgradeId;
  name: string;
  desc: string;
  maxLevel: number;
  baseCost: number;
  costGrowth: number;
  requires: Requirement[];
  /** Texto do efeito no nível dado (para mostrar "atual → próximo"). */
  effect(level: number): string;
}

// ─── Efeitos (fonte única da verdade, usados pelo Game e pela UI) ───

/** Fração do sinal/s somada a cada toque. */
export const tapSignalFraction = (level: number) => 0.05 + 0.02 * level;
/** Segundos para tocar num pico de ressonância antes de ele sumir. */
export const peakWindowS = (level: number) => 3 + level;
/** Fração da produção que rende offline. */
export const offlineEfficiency = (level: number) => Math.min(1, 0.5 + 0.1 * level);
/** Tempo máximo contabilizado offline, em segundos. */
export const offlineCapS = (level: number) => (8 + 4 * level) * 3600;

export const UPGRADES: readonly UpgradeDef[] = [
  {
    id: 'ouvido',
    name: 'Ouvido treinado',
    desc: 'Cada toque capta uma parte maior do sinal das antenas.',
    maxLevel: 10,
    baseCost: 50e3,
    costGrowth: 4,
    requires: [{ kind: 'antenna', id: 'fio', count: 1 }],
    effect: (l) => `toque +${Math.round(tapSignalFraction(l) * 100)}% do sinal processado`,
  },
  {
    id: 'reflexo',
    name: 'Reflexo',
    desc: 'Picos de ressonância ficam mais tempo na tela.',
    maxLevel: 3,
    baseCost: 2e6,
    costGrowth: 6,
    requires: [{ kind: 'totalData', amount: 1e6 }],
    effect: (l) => `picos duram ${peakWindowS(l)}s`,
  },
  {
    id: 'gravador',
    name: 'Gravador de fita',
    desc: 'Grava o que as antenas captam enquanto você está fora.',
    maxLevel: 5,
    baseCost: 1e6,
    costGrowth: 5,
    requires: [{ kind: 'antenna', id: 'yagi', count: 1 }],
    effect: (l) => `offline rende ${Math.round(offlineEfficiency(l) * 100)}%`,
  },
  {
    id: 'turno',
    name: 'Turno estendido',
    desc: 'Mais fitas na estante: grava por mais tempo.',
    maxLevel: 4,
    baseCost: 5e6,
    costGrowth: 6,
    requires: [{ kind: 'upgrade', id: 'gravador', level: 1 }],
    effect: (l) => `offline até ${offlineCapS(l) / 3600}h`,
  },
];

export function getUpgrade(id: string): UpgradeDef | undefined {
  return UPGRADES.find((u) => u.id === id);
}
