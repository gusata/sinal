import type { Requirement } from '../core/requirements';

export interface AntennaDef {
  id: string;
  name: string;
  desc: string;
  /** Custo da primeira unidade, em bytes. */
  baseCost: number;
  /** Sinal/s (Hz) gerado por unidade, antes de multiplicadores. */
  baseSignal: number;
  requires: Requirement[];
}

// Para adicionar uma antena nova basta incluir aqui. A UI e a economia leem desta lista.
// Proporção usada: custo ~×11 a ×15 e produção ~×6 a ×8 entre antenas consecutivas.
export const ANTENNAS: readonly AntennaDef[] = [
  {
    id: 'fio',
    name: 'Fio de cobre no telhado',
    desc: 'Um fio esticado entre duas estacas. Pega mais vento que sinal.',
    baseCost: 10e3,
    baseSignal: 0.1,
    requires: [],
  },
  {
    id: 'yagi',
    name: 'Antena Yagi',
    desc: 'Direcional. Aponte para o céu e torça.',
    baseCost: 150e3,
    baseSignal: 1,
    requires: [{ kind: 'antenna', id: 'fio', count: 1 }],
  },
  {
    id: 'parabolica',
    name: 'Parabólica enferrujada',
    desc: 'Ficou anos virada para o chão. Agora olha para cima.',
    baseCost: 2.5e6,
    baseSignal: 7,
    requires: [{ kind: 'antenna', id: 'yagi', count: 10 }],
  },
  {
    id: 'dipolos',
    name: 'Conjunto de dipolos',
    desc: 'Dezenas de hastes alinhadas no campo atrás da estação.',
    baseCost: 40e6,
    baseSignal: 45,
    requires: [{ kind: 'story', id: 't04-sequencia' }],
  },
];

export function getAntenna(id: string): AntennaDef | undefined {
  return ANTENNAS.find((a) => a.id === id);
}
