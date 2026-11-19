// O decodificador converte Sinal (Hz) em Dados (bytes).
// Capacidade: quanto sinal por segundo ele processa (o excesso se perde).
// Eficiência: quantos bytes saem de cada unidade de sinal.

export type DecoderUpgrade = 'capacity' | 'efficiency';

export interface DecoderUpgradeDef {
  id: DecoderUpgrade;
  name: string;
  desc: string;
  baseCost: number;
  costGrowth: number;
}

export const DECODER_UPGRADES: Record<DecoderUpgrade, DecoderUpgradeDef> = {
  capacity: {
    id: 'capacity',
    name: 'Capacidade',
    desc: 'Dobra o sinal processado por segundo.',
    baseCost: 50e3,
    costGrowth: 3.5,
  },
  efficiency: {
    id: 'efficiency',
    name: 'Eficiência',
    desc: '+25% de dados por pulso de sinal.',
    baseCost: 300e3,
    costGrowth: 5,
  },
};

const BASE_CAPACITY = 2; // Hz
const BASE_BYTES_PER_SIGNAL = 1000; // 1 KB por pulso

export function decoderCapacity(level: number): number {
  return BASE_CAPACITY * 2 ** level;
}

export function bytesPerSignal(level: number): number {
  return BASE_BYTES_PER_SIGNAL * 1.25 ** level;
}

export function decoderUpgradeCost(kind: DecoderUpgrade, level: number): number {
  const def = DECODER_UPGRADES[kind];
  return def.baseCost * def.costGrowth ** level;
}

/** Nome da tecnologia do decodificador, pela soma dos níveis. Puramente cosmético. */
export function decoderTechName(totalLevel: number): string {
  const tiers = ['Válvulas', 'Transistores', 'Chip DSP', 'FPGA', 'Computação quântica', 'Algo que você não construiu'];
  return tiers[Math.min(Math.floor(totalLevel / 4), tiers.length - 1)]!;
}
