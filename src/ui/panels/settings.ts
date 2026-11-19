import type { Game } from '../../core/game';
import { formatBytes, formatDuration } from '../../core/format';
import { exportSave, importSave, SaveError } from '../../core/save';
import type { GameState } from '../../core/state';
import { GLOSSARY } from '../../data/tutorial';
import { h, setText, type Panel } from '../dom';

export interface SettingsActions {
  onImport(state: GameState): void;
  onReset(): void;
  onSettingsChange(): void;
  onResetTips(): void;
}

export function createSettingsPanel(game: Game, actions: SettingsActions): Panel {
  const hapticsBtn = h('button', {
    class: 'btn toggle',
    onClick: () => {
      game.state.settings.haptics = !game.state.settings.haptics;
      actions.onSettingsChange();
    },
  });
  const crtBtn = h('button', {
    class: 'btn toggle',
    onClick: () => {
      game.state.settings.crt = !game.state.settings.crt;
      actions.onSettingsChange();
    },
  });

  const soundBtn = h('button', {
    class: 'btn toggle',
    onClick: () => {
      game.state.settings.sound = !game.state.settings.sound;
      actions.onSettingsChange();
    },
  });
  const ambientBtn = h('button', {
    class: 'btn toggle',
    onClick: () => {
      game.state.settings.ambient = !game.state.settings.ambient;
      actions.onSettingsChange();
    },
  });
  const notifBtn = h('button', {
    class: 'btn toggle',
    onClick: () => {
      game.state.settings.notifications = !game.state.settings.notifications;
      actions.onSettingsChange();
    },
  });

  // ─── Save ───
  const saveBox = h('textarea', { attrs: { rows: '4', spellcheck: 'false', placeholder: 'Cole aqui um código de save…' } });
  const saveMsg = h('div', { class: 'row-meta' });

  const exportBtn = h('button', {
    class: 'btn',
    text: 'Exportar',
    onClick: async () => {
      const code = exportSave(game.state);
      saveBox.value = code;
      try {
        await navigator.clipboard.writeText(code);
        setText(saveMsg, 'Código copiado para a área de transferência.');
      } catch {
        saveBox.select();
        setText(saveMsg, 'Copie o código acima.');
      }
    },
  });

  const importBtn = h('button', {
    class: 'btn',
    text: 'Importar',
    onClick: () => {
      try {
        const state = importSave(saveBox.value);
        actions.onImport(state);
        saveBox.value = '';
        setText(saveMsg, 'Save importado.');
      } catch (err) {
        setText(saveMsg, err instanceof SaveError ? err.message : 'Não foi possível importar.');
      }
    },
  });

  // Apagar exige dois toques.
  let resetArmed = false;
  let resetTimer = 0;
  const resetBtn = h('button', {
    class: 'btn danger',
    text: 'Apagar progresso',
    onClick: () => {
      if (!resetArmed) {
        resetArmed = true;
        setText(resetBtn, 'Tem certeza? Toque de novo');
        resetTimer = window.setTimeout(() => {
          resetArmed = false;
          setText(resetBtn, 'Apagar progresso');
        }, 4000);
        return;
      }
      window.clearTimeout(resetTimer);
      resetArmed = false;
      setText(resetBtn, 'Apagar progresso');
      actions.onReset();
    },
  });

  // ─── Como funciona ───
  const glossary = GLOSSARY.map((item) =>
    h('details', { class: 'glossary' }, h('summary', { text: item.title }), h('p', { text: item.text })),
  );
  const tipsMsg = h('div', { class: 'row-meta' });
  const tipsBtn = h('button', {
    class: 'btn',
    text: 'Rever dicas',
    onClick: () => {
      actions.onResetTips();
      setText(tipsMsg, 'As dicas vão aparecer de novo conforme você joga.');
    },
  });

  // ─── Estatísticas ───
  const stats = h('div', { class: 'stats' });

  const el = h(
    'section',
    { class: 'panel' },
    h('div', { class: 'section-title', text: 'Como funciona' }),
    ...glossary,
    h('div', { class: 'btn-row' }, tipsBtn),
    tipsMsg,
    h('div', { class: 'section-title', text: 'Preferências' }),
    h('div', { class: 'btn-row' }, soundBtn, ambientBtn, hapticsBtn, crtBtn, notifBtn),
    h('div', {
      class: 'row-meta',
      text: 'Notificações só no app instalado: avisam quando uma decifração ou varredura termina, ou quando o gravador para.',
    }),
    h('div', { class: 'section-title', text: 'Save' }),
    saveBox,
    h('div', { class: 'btn-row' }, exportBtn, importBtn),
    saveMsg,
    h('div', { class: 'section-title', text: 'Estatísticas' }),
    stats,
    h('div', { class: 'section-title', text: 'Zona de perigo' }),
    resetBtn,
    h('div', { class: 'row-meta version', text: `Sinal v${__APP_VERSION__}` }),
  );

  return {
    el,
    update() {
      const s = game.state;
      setText(hapticsBtn, `[${s.settings.haptics ? 'x' : ' '}] Vibração`);
      setText(crtBtn, `[${s.settings.crt ? 'x' : ' '}] Efeito CRT`);
      setText(soundBtn, `[${s.settings.sound ? 'x' : ' '}] Som`);
      setText(ambientBtn, `[${s.settings.ambient ? 'x' : ' '}] Estática ambiente`);
      setText(notifBtn, `[${s.settings.notifications ? 'x' : ' '}] Notificações`);
      setText(
        stats,
        [
          `Dados nesta estação: ${formatBytes(s.totalData)}`,
          `Dados desde sempre:  ${formatBytes(s.lifetimeData)}`,
          `Toques:              ${s.stats.taps}`,
          `Picos captados:      ${s.stats.peaks}`,
          `Fontes catalogadas:  ${s.spectrum.found.length}`,
          `Turnos encerrados:   ${s.prestige.silences}`,
          `Tempo de escuta:     ${formatDuration(s.stats.playTime)}`,
        ].join('\n'),
      );
    },
  };
}
