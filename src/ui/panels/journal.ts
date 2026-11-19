import type { Game } from '../../core/game';
import { formatBytes, formatDuration } from '../../core/format';
import { getStory, type StoryEntry } from '../../data/story';
import { h, setDisabled, setText, setVisible, type Panel } from '../dom';

const GLYPHS = '#%&@$*+=?/\\|<>~^';

function hash(str: string): number {
  let x = 2166136261;
  for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619);
  return x >>> 0;
}

/** Frequência "falsa" e estável para cada transmissão, só para clima. */
function fakeFrequency(id: string): string {
  return `${(100 + (hash(id) % 190000) / 100).toFixed(2)} MHz`;
}

/** Texto embaralhado que vai ficando legível conforme `progress` (0..1). */
function scramble(text: string, progress: number, seed: number): string {
  let out = '';
  for (let i = 0; i < text.length; i++) {
    const ch = text[i]!;
    if (ch === ' ') {
      out += ' ';
      continue;
    }
    const threshold = (hash(`${seed}:${i}`) % 1000) / 1000;
    out += threshold < progress ? ch : GLYPHS[Math.floor(Math.random() * GLYPHS.length)]!;
  }
  return out;
}

export function createJournalPanel(game: Game, onChange: () => void): Panel {
  // ─── Decifrando agora ───
  const decTitle = h('div', { class: 'card-title' });
  const decFill = h('div');
  const decTime = h('div', { class: 'row-meta' });
  const decText = h('div', { class: 'scramble' });
  const decodingCard = h(
    'div',
    { class: 'card' },
    h('div', { class: 'section-label', text: 'Decifrando' }),
    decTitle,
    h('div', { class: 'meter' }, decFill),
    decTime,
    decText,
  );

  // ─── Captadas (prontas para decifrar) ───
  const availableTitle = h('div', { class: 'section-title', text: 'Transmissões captadas' });
  const availableList = h('div');
  const availableRows = new Map<string, ReturnType<typeof createTransmissionRow>>();

  // ─── Diário ───
  const entriesList = h('div');
  let renderedCount = -1;
  let highlight = new Set<string>();

  const el = h(
    'section',
    { class: 'panel' },
    decodingCard,
    availableTitle,
    availableList,
    h('div', { class: 'section-title', text: 'Registro' }),
    entriesList,
  );

  function renderEntries() {
    const ids = [...game.state.story.done].reverse();
    entriesList.replaceChildren(
      ...ids
        .map((id) => getStory(id))
        .filter((e): e is StoryEntry => !!e)
        .map((e) => renderEntry(e, highlight.has(e.id))),
    );
    renderedCount = game.state.story.done.length;
  }

  return {
    el,
    onShow() {
      highlight = new Set(game.state.story.unread);
      renderEntries();
      game.markRead();
    },
    update(now) {
      // Decifração em andamento
      const job = game.state.story.decoding;
      setVisible(decodingCard, !!job);
      if (job) {
        const entry = getStory(job.id);
        const progress = game.decodingProgress(now);
        setText(decTitle, fakeFrequency(job.id));
        decFill.style.width = `${(progress * 100).toFixed(1)}%`;
        setText(decTime, `${Math.floor(progress * 100)}% · faltam ${formatDuration((job.endsAt - now) / 1000)}`);
        decText.textContent = scramble(entry?.lines.join(' ') ?? '', progress, hash(job.id));
      }

      // Transmissões disponíveis
      const available = game.availableTransmissions();
      setVisible(availableTitle, available.length > 0);
      const ids = new Set(available.map((e) => e.id));
      for (const [id, row] of availableRows) {
        if (!ids.has(id)) {
          row.el.remove();
          availableRows.delete(id);
        }
      }
      for (const entry of available) {
        let row = availableRows.get(entry.id);
        if (!row) {
          row = createTransmissionRow(game, entry, onChange);
          availableRows.set(entry.id, row);
          availableList.append(row.el);
        }
        row.update();
      }

      // Novas entradas enquanto a aba está aberta
      if (game.state.story.done.length !== renderedCount) {
        for (const id of game.state.story.unread) highlight.add(id);
        renderEntries();
        game.markRead();
      }
    },
  };
}

function createTransmissionRow(game: Game, entry: StoryEntry, onChange: () => void) {
  const status = h('small');
  const cost = h('span');
  const el = h(
    'button',
    {
      class: 'row',
      onClick: () => {
        if (game.startDecoding(entry.id)) onChange();
      },
    },
    h(
      'div',
      { class: 'row-main' },
      h('div', { class: 'row-title' }, h('span', { text: fakeFrequency(entry.id) })),
      h('div', { class: 'row-sub', text: `Origem desconhecida · ${formatDuration(entry.duration ?? 0)} para decifrar` }),
    ),
    h('div', { class: 'row-cost' }, status, cost),
  );

  return {
    el,
    update() {
      const price = entry.cost ?? 0;
      const busy = !!game.state.story.decoding;
      setText(status, busy ? 'ocupado' : 'decifrar');
      setText(cost, price > 0 ? formatBytes(price) : 'grátis');
      el.classList.toggle('cant', busy || game.state.data < price);
      setDisabled(el, busy);
    },
  };
}

function renderEntry(entry: StoryEntry, isNew: boolean): HTMLElement {
  const label = entry.kind === 'log' ? 'DIÁRIO' : `TRANSMISSÃO · ${fakeFrequency(entry.id)}`;
  return h(
    'article',
    { class: `entry ${entry.kind}${isNew ? ' new' : ''}` },
    h('div', { class: 'entry-head', text: label }),
    h('div', { class: 'entry-title', text: entry.title }),
    ...entry.lines.map((line) => h('p', { text: line })),
  );
}
