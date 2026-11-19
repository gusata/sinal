import type { Requirement } from '../core/requirements';

// Conteúdo de história. Escrever aqui não exige mexer em código.
//
// kind 'log':          entrada do diário do operador. Aparece sozinha quando os requisitos são cumpridos.
// kind 'transmission': precisa ser decifrada (custa dados e leva tempo real, inclusive offline).
//
// Regra de escrita: 1 a 3 linhas, muito subtexto, nada de explicar demais.
// IDs: prefixo d (diário) / t (transmissão) + número + apelido. Não renomear IDs já lançados (quebra saves).

export interface StoryEntry {
  id: string;
  kind: 'log' | 'transmission';
  arc: number;
  title: string;
  requires: Requirement[];
  /** Só para transmissões: custo em bytes. */
  cost?: number;
  /** Só para transmissões: segundos para decifrar. */
  duration?: number;
  lines: string[];
}

export const ARC_NAMES: Record<number, string> = {
  1: 'Estática',
};

export const STORY: readonly StoryEntry[] = [
  // ─── ARCO 1: ESTÁTICA ─────────────────────────────────────────────
  {
    id: 'd01-chegada',
    kind: 'log',
    arc: 1,
    title: 'Dia 1',
    requires: [],
    lines: [
      'A estação fica a quatro horas da cidade mais próxima, e a estrada acaba antes de chegar.',
      'O operador anterior deixou o rádio ligado. Só estática.',
      'Me disseram que o trabalho é ouvir. Então eu vou ouvir.',
    ],
  },
  {
    id: 't01-ruido',
    kind: 'transmission',
    arc: 1,
    title: 'Ruído de fundo',
    requires: [{ kind: 'antenna', id: 'fio', count: 1 }],
    cost: 5e3,
    duration: 10,
    lines: [
      '[análise] 98,7% radiação cósmica de fundo.',
      'O resto é o próprio equipamento, reclamando do frio.',
      'O universo tem um zumbido. Ninguém me avisou que dava pra se acostumar.',
    ],
  },
  {
    id: 'd02-caderno',
    kind: 'log',
    arc: 1,
    title: 'Dia 6',
    requires: [{ kind: 'antenna', id: 'yagi', count: 1 }],
    lines: [
      'Montei a Yagi no telhado. O vento tentou levar ela duas vezes.',
      'Achei um caderno do operador anterior na gaveta. Na primeira página está escrito só:',
      'NÃO DESLIGUE À NOITE.',
    ],
  },
  {
    id: 't02-pulsar',
    kind: 'transmission',
    arc: 1,
    title: 'Pulsar',
    requires: [
      { kind: 'story', id: 'd02-caderno' },
      { kind: 'totalData', amount: 500e3 },
    ],
    cost: 200e3,
    duration: 30,
    lines: [
      'Um tique a cada 1,337 segundo. Regular demais pra ser natural, pensei.',
      'Mas é natural. Uma estrela morta girando.',
      'Fiquei uma hora só escutando. É o relógio mais antigo que eu já ouvi.',
    ],
  },
  {
    id: 'd03-circulos',
    kind: 'log',
    arc: 1,
    title: 'Dia 14',
    requires: [
      { kind: 'story', id: 't02-pulsar' },
      { kind: 'antenna', id: 'yagi', count: 10 },
    ],
    lines: [
      'O caderno tem colunas de números. Frequências, horários.',
      'Algumas linhas estão circuladas. Todas às 03h12.',
    ],
  },
  {
    id: 't03-0312',
    kind: 'transmission',
    arc: 1,
    title: '03h12',
    requires: [
      { kind: 'story', id: 'd03-circulos' },
      { kind: 'antenna', id: 'parabolica', count: 1 },
    ],
    cost: 3e6,
    duration: 60,
    lines: [
      'Às 03h12 a estática muda de textura.',
      'Não fica mais alta. Fica mais… organizada.',
      'Pode ser interferência. Vou precisar de mais capacidade pra ter certeza.',
    ],
  },
  {
    id: 't04-sequencia',
    kind: 'transmission',
    arc: 1,
    title: 'Sequência',
    requires: [
      { kind: 'story', id: 't03-0312' },
      { kind: 'decoder', upgrade: 'capacity', level: 5 },
    ],
    cost: 50e6,
    duration: 120,
    lines: [
      '2 · 3 · 5 · 7 · 11 · 13 · 17 · 19 · 23 ·',
      'Números primos. Nenhuma estrela conta até 23.',
      'Quando percebi, já estava de pé.',
    ],
  },
  {
    id: 'd04-central',
    kind: 'log',
    arc: 1,
    title: 'Dia 22',
    requires: [{ kind: 'story', id: 't04-sequencia' }],
    lines: [
      'Liguei pra central. Disseram pra registrar e continuar ouvindo.',
      'Perguntei se o operador anterior também tinha ouvido isso.',
      'Silêncio do outro lado. Depois: "registre e continue ouvindo".',
    ],
  },
  {
    id: 't05-intervalo',
    kind: 'transmission',
    arc: 1,
    title: 'Depois do 23',
    requires: [
      { kind: 'story', id: 'd04-central' },
      { kind: 'antenna', id: 'dipolos', count: 1 },
    ],
    cost: 1e9,
    duration: 300,
    lines: [
      'A sequência não para no 23. Ela vai até o 97 e recomeça.',
      'Entre uma repetição e outra há um intervalo. Dentro do intervalo tem alguma coisa que ainda não consigo ler.',
      'Parece… música?',
    ],
  },
  {
    id: 'd05-ultima-pagina',
    kind: 'log',
    arc: 1,
    title: 'A última página',
    requires: [
      { kind: 'story', id: 't05-intervalo' },
      { kind: 'totalData', amount: 5e9 },
    ],
    lines: [
      'Achei a última página escrita do caderno. A letra é diferente das outras.',
      '"Eles cantam. Quando você entender a música, vai entender por que eu fui embora."',
      '[ fim do arco 1 · continua ]',
    ],
  },

  // ─── Transmissões paralelas (liberadas por fontes do Espectro) ────
  {
    id: 'tx1-telemetria',
    kind: 'transmission',
    arc: 1,
    title: 'Telemetria',
    requires: [{ kind: 'source', id: 'satelite' }],
    cost: 500e3,
    duration: 45,
    lines: [
      'Satélite meteorológico, lançado em 1987, desativado em 1994.',
      'Continua mandando a temperatura de um oceano que ele não vê mais.',
      'Ninguém mandou ele parar. Acho que ninguém nunca vai mandar.',
    ],
  },
  {
    id: 'tx2-faixa',
    kind: 'transmission',
    arc: 1,
    title: 'Silêncio limpo',
    requires: [{ kind: 'source', id: 'faixa-caderno' }],
    cost: 30e6,
    duration: 180,
    lines: [
      'Sintonizei a frequência que ele circulou. Não tem nada lá.',
      'Nada mesmo: nem o ruído de fundo. Como se alguém tivesse apagado.',
      'Silêncio assim não acontece sozinho. Alguém gasta energia pra fazer.',
    ],
  },
  {
    id: 'tx3-ida-volta',
    kind: 'transmission',
    arc: 1,
    title: 'Eco',
    requires: [{ kind: 'source', id: 'ida-volta' }],
    cost: 5e9,
    duration: 600,
    lines: [
      'O sinal leva onze minutos para voltar. Mandei um bipe. Voltou um bipe.',
      'Mandei dois. Voltaram três.',
      'Não mandei mais nada.',
    ],
  },
];

export function getStory(id: string): StoryEntry | undefined {
  return STORY.find((e) => e.id === id);
}
