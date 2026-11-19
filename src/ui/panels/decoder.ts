import type { Game } from '../../core/game';
import { formatBytes, formatHz } from '../../core/format';
import {
  DECODER_UPGRADES,
  bytesPerSignal,
  decoderCapacity,
  decoderTechName,
  type DecoderUpgrade,
} from '../../data/decoder';
import { UPGRADES, type UpgradeDef } from '../../data/upgrades';
import { h, setDisabled, setText, setVisible, type Panel } from '../dom';

export function createDecoderPanel(game: Game, onBuy: () => void): Panel {
  const tech = h('div', { class: 'card-title' });
  const loadText = h('div', { class: 'row-meta' });
  const meterFill = h('div');
  const meter = h('div', { class: 'meter' }, meterFill);
  const effText = h('div', { class: 'row-meta' });
  const warn = h('div', { class: 'warn' });

  const status = h(
    'div',
    { class: 'card' },
    tech,
    h('div', { class: 'muted small', text: 'Carga do decodificador' }),
    meter,
    loadText,
    effText,
    warn,
  );

  const rows = (['capacity', 'efficiency'] as DecoderUpgrade[]).map((kind) => createUpgradeRow(game, kind, onBuy));

  const upgradeRows = UPGRADES.map((def) => createStationUpgradeRow(game, def, onBuy));
  const upgradesTitle = h('div', { class: 'section-title', text: 'Melhorias da estação' });

  const el = h(
    'section',
    { class: 'panel' },
    status,
    ...rows.map((r) => r.el),
    upgradesTitle,
    ...upgradeRows.map((r) => r.el),
  );

  return {
    el,
    update() {
      const r = game.rates();
      const { capacityLevel, efficiencyLevel } = game.state.decoder;
      setText(tech, `Decodificador · ${decoderTechName(capacityLevel + efficiencyLevel)}`);

      const load = r.capacity > 0 ? Math.min(1, r.signal / r.capacity) : 0;
      meterFill.style.width = `${(load * 100).toFixed(1)}%`;
      meter.classList.toggle('sat', r.saturated);
      setText(loadText, `${formatHz(r.processed)} de ${formatHz(r.capacity)} processados`);
      setText(effText, `${formatBytes(r.bytesPerSignal)} por pulso · ${formatBytes(r.dataPerSec)}/s`);

      setVisible(warn, r.saturated);
      if (r.saturated) {
        const lostShare = r.lostDataPerSec / (r.dataPerSec + r.lostDataPerSec);
        setText(
          warn,
          `⚠ Saturado: ${formatHz(r.signal - r.capacity)} acima da capacidade.\n` +
            `Você está perdendo ${formatBytes(r.lostDataPerSec)}/s ` +
            `(${Math.round(lostShare * 100)}% do que as antenas captam).`,
        );
      }

      for (const row of rows) row.update();

      let anyUpgrade = false;
      for (const row of upgradeRows) {
        const unlocked = game.isUpgradeUnlocked(row.def);
        setVisible(row.el, unlocked);
        if (unlocked) {
          anyUpgrade = true;
          row.update();
        }
      }
      setVisible(upgradesTitle, anyUpgrade);
    },
  };
}

function createStationUpgradeRow(game: Game, def: UpgradeDef, onBuy: () => void) {
  const level = h('span', { class: 'row-count' });
  const meta = h('div', { class: 'row-meta' });
  const label = h('small');
  const cost = h('span');

  const el = h(
    'button',
    {
      class: 'row',
      onClick: () => {
        if (game.buyUpgrade(def.id)) onBuy();
      },
    },
    h(
      'div',
      { class: 'row-main' },
      h('div', { class: 'row-title' }, h('span', { text: def.name }), level),
      h('div', { class: 'row-sub', text: def.desc }),
      meta,
    ),
    h('div', { class: 'row-cost' }, label, cost),
  );

  return {
    def,
    el,
    update() {
      const lvl = game.upgradeLevel(def.id);
      const price = game.upgradeCost(def);
      setText(level, `${lvl}/${def.maxLevel}`);
      if (price === null) {
        setText(meta, def.effect(lvl));
        setText(label, '');
        setText(cost, 'MÁX');
        el.classList.remove('cant');
        el.classList.add('maxed');
        setDisabled(el, true);
        return;
      }
      setText(meta, `${def.effect(lvl)} → ${def.effect(lvl + 1)}`);
      setText(label, 'melhorar');
      setText(cost, formatBytes(price));
      el.classList.toggle('cant', game.state.data < price);
      setDisabled(el, false);
    },
  };
}

function createUpgradeRow(game: Game, kind: DecoderUpgrade, onBuy: () => void) {
  const def = DECODER_UPGRADES[kind];
  const level = h('span', { class: 'row-count' });
  const meta = h('div', { class: 'row-meta' });
  const cost = h('span');

  const el = h(
    'button',
    {
      class: 'row',
      onClick: () => {
        if (game.buyDecoder(kind)) onBuy();
      },
    },
    h(
      'div',
      { class: 'row-main' },
      h('div', { class: 'row-title' }, h('span', { text: def.name }), level),
      h('div', { class: 'row-sub', text: def.desc }),
      meta,
    ),
    h('div', { class: 'row-cost' }, h('small', { text: 'melhorar' }), cost),
  );

  return {
    el,
    update() {
      const lvl = game.decoderLevel(kind);
      const price = game.decoderCost(kind);
      setText(level, `nv ${lvl}`);
      const gain = game.previewDecoder(kind);
      setText(
        meta,
        (kind === 'capacity'
          ? `${formatHz(decoderCapacity(lvl))} → ${formatHz(decoderCapacity(lvl + 1))}`
          : `1 Hz: ${formatBytes(bytesPerSignal(lvl))} → ${formatBytes(bytesPerSignal(lvl + 1))}`) +
          ` · +${formatBytes(gain)}/s agora` +
          (kind === 'capacity' && gain === 0 ? ' (sobra capacidade)' : ''),
      );
      setText(cost, formatBytes(price));
      el.classList.toggle('cant', game.state.data < price);
    },
  };
}
