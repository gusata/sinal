import type { Game } from '../../core/game';
import type { BuyMode } from '../../core/state';
import { ANTENNAS, type AntennaDef } from '../../data/antennas';
import { formatBytes, formatHz } from '../../core/format';
import { h, setDisabled, setText, setVisible, type Panel } from '../dom';

const MODES: BuyMode[] = [1, 10, 'max'];

export function createAntennasPanel(game: Game, onBuy: () => void): Panel {
  const modeButtons = MODES.map((mode) =>
    h('button', {
      class: 'chip',
      text: mode === 'max' ? 'Máx' : `x${mode}`,
      onClick: () => {
        game.state.settings.buyMode = mode;
      },
    }),
  );

  const rows = ANTENNAS.map((def) => createRow(game, def, onBuy));
  const conversion = h('div', { class: 'conversion' });

  const el = h(
    'section',
    { class: 'panel' },
    conversion,
    h('div', { class: 'buy-mode' }, h('span', { class: 'muted', text: 'Comprar' }), ...modeButtons),
    ...rows.map((r) => r.el),
  );

  return {
    el,
    update() {
      const r = game.rates();
      setText(
        conversion,
        `1 Hz = ${formatBytes(r.bytesPerSignal)}/s · decodificador: ${formatHz(r.processed)} de ${formatHz(r.capacity)}` +
          (r.saturated ? ' (cheio)' : ''),
      );
      conversion.classList.toggle('sat', r.saturated);
      MODES.forEach((mode, i) => modeButtons[i]!.classList.toggle('active', game.state.settings.buyMode === mode));
      // Mostra todas as antenas liberadas e só a PRÓXIMA bloqueada (como mistério).
      let shownLocked = false;
      for (const row of rows) {
        const unlocked = game.isAntennaUnlocked(row.def);
        const visible = unlocked || !shownLocked;
        if (!unlocked && visible) shownLocked = true;
        setVisible(row.el, visible);
        if (visible) row.update(unlocked);
      }
    },
  };
}

function createRow(game: Game, def: AntennaDef, onBuy: () => void) {
  const name = h('span', { class: 'row-name' });
  const count = h('span', { class: 'row-count' });
  const sub = h('div', { class: 'row-sub' });
  const gain = h('div', { class: 'row-gain' });
  const meta = h('div', { class: 'row-meta' });
  const amount = h('small');
  const cost = h('span');
  const costBox = h('div', { class: 'row-cost' }, amount, cost);

  const el = h(
    'button',
    {
      class: 'row',
      attrs: { 'data-tutorial': `antenna-${def.id}` },
      onClick: () => {
        if (game.buyAntenna(def.id)) onBuy();
      },
    },
    h('div', { class: 'row-main' }, h('div', { class: 'row-title' }, name, count), sub, gain, meta),
    costBox,
  );

  return {
    def,
    el,
    update(unlocked: boolean) {
      el.classList.toggle('locked', !unlocked);
      if (!unlocked) {
        setText(name, '▒▒▒▒▒▒▒▒▒▒');
        setText(count, '');
        setText(sub, 'Sinal insuficiente para identificar.');
        setVisible(gain, false);
        setVisible(meta, false);
        setVisible(costBox, false);
        setDisabled(el, true);
        return;
      }

      const owned = game.state.antennas[def.id] ?? 0;
      const quote = game.quoteAntenna(def);
      const next = game.antennaNextMilestone(def);
      const produced = game.antennaSignal(def);

      const preview = game.previewAntenna(def, quote.amount);

      setText(name, def.name);
      setText(count, owned > 0 ? `×${owned}` : '');
      setText(sub, def.desc);

      // O que a compra rende DE VERDADE, depois do limite do decodificador.
      setVisible(gain, true);
      const lost = preview.wastedSignal > 0.0001;
      setText(
        gain,
        `+${formatHz(preview.signal)} → +${formatBytes(preview.data)}/s` +
          (lost ? ` · ${formatHz(preview.wastedSignal)} se perdem (decodificador cheio)` : ''),
      );
      gain.classList.toggle('lost', lost);

      setVisible(meta, owned > 0);
      setText(
        meta,
        `capta ${formatHz(produced)} no total` + (next !== null ? ` · produção ×2 com ${next}` : ''),
      );
      setVisible(costBox, true);
      setText(amount, `+${quote.amount}`);
      setText(cost, formatBytes(quote.cost));
      el.classList.toggle('cant', !quote.affordable);
      setDisabled(el, false);
    },
  };
}
