import '@fontsource/vt323';
import '@fontsource/ibm-plex-mono/400.css';
import '@fontsource/ibm-plex-mono/600.css';
import './styles/main.css';

import { Game } from './core/game';
import { OFFLINE_REPORT_MIN_S, type OfflineResult } from './core/offline';
import { deserialize, serialize } from './core/save';
import { createInitialState, type GameState } from './core/state';
import { clearSave, loadSave, writeSave } from './platform/storage';
import { App } from './ui/app';

const TICK_MS = 100;
const AUTOSAVE_MS = 15_000;

async function loadState(): Promise<GameState> {
  const raw = await loadSave();
  if (!raw) return createInitialState();
  try {
    return deserialize(raw);
  } catch (err) {
    // Não sobrescreve o save problemático automaticamente: guarda uma cópia antes.
    console.error('Save inválido, começando do zero', err);
    try {
      localStorage.setItem(`sinal.save.broken.${Date.now()}`, raw);
    } catch {
      /* sem espaço: segue sem backup */
    }
    return createInitialState();
  }
}

async function boot(): Promise<void> {
  const root = document.getElementById('app');
  if (!root) throw new Error('#app não encontrado');

  const game = new Game(await loadState());

  const save = () => writeSave(serialize(game.state));

  const app = new App(root, game, {
    requestSave: () => void save(),
    async onImport(state) {
      state.lastSeen = Date.now(); // importar não deve gerar progresso offline
      game.state = state;
      await save();
      location.reload();
    },
    async onReset() {
      await clearSave();
      game.state = createInitialState();
      location.reload();
    },
  });

  const step = () => {
    const report = game.tick(Date.now());
    if (report && shouldReport(report)) app.showOfflineReport(report);
    app.update();
  };

  step();
  void save();

  // Com o app em segundo plano não avançamos o jogo: ao voltar,
  // o intervalo inteiro é tratado como progresso offline.
  window.setInterval(() => {
    if (!document.hidden) step();
  }, TICK_MS);
  window.setInterval(() => void save(), AUTOSAVE_MS);

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) void save();
    else step();
  });
  window.addEventListener('pagehide', () => void save());
}

function shouldReport(r: OfflineResult & { storyUnlocked: string[] }): boolean {
  return r.elapsed >= OFFLINE_REPORT_MIN_S || r.storyUnlocked.length > 0;
}

void boot();
