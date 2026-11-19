import { describe, expect, it } from 'vitest';
import { Game } from '../core/game';
import { createInitialState } from '../core/state';
import { TUTORIAL } from './tutorial';

describe('tutorial', () => {
  it('ids únicos', () => {
    const ids = TUTORIAL.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('todas as dicas geram texto num jogo novo e num avançado', () => {
    const fresh = new Game(createInitialState(0), () => 0.5, () => 0);
    const late = new Game(createInitialState(0), () => 0.5, () => 0);
    late.state.antennas = { fio: 30, yagi: 20, parabolica: 5 };
    late.state.decoder = { capacityLevel: 4, efficiencyLevel: 2 };
    late.state.upgrades = { gravador: 2, turno: 1 };
    for (const g of [fresh, late]) {
      for (const step of TUTORIAL) {
        const lines = step.lines(g);
        expect(lines.length, step.id).toBeGreaterThan(0);
        for (const l of lines) expect(l, step.id).not.toMatch(/undefined|NaN/);
        step.when(g);
        step.doneWhen?.(g);
      }
    }
  });

  it('a primeira dica aparece logo no início', () => {
    const g = new Game(createInitialState(0), () => 0.5, () => 0);
    expect(TUTORIAL[0]!.when(g)).toBe(true);
  });
});
