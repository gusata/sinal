import type { Game } from '../../core/game';
import { formatBytes, formatDuration } from '../../core/format';
import { SCANS, SOURCES, getSource, type ScanDef, type SourceDef } from '../../data/spectrum';
import { h, setDisabled, setText, setVisible, type Panel } from '../dom';

const BAR_COUNT = 48;

function hash(str: string): number {
  let x = 2166136261;
  for (let i = 0; i < str.length; i++) x = Math.imul(x ^ str.charCodeAt(i), 16777619);
  return x >>> 0;
}

/** Posição fixa de cada fonte no gráfico (sem colisão). */
const SOURCE_BAR = (() => {
  const taken = new Set<number>();
  const map = new Map<string, number>();
  for (const s of SOURCES) {
    let i = hash(s.id) % BAR_COUNT;
    while (taken.has(i)) i = (i + 1) % BAR_COUNT;
    taken.add(i);
    map.set(s.id, i);
  }
  return map;
})();

function effectText(s: SourceDef): string {
  return s.kind === 'natural'
    ? `+${Math.round(s.signalBonus * 100)}% de sinal`
    : 'Abriu uma transmissão no Diário';
}

export function createSpectrumPanel(game: Game, onChange: () => void): Panel {
  // ─── Bloqueado ───
  const lockedCard = h(
    'div',
    { class: 'card locked-card' },
    h('div', { class: 'card-title', text: '▒▒ Espectro indisponível' }),
    h('p', {
      class: 'muted small',
      text: 'O equipamento ainda não distingue uma fonte da outra. Continue decifrando transmissões.',
    }),
  );

  // ─── Gráfico ───
  const bars = Array.from({ length: BAR_COUNT }, () => h('div', { class: 'bar' }));
  const cursor = h('div', { class: 'spectrum-cursor' });
  const graph = h('div', { class: 'spectrum' }, ...bars, cursor);
  const statusText = h('div', { class: 'row-meta' });
  const scanFill = h('div');
  const scanMeter = h('div', { class: 'meter' }, scanFill);
  const bonusText = h('div', { class: 'row-meta' });

  // ─── Último resultado ───
  const lastHead = h('div', { class: 'section-label', text: 'Última varredura' });
  const lastTitle = h('div', { class: 'card-title' });
  const lastSub = h('div', { class: 'row-meta' });
  const lastText = h('p', { class: 'result-text' });
  const lastCard = h('div', { class: 'card result' }, lastHead, lastTitle, lastSub, lastText);

  // ─── Varreduras ───
  const scanRows = SCANS.map((def) => createScanRow(game, def, onChange));

  // ─── Catálogo ───
  const catalogTitle = h('div', { class: 'section-title' });
  const catalog = h('div');
  let renderedFound = -1;

  const unlockedView = h(
    'div',
    {},
    graph,
    scanMeter,
    statusText,
    bonusText,
    lastCard,
    h('div', { class: 'section-title', text: 'Varreduras' }),
    ...scanRows.map((r) => r.el),
    catalogTitle,
    catalog,
  );

  const el = h('section', { class: 'panel' }, lockedCard, unlockedView);

  function renderCatalog() {
    const found = game.state.spectrum.found;
    setText(catalogTitle, `Fontes catalogadas · ${found.length}/${SOURCES.length}`);
    setVisible(catalogTitle, found.length > 0);
    catalog.replaceChildren(
      ...[...found]
        .reverse()
        .map((id) => getSource(id))
        .filter((s): s is SourceDef => !!s)
        .map((s) =>
          h(
            'article',
            { class: `entry source ${s.kind}` },
            h('div', { class: 'entry-head', text: `${s.freq} · ${s.kind === 'natural' ? 'NATURAL' : 'ARTIFICIAL'}` }),
            h('div', { class: 'entry-title', text: s.name }),
            h('div', { class: 'row-meta', text: effectText(s) }),
            ...s.lines.map((line) => h('p', { text: line })),
          ),
        ),
    );
    renderedFound = found.length;
  }

  return {
    el,
    onShow() {
      lastCard.classList.toggle('new', game.state.spectrum.unseen);
      game.markSpectrumSeen();
      renderCatalog();
    },
    update(now) {
      const unlocked = game.isSpectrumUnlocked();
      setVisible(lockedCard, !unlocked);
      setVisible(unlockedView, unlocked);
      if (!unlocked) return;

      const sp = game.state.spectrum;
      if (sp.unseen) {
        // Resultado chegou com a aba aberta.
        lastCard.classList.add('new');
        game.markSpectrumSeen();
      }

      // Gráfico
      const scanning = !!sp.scan;
      const progress = game.scanProgress(now);
      const cursorBar = Math.floor(progress * BAR_COUNT);
      const sourceAt = new Map<number, SourceDef>();
      for (const id of sp.found) {
        const s = getSource(id);
        const i = SOURCE_BAR.get(id);
        if (s && i !== undefined) sourceAt.set(i, s);
      }
      bars.forEach((bar, i) => {
        const src = sourceAt.get(i);
        let height: number;
        if (src) height = (src.kind === 'natural' ? 72 : 88) + Math.random() * 10;
        else height = 6 + Math.random() * 22;
        if (scanning && Math.abs(i - cursorBar) <= 1) height = Math.min(100, height + 25 + Math.random() * 20);
        bar.style.height = `${height.toFixed(0)}%`;
        bar.classList.toggle('src', !!src && src.kind === 'natural');
        bar.classList.toggle('art', !!src && src.kind === 'artificial');
      });
      setVisible(cursor, scanning);
      cursor.style.left = `${(progress * 100).toFixed(2)}%`;

      // Status
      setVisible(scanMeter, scanning);
      if (scanning && sp.scan) {
        scanFill.style.width = `${(progress * 100).toFixed(1)}%`;
        setText(statusText, `Varrendo · ${Math.floor(progress * 100)}% · faltam ${formatDuration((sp.scan.endsAt - now) / 1000)}`);
      } else {
        setText(statusText, sp.scans === 0 ? 'Nenhuma varredura feita ainda.' : 'Pronto para varrer.');
      }
      const bonus = game.signalMultiplier() - 1;
      setVisible(bonusText, bonus > 0);
      setText(bonusText, `Bônus das fontes: +${Math.round(bonus * 100)}% de sinal`);

      // Último resultado
      setVisible(lastCard, !!sp.last);
      if (sp.last) {
        const src = sp.last.sourceId ? getSource(sp.last.sourceId) : undefined;
        setText(lastTitle, src ? src.name : 'Nada encontrado');
        setText(lastSub, src ? `${src.freq} · ${effectText(src)}` : '');
        setVisible(lastSub, !!src);
        setText(lastText, sp.last.text);
      }

      for (const row of scanRows) row.update();
      if (sp.found.length !== renderedFound) renderCatalog();
    },
  };
}

