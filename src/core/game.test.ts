import { describe, expect, it } from 'vitest';
import { ANTENNAS } from '../data/antennas';
import { SOURCES } from '../data/spectrum';
import { STORY } from '../data/story';
import { UPGRADES, offlineCapS, offlineEfficiency } from '../data/upgrades';
import { Game } from './game';
import { createInitialState } from './state';

const T0 = 1_700_000_000_000;

/** rng fixo para resultados previsíveis. */
function newGame(rng: () => number = () => 0.99): Game {
  const g = new Game(createInitialState(T0), rng);
  g.nextPeakAt = Number.POSITIVE_INFINITY; // picos só nos testes de pico
  return g;
}

describe('Game', () => {
  it('primeira compra sai em poucos toques', () => {
    const g = newGame();
    let taps = 0;
    while (!g.buyAntenna('fio')) {
      g.tap();
      taps++;
    }
    expect(taps).toBeLessThanOrEqual(10);
    expect(g.state.antennas.fio).toBe(1);
  });

  it('decodificador limita o sinal processado', () => {
    const g = newGame();
    g.state.antennas.yagi = 5; // 5 Hz contra 2 Hz de capacidade
    const r = g.rates();
    expect(r.signal).toBe(5);
    expect(r.processed).toBe(2);
    expect(r.saturated).toBe(true);
    expect(r.dataPerSec).toBe(2 * r.bytesPerSignal);
    expect(r.lostDataPerSec).toBe(3 * r.bytesPerSignal);
  });

  it('prévia da antena mostra o ganho real em dados/s', () => {
    const g = newGame();
    g.state.decoder.capacityLevel = 5; // 64 Hz, sobra espaço
    const yagi = ANTENNAS.find((a) => a.id === 'yagi')!;
    const p = g.previewAntenna(yagi, 1);
    expect(p.signal).toBe(1);
    expect(p.data).toBe(1000);
    expect(p.wastedSignal).toBe(0);
  });

  it('prévia da antena com decodificador cheio mostra o desperdício', () => {
    const g = newGame();
    g.state.antennas.yagi = 2; // 2 Hz = capacidade inicial
    const yagi = ANTENNAS.find((a) => a.id === 'yagi')!;
    const p = g.previewAntenna(yagi, 1);
    expect(p.data).toBe(0);
    expect(p.wastedSignal).toBe(1);
  });

  it('prévia do decodificador', () => {
    const g = newGame();
    g.state.antennas.yagi = 5; // 5 Hz contra 2 Hz
    expect(g.previewDecoder('capacity')).toBe(2 * 1000); // 2 → 4 Hz processados
    expect(g.previewDecoder('efficiency')).toBeCloseTo(2 * 250);
  });

  it('sem saturação não há perda', () => {
    const g = newGame();
    g.state.antennas.fio = 1;
    expect(g.rates().lostDataPerSec).toBe(0);
  });

  it('tick online soma a produção', () => {
    const g = newGame();
    g.state.antennas.yagi = 1;
    g.tick(T0 + 2000);
    expect(g.state.data).toBeCloseTo(2 * 1000);
  });

  it('pausa longa vira progresso offline com eficiência e limite', () => {
    const g = newGame();
    g.state.antennas.yagi = 1; // 1 KB/s
    const report = g.tick(T0 + 24 * 3600 * 1000);
    expect(report).not.toBeNull();
    expect(report!.counted).toBe(offlineCapS(0));
    expect(g.state.data).toBeCloseTo(1000 * offlineCapS(0) * offlineEfficiency(0));
  });

  it('gravador e turno melhoram o offline', () => {
    const g = newGame();
    g.state.antennas.yagi = 1;
    g.state.upgrades = { gravador: 5, turno: 4 };
    const report = g.tick(T0 + 48 * 3600 * 1000);
    expect(report!.counted).toBe(24 * 3600);
    expect(g.state.data).toBeCloseTo(1000 * 24 * 3600);
  });

  it('relógio voltando no tempo não tira dados', () => {
    const g = newGame();
    g.state.antennas.yagi = 1;
    g.tick(T0 - 60_000);
    expect(g.state.data).toBe(0);
  });

  it('diário inicial aparece sozinho e transmissão decifra com o tempo', () => {
    const g = newGame();
    g.tick(T0);
    expect(g.state.story.done).toContain('d01-chegada');

    g.state.antennas.fio = 1;
    g.state.data = 1e6;
    g.tick(T0);
    expect(g.availableTransmissions().map((e) => e.id)).toContain('t01-ruido');
    expect(g.startDecoding('t01-ruido', T0)).toBe(true);
    expect(g.startDecoding('t01-ruido', T0)).toBe(false); // já ocupado

    g.tick(T0 + 5_000);
    expect(g.state.story.done).not.toContain('t01-ruido');
    g.tick(T0 + 10_000);
    expect(g.state.story.done).toContain('t01-ruido');
    expect(g.state.story.decoding).toBeNull();
  });
});

