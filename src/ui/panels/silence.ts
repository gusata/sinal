import type { Game } from '../../core/game';
import { formatBytes } from '../../core/format';
import { CLARITY_BONUS, PRESTIGE_NODES, type PrestigeNodeDef } from '../../data/prestige';
import { h, setDisabled, setText, setVisible, type Panel } from '../dom';

export interface SilenceActions {
  /** Chamado depois que o turno foi encerrado. */
  onSilence(clarity: number, previous: string, operator: string): void;
  onBuy(): void;
}

const pct = (clarity: number) => `${Math.round(clarity * CLARITY_BONUS * 100)}%`;

export function createSilencePanel(game: Game, actions: SilenceActions): Panel {
  // ─── Clareza ───
  const clarityTitle = h('div', { class: 'card-title' });
  const clarityText = h('div', { class: 'row-meta' });
  const pointsText = h('div', { class: 'row-meta' });

  // ─── Encerrar turno ───
  const operatorText = h('p', { class: 'small' });
  const gainText = h('p', { class: 'silence-gain' });
  const nextText = h('div', { class: 'row-meta' });
  let armed = false;
  let armTimer = 0;
  const silenceBtn = h('button', {
    class: 'btn danger wide',
    onClick: () => {
      if (!game.canSilence()) return;
      if (!armed) {
        armed = true;
        setText(silenceBtn, 'Tem certeza? Toque de novo');
        armTimer = window.setTimeout(() => {
          armed = false;
        }, 4000);
        return;
      }
      window.clearTimeout(armTimer);
      armed = false;
      const previous = currentOperator(game);
      const result = game.silence();
      if (result) actions.onSilence(result.clarity, previous, result.operator);
    },
  });

  const resetInfo = h(
    'details',
    { class: 'glossary' },
    h('summary', { text: 'O que acontece ao encerrar o turno?' }),
    h('p', {
      text:
        'Recomeçam do zero: dados, antenas, decodificador e melhorias da estação. ' +
        'Ficam: o Diário, as fontes do Espectro, a Clareza e a árvore abaixo. ' +
        'Cada ponto de Clareza ganho dá +2% de dados para sempre, e gastar pontos na árvore não tira esse bônus.',
    }),
  );

  // ─── Árvore ───
  const nodeRows = PRESTIGE_NODES.map((def) => createNodeRow(game, def, actions.onBuy));

  // ─── Operadores ───
  const operators = h('div', { class: 'stats' });

  const el = h(
    'section',
    { class: 'panel' },
    h('div', { class: 'card' }, clarityTitle, clarityText, pointsText),
    h(
      'div',
      { class: 'card' },
      h('div', { class: 'section-label', text: 'Encerrar turno' }),
      operatorText,
      gainText,
      nextText,
      silenceBtn,
      resetInfo,
    ),
    h('div', { class: 'section-title', text: 'Árvore da Clareza' }),
    ...nodeRows.map((r) => r.el),
    h('div', { class: 'section-title', text: 'Operadores da estação' }),
    operators,
  );

  return {
    el,
    onShow() {
      armed = false;
    },
    update() {
      const p = game.state.prestige;
      setText(clarityTitle, `✦ ${p.clarity} de Clareza`);
      setText(clarityText, `+${pct(p.clarity)} de dados em tudo (antenas e toques)`);
      setText(pointsText, `${game.availableClarity()} ${game.availableClarity() === 1 ? 'ponto' : 'pontos'} para gastar na árvore`);

      const gain = game.clarityGain();
      setText(operatorText, `No turno: ${currentOperator(game)}. Próximo: ${game.nextOperator()}.`);
      setText(
        gainText,
        gain > 0
          ? `Encerrar agora: +${gain} de Clareza (total +${pct(p.clarity + gain)} de dados)`
          : 'Ainda não há Clareza para ganhar neste turno.',
      );
      // Próximo ponto: clarityForRun = floor(sqrt(total / 1 GB)) → precisa de (gain+1)² GB.
      const nextAt = (gain + 1) ** 2 * 1e9;
      setText(nextText, `Próximo ponto com ${formatBytes(nextAt)} captados neste turno (agora: ${formatBytes(game.state.totalData)})`);
      if (!armed) setText(silenceBtn, 'Encerrar turno');
      setDisabled(silenceBtn, !game.canSilence());

      for (const row of nodeRows) row.update();

      const list = ['Você (primeiro turno)', ...p.operators];
      setText(operators, list.map((name, i) => `${i + 1}. ${name}`).join('\n'));
    },
  };
}

function currentOperator(game: Game): string {
  const ops = game.state.prestige.operators;
  return ops.length > 0 ? ops[ops.length - 1]! : 'você';
}

function createNodeRow(game: Game, def: PrestigeNodeDef, onBuy: () => void) {
  const level = h('span', { class: 'row-count' });
  const meta = h('div', { class: 'row-meta' });
  const label = h('small');
  const cost = h('span');
  const el = h(
    'button',
    {
      class: 'row',
      onClick: () => {
        if (game.buyNode(def.id)) onBuy();
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
    el,
    update() {
      const lvl = game.nodeLevel(def.id);
      const price = game.nodeCost(def);
      setText(level, `${lvl}/${def.maxLevel}`);
      if (price === null) {
        setText(meta, def.effect(lvl));
        setText(label, '');
        setText(cost, 'MÁX');
        el.classList.add('maxed');
        el.classList.remove('cant');
        setDisabled(el, true);
        return;
      }
      setText(meta, `${def.effect(lvl)} → ${def.effect(lvl + 1)}`);
      setText(label, 'clareza');
      setText(cost, `✦ ${price}`);
      el.classList.toggle('cant', game.availableClarity() < price);
      setDisabled(el, false);
      setVisible(el, true);
    },
  };
}