function createScanRow(game: Game, def: ScanDef, onChange: () => void) {
  const meta = h('div', { class: 'row-meta' });
  const label = h('small');
  const cost = h('span');
  const el = h(
    'button',
    {
      class: 'row',
      onClick: () => {
        if (game.startScan(def.depth)) onChange();
      },
    },
    h(
      'div',
      { class: 'row-main' },
      h('div', { class: 'row-title' }, h('span', { text: def.name })),
      h('div', { class: 'row-sub', text: def.desc }),
      meta,
    ),
    h('div', { class: 'row-cost' }, label, cost),
  );

  return {
    el,
    update() {
      const available = game.availableScans().includes(def);
      setVisible(el, available);
      if (!available) return;
      const busy = !!game.state.spectrum.scan;
      const remaining = game.sourcePool(def.depth).length;
      setText(
        meta,
        `dura ${formatDuration(def.duration)} · ` +
          (remaining > 0 ? `${remaining} ${remaining === 1 ? 'fonte' : 'fontes'} ao alcance` : 'nada novo ao alcance agora'),
      );
      setText(label, busy ? 'ocupado' : 'varrer');
      setText(cost, formatBytes(def.cost));
      el.classList.toggle('cant', busy || game.state.data < def.cost);
      setDisabled(el, busy);
    },
  };
}
