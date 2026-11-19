import type { GameState } from './state';

/** Condição para desbloquear algo (antena, entrada de história, upgrade…). */
export type Requirement =
  | { kind: 'antenna'; id: string; count: number }
  | { kind: 'story'; id: string }
  | { kind: 'totalData'; amount: number }
  | { kind: 'decoder'; upgrade: 'capacity' | 'efficiency'; level: number }
  | { kind: 'upgrade'; id: string; level: number }
  | { kind: 'source'; id: string };

export function isMet(req: Requirement, s: GameState): boolean {
  switch (req.kind) {
    case 'antenna':
      return (s.antennas[req.id] ?? 0) >= req.count;
    case 'story':
      return s.story.done.includes(req.id);
    case 'totalData':
      return s.totalData >= req.amount;
    case 'decoder':
      return (req.upgrade === 'capacity' ? s.decoder.capacityLevel : s.decoder.efficiencyLevel) >= req.level;
    case 'upgrade':
      return (s.upgrades[req.id] ?? 0) >= req.level;
    case 'source':
      return s.spectrum.found.includes(req.id);
  }
}

/** Lista vazia = sempre liberado. */
export function allMet(reqs: readonly Requirement[], s: GameState): boolean {
  return reqs.every((r) => isMet(r, s));
}
