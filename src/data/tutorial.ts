import type { Game } from '../core/game';
import { formatBytes, formatHz } from '../core/format';
import { offlineCapS, offlineEfficiency } from './upgrades';

// Dicas contextuais. Cada uma aparece UMA vez, na primeira vez que `when` for verdadeiro,
// na ordem desta lista (só uma por vez). Somem ao tocar em "Entendi" ou quando `doneWhen` acontece.
//
// `target`: seletor CSS do elemento que ganha destaque enquanto a dica está aberta.

export interface TutorialStep {
  id: string;
  title: string;
  lines: (game: Game) => string[];
  when: (game: Game) => boolean;
  /** Fecha sozinha quando isto acontecer (o jogador já fez o que a dica pedia). */
  doneWhen?: (game: Game) => boolean;
  target?: string;
}

const hasAnyAntenna = (g: Game) => Object.values(g.state.antennas).some((n) => n > 0);

export const TUTORIAL: readonly TutorialStep[] = [
  {
    id: 'tocar',
    title: 'Bem-vindo à estação',
    lines: () => [
      'Toque no osciloscópio para captar sinal.',
      'Cada toque vira DADOS (B, KB, MB…), a moeda do jogo.',
    ],
    when: () => true,
    doneWhen: (g) => g.state.stats.taps >= 8,
    target: '.scope',
  },
  {
    id: 'antena',
    title: 'Sua primeira antena',
    lines: () => [
      'Você já pode comprar um Fio de cobre na aba Antenas.',
      'Antenas captam sinal sozinhas, sem você precisar tocar.',
    ],
    when: (g) => g.state.data >= 10e3 && !hasAnyAntenna(g),
    doneWhen: hasAnyAntenna,
    target: '[data-tutorial="antenna-fio"]',
  },
  {
    id: 'hz',
    title: 'Hz e KB',
    lines: (g) => {
      const r = g.rates();
      return [
        'Antenas captam SINAL, medido em Hz (pulsos por segundo).',
        `O decodificador transforma sinal em dados: hoje, 1 Hz = ${formatBytes(r.bytesPerSignal)}/s.`,
        'Em cada antena você vê quantos Hz ela capta e quanto isso rende em KB/s.',
      ];
    },
    when: hasAnyAntenna,
    target: '.hud-rate',
  },
  {
    id: 'diario',
    title: 'Transmissão captada',
    lines: () => [
      'Tem algo para decifrar na aba Diário.',
      'Decifrar custa dados e leva tempo real, e continua mesmo com o app fechado.',
    ],
    when: (g) => g.availableTransmissions().length > 0,
    doneWhen: (g) => !!g.state.story.decoding,
    target: '[data-tab="journal"]',
  },
  {
    id: 'saturado',
    title: 'Decodificador cheio',
    lines: (g) => {
      const r = g.rates();
      return [
        `Suas antenas captam ${formatHz(r.signal)}, mas o decodificador só processa ${formatHz(r.capacity)}.`,
        'O excesso se perde (o topo da tela mostra quanto).',
        'Melhore a Capacidade na aba Equip. Até lá, mais antenas não rendem nada.',
      ];
    },
    when: (g) => g.rates().saturated,
    target: '[data-tab="decoder"]',
  },
  {
    id: 'pico',
    title: 'Pico de ressonância!',
    lines: () => [
      'Toque no anel dourado antes que ele se feche.',
      'Ele dá produção ×7 por 30s, ou um pacote de dados.',
    ],
    when: (g) => !!g.peak,
    doneWhen: (g) => g.state.stats.peaks >= 1,
    target: '.scope',
  },
  {
    id: 'marcos',
    title: 'Marcos',
    lines: () => [
      'Com 10, 25, 50, 100 e 200 unidades de uma antena, a produção dela DOBRA.',
      'Cada antena mostra quanto falta para o próximo marco.',
    ],
    when: (g) => Object.values(g.state.antennas).some((n) => n >= 5),
  },
  {
    id: 'eficiencia',
    title: 'Eficiência',
    lines: () => [
      'Capacidade decide QUANTOS Hz o decodificador aguenta.',
      'Eficiência decide quantos KB saem de cada Hz, e vale para tudo, inclusive os toques.',
    ],
    when: (g) => g.state.decoder.capacityLevel >= 2,
    target: '[data-tab="decoder"]',
  },
  {
    id: 'espectro',
    title: 'Espectro liberado',
    lines: () => [
      'Na aba Espectro você pode varrer o céu atrás de fontes.',
      'Fontes naturais aumentam seu sinal para sempre. Artificiais trazem transmissões novas.',
    ],
    when: (g) => g.isSpectrumUnlocked(),
    doneWhen: (g) => g.state.spectrum.scans > 0 || !!g.state.spectrum.scan,
    target: '[data-tab="spectrum"]',
  },
  {
    id: 'offline',
    title: 'Fora da estação',
    lines: (g) => [
      `Com o app fechado, as antenas continuam: rendem ${Math.round(
        offlineEfficiency(g.upgradeLevel('gravador')) * 100,
      )}% por até ${offlineCapS(g.upgradeLevel('turno')) / 3600}h.`,
      'Gravador de fita e Turno estendido (aba Equip.) melhoram isso.',
    ],
    when: (g) => g.upgradeLevel('gravador') > 0 || g.state.totalData >= 1e6,
    target: '[data-tab="decoder"]',
  },
];

// ─── Glossário (aba Config → Como funciona) ───

export const GLOSSARY: readonly { title: string; text: string }[] = [
  {
    title: 'Sinal (Hz)',
    text: 'O que as antenas captam, em pulsos por segundo. Sozinho não vale nada: precisa passar pelo decodificador para virar dados.',
  },
  {
    title: 'Dados (B, KB, MB…)',
    text: 'A moeda do jogo. Saem do decodificador e dos seus toques. Servem para comprar antenas e melhorias, decifrar transmissões e varrer o céu.',
  },
  {
    title: 'Decodificador',
    text: 'Converte Hz em KB/s. Capacidade é o máximo de Hz que ele processa (o excesso se perde). Eficiência é quantos KB cada Hz vira.',
  },
  {
    title: 'Toques',
    text: 'Cada toque no osciloscópio dá 1 Hz + uma parte do sinal processado, convertido na hora. "Ouvido treinado" aumenta essa parte.',
  },
  {
    title: 'Marcos',
    text: 'Com 10, 25, 50, 100 e 200 unidades de uma mesma antena, a produção dela dobra.',
  },
  {
    title: 'Picos de ressonância',
    text: 'De tempos em tempos aparece um anel dourado na onda. Toque nele antes que se feche: produção ×7 por 30s ou um pacote de dados.',
  },
  {
    title: 'Espectro',
    text: 'Varreduras levam tempo real e podem achar fontes. Naturais dão bônus de sinal permanente; artificiais liberam transmissões.',
  },
  {
    title: 'Offline',
    text: 'Com o app fechado as antenas continuam captando, com rendimento reduzido e tempo limitado. Decifrações e varreduras também continuam.',
  },
];
