import { describe, expect, it } from 'vitest';
import { clarityForRun } from '../data/prestige';
import { Game, type GameEvent } from './game';
import { createInitialState } from './state';

const T0 = 1_700_000_000_000;

function lateGame(): Game {
  const g = new Game(createInitialState(T0), () => 0.5, () => T0);
  g.nextPeakAt = Number.POSITIVE_INFINITY;
  const s = g.state;
  s.story.done = ['d01-chegada', 'd05-ultima-pagina', 't10-coro', 'd10-fim-arco2'];
  s.spectrum.found = ['hidrogenio'];
  s.totalData = 4e12; // sqrt(4000) = 63
  s.data = 1e12;
  s.antennas = { fio: 100, yagi: 50, radiotelescopio: 3 };
  s.decoder = { capacityLevel: 10, efficiencyLevel: 8 };
  s.upgrades = { gravador: 3 };
  return g;
}

describe('Silêncio (prestígio)', () => {
  it('fórmula da Clareza', () => {
    expect(clarityForRun(0)).toBe(0);
    expect(clarityForRun(0.99e9)).toBe(0);
    expect(clarityForRun(1e9)).toBe(1);
    expect(clarityForRun(4e12)).toBe(63);
  });

  it('bloqueado antes do fim do Arco 2', () => {
    const g = new Game(createInitialState(T0), () => 0.5, () => T0);
    g.state.totalData = 1e15;
    expect(g.isSilenceUnlocked()).toBe(false);
    expect(g.silence()).toBeNull();
  });

  it('reinicia a economia e mantém diário, fontes e Clareza', () => {
    const g = lateGame();
    const events: GameEvent[] = [];
    g.onEvent((e) => events.push(e));

    const r = g.silence(T0);
    expect(r).toEqual({ clarity: 63, operator: g.state.prestige.operators[0] });

    const s = g.state;
    expect(s.data).toBe(0);
    expect(s.totalData).toBe(0);
    expect(s.antennas).toEqual({});
    expect(s.decoder).toEqual({ capacityLevel: 0, efficiencyLevel: 0 });
    expect(s.upgrades).toEqual({});
    expect(s.story.done).toContain('d10-fim-arco2');
    expect(s.spectrum.found).toEqual(['hidrogenio']);
    expect(s.prestige.clarity).toBe(63);
    expect(s.prestige.silences).toBe(1);
    expect(events.some((e) => e.type === 'silence')).toBe(true);
  });

  it('depois do primeiro, fica disponível sem refazer o arco (mas exige Clareza ≥ 1)', () => {
    const g = lateGame();
    g.silence(T0);
    g.state.story.done = [];
    expect(g.isSilenceUnlocked()).toBe(true);
    expect(g.canSilence()).toBe(false); // totalData zerado
    g.state.totalData = 1e9;
    expect(g.canSilence()).toBe(true);
  });

  it('Clareza aumenta dados por pulso e toques', () => {
    const g = new Game(createInitialState(T0), () => 0.5, () => T0);
    const before = g.bytesPerPulse();
    g.state.prestige.clarity = 50; // +100%
    expect(g.bytesPerPulse()).toBeCloseTo(before * 2);
  });

  it('árvore: gastar não reduz o bônus, respeita custo e nível máximo', () => {
    const g = new Game(createInitialState(T0), () => 0.5, () => T0);
    g.state.prestige.clarity = 10;
    const bonus = g.clarityMultiplier();
    expect(g.buyNode('eco')).toBe(true); // custo 1
    expect(g.buyNode('eco')).toBe(true); // custo 2
    expect(g.availableClarity()).toBe(7);
    expect(g.clarityMultiplier()).toBe(bonus);
    g.state.prestige.nodes.eco = 5;
    expect(g.buyNode('eco')).toBe(false);
  });

  it('Herança dá antenas no começo do turno', () => {
    const g = lateGame();
    g.state.prestige.nodes.heranca = 2;
    g.silence(T0);
    expect(g.state.antennas).toEqual({ fio: 20, yagi: 6 });
  });

  it('Paciência e Notas do antecessor encurtam varreduras e decifrações', () => {
    const g = new Game(createInitialState(T0), () => 0.5, () => T0);
    g.state.story.done = ['d01-chegada', 't01-ruido', 'd02-caderno', 't02-pulsar'];
    g.state.data = 1e12;
    g.state.prestige.nodes = { paciencia: 3 }; // −60%
    g.startScan(1, T0);
    expect(g.state.spectrum.scan!.endsAt - T0).toBe(30_000 * 0.4);
  });
});

describe('eventos', () => {
  it('compra e decifração emitem eventos', () => {
    const g = new Game(createInitialState(T0), () => 0.5, () => T0);
    g.nextPeakAt = Number.POSITIVE_INFINITY;
    const events: string[] = [];
    g.onEvent((e) => events.push(e.type));
    g.state.data = 1e6;
    g.buyAntenna('fio');
    g.startDecoding('t01-ruido', T0);
    g.tick(T0 + 10_000);
    expect(events).toContain('buy');
    expect(events).toContain('decoded');
  });
});