describe('picos de ressonância', () => {
  function gameWithPeak(rng: () => number) {
    const g = newGame(rng);
    g.state.antennas.yagi = 1;
    g.state.decoder.capacityLevel = 5;
    g.nextPeakAt = T0;
    g.tick(T0);
    return g;
  }

  it('aparece depois da primeira antena e some sozinho', () => {
    const g = gameWithPeak(() => 0.5);
    expect(g.peak).not.toBeNull();
    g.tick(T0 + 9_000);
    expect(g.peak).toBeNull();
  });

  it('toque longe do pico não pega', () => {
    const g = gameWithPeak(() => 0.5);
    expect(g.claimPeak(g.peak!.x + 0.3, T0 + 500)).toBeNull();
    expect(g.peak).not.toBeNull();
  });

  it('boost multiplica a produção e acaba', () => {
    const g = gameWithPeak(() => 0.1); // < 0.5 → boost
    g.state.antennas.yagi = 50;
    const reward = g.claimPeak(g.peak!.x, T0 + 500);
    expect(reward?.kind).toBe('boost');
    expect(g.rates(T0 + 1000).boost).toBe(7);
    expect(g.rates(T0 + 31_000).boost).toBe(1);
  });

  it('no começo do jogo vira pacote de dados', () => {
    const g = gameWithPeak(() => 0.1);
    g.state.antennas = { fio: 1 };
    const before = g.state.data;
    const reward = g.claimPeak(g.peak!.x, T0 + 500);
    expect(reward?.kind).toBe('bundle');
    expect(g.state.data).toBeGreaterThan(before);
  });
});

describe('melhorias', () => {
  it('ouvido treinado aumenta o toque e respeita o nível máximo', () => {
    const g = newGame();
    g.state.antennas = { fio: 1, yagi: 10 }; // ouvido exige 1 fio
    const base = g.tapBytes();
    g.state.data = 1e12;
    expect(g.buyUpgrade('ouvido')).toBe(true);
    expect(g.tapBytes()).toBeGreaterThan(base);
    g.state.upgrades.ouvido = 10;
    expect(g.buyUpgrade('ouvido')).toBe(false);
  });

  it('turno exige gravador', () => {
    const g = newGame();
    g.state.data = 1e12;
    expect(g.buyUpgrade('turno')).toBe(false);
    g.state.upgrades.gravador = 1;
    expect(g.buyUpgrade('turno')).toBe(true);
  });
});

describe('espectro', () => {
  function unlocked(rng: () => number) {
    const g = newGame(rng);
    g.state.story.done = ['d01-chegada', 't01-ruido', 'd02-caderno', 't02-pulsar'];
    g.state.data = 1e12;
    return g;
  }

  it('bloqueado até decifrar o pulsar', () => {
    const g = newGame();
    g.state.data = 1e12;
    expect(g.startScan(1, T0)).toBe(false);
  });

  it('varredura leva tempo e encontra uma fonte', () => {
    const g = unlocked(() => 0.99);
    expect(g.startScan(1, T0)).toBe(true);
    expect(g.startScan(1, T0)).toBe(false); // uma por vez
    g.tick(T0 + 10_000);
    expect(g.state.spectrum.found).toHaveLength(0);
    g.tick(T0 + 30_000);
    expect(g.state.spectrum.found).toHaveLength(1);
    expect(g.state.spectrum.unseen).toBe(true);
  });

  it('pode vir vazia', () => {
    const g = unlocked(() => 0);
    g.startScan(1, T0);
    g.tick(T0 + 30_000);
    expect(g.state.spectrum.found).toHaveLength(0);
    expect(g.state.spectrum.last?.sourceId).toBeNull();
  });

  it('fonte natural aumenta o sinal', () => {
    const g = newGame();
    g.state.antennas.yagi = 1;
    const before = g.rates().signal;
    g.state.spectrum.found = ['hidrogenio'];
    expect(g.rates().signal).toBeCloseTo(before * 1.15);
  });

  it('fonte artificial libera transmissão', () => {
    const g = unlocked(() => 0.99);
    expect(g.availableTransmissions().map((e) => e.id)).not.toContain('tx1-telemetria');
    g.state.spectrum.found = ['satelite'];
    expect(g.availableTransmissions().map((e) => e.id)).toContain('tx1-telemetria');
  });

  it('varredura concluída offline aparece no relatório', () => {
    const g = unlocked(() => 0.99);
    g.startScan(1, T0);
    const report = g.tick(T0 + 3_600_000);
    expect(report?.scan?.sourceId).toBeTruthy();
  });

  it('toda fonte pode ser encontrada por alguma varredura', () => {
    const g = newGame();
    g.state.story.done = STORY.map((e) => e.id);
    expect(g.sourcePool(3)).toHaveLength(SOURCES.length);
  });
});

describe('conteúdo', () => {
  it('IDs de história e antenas são únicos', () => {
    const storyIds = STORY.map((e) => e.id);
    expect(new Set(storyIds).size).toBe(storyIds.length);
    const antennaIds = ANTENNAS.map((a) => a.id);
    expect(new Set(antennaIds).size).toBe(antennaIds.length);
  });

  it('requisitos apontam para IDs que existem', () => {
    const storyIds = new Set(STORY.map((e) => e.id));
    const antennaIds = new Set(ANTENNAS.map((a) => a.id));
    const sourceIds = new Set(SOURCES.map((s) => s.id));
    const upgradeIds = new Set(UPGRADES.map((u) => u.id as string));
    const reqs = [
      ...STORY.flatMap((e) => e.requires),
      ...ANTENNAS.flatMap((a) => a.requires),
      ...SOURCES.flatMap((s) => s.requires),
      ...UPGRADES.flatMap((u) => u.requires),
    ];
    for (const r of reqs) {
      if (r.kind === 'story') expect(storyIds, r.id).toContain(r.id);
      if (r.kind === 'antenna') expect(antennaIds, r.id).toContain(r.id);
      if (r.kind === 'source') expect(sourceIds, r.id).toContain(r.id);
      if (r.kind === 'upgrade') expect(upgradeIds, r.id).toContain(r.id);
    }
  });

  it('transmissões têm custo e duração', () => {
    for (const e of STORY.filter((s) => s.kind === 'transmission')) {
      expect(e.cost, e.id).toBeTypeOf('number');
      expect(e.duration, e.id).toBeGreaterThan(0);
    }
  });
});
