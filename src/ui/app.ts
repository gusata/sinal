import type { Game, GameEvent, OfflineReport } from '../core/game';
import { formatBytes, formatDuration, formatHz } from '../core/format';
import type { GameState } from '../core/state';
import { getSource } from '../data/spectrum';
import { STORY, getStory } from '../data/story';
import { sound } from '../platform/audio';
import { hapticLight, hapticMedium } from '../platform/haptics';
import { ensureNotificationPermission } from '../platform/notifications';
import { h, setText, setVisible, type Panel } from './dom';
import { showModal } from './modal';
import { Oscilloscope } from './oscilloscope';
import { Tutorial } from './tutorial';
import { createAntennasPanel } from './panels/antennas';
import { createDecoderPanel } from './panels/decoder';
import { createJournalPanel } from './panels/journal';
import { createSettingsPanel } from './panels/settings';
import { createSilencePanel } from './panels/silence';
import { createSpectrumPanel } from './panels/spectrum';

export interface AppCallbacks {
  /** Pede um save imediato (após compras importantes etc.). */
  requestSave(): void;
  onImport(state: GameState): void;
  onReset(): void;
}

type TabId = 'antennas' | 'decoder' | 'spectrum' | 'journal' | 'silence' | 'settings';

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'antennas', icon: '⌁', label: 'Antenas' },
  { id: 'decoder', icon: '▤', label: 'Equip.' },
  { id: 'spectrum', icon: '|‖|', label: 'Espectro' },
  { id: 'journal', icon: '✎', label: 'Diário' },
  { id: 'silence', icon: '◌', label: 'Silêncio' },
  { id: 'settings', icon: '⚙', label: 'Config' },
];

const LOG_MAX = 2;

export class App {
  private panels: Record<TabId, Panel>;
  private current: TabId = 'antennas';
  private tabButtons = new Map<TabId, { btn: HTMLButtonElement; badge: HTMLElement }>();
  private nav = h('nav', { class: 'tabs' });
  private panelHost = h('main', { class: 'panels' });
  private logEl = h('div', { class: 'log' });
  private scope: Oscilloscope;

  // HUD
  private hudData = h('div', { class: 'hud-data' });
  private hudRate = h('div', { class: 'hud-rate' });
  private hudSignal = h('div', { class: 'hud-signal' });
  private scopeSat = h('div', { class: 'scope-sat', text: 'SATURADO' });
  private scopeHint = h('div', { class: 'scope-hint', text: 'toque para captar sinal' });
  private scopeEl: HTMLElement;
  private tutorial: Tutorial;

  constructor(
    root: HTMLElement,
    private game: Game,
    cb: AppCallbacks,
  ) {
    const onBuy = () => cb.requestSave();
    this.panels = {
      antennas: createAntennasPanel(game, onBuy),
      decoder: createDecoderPanel(game, onBuy),
      spectrum: createSpectrumPanel(game, onBuy),
      journal: createJournalPanel(game, onBuy),
      silence: createSilencePanel(game, {
        onBuy,
        onSilence: (clarity, previous, operator) => {
          cb.requestSave();
          this.showSilenceModal(clarity, previous, operator);
          this.showTab('antennas');
        },
      }),
      settings: createSettingsPanel(game, {
        onImport: cb.onImport,
        onReset: cb.onReset,
        onResetTips: () => {
          this.tutorial.reset();
          cb.requestSave();
        },
        onSettingsChange: () => {
          this.applySettings();
          cb.requestSave();
        },
      }),
    };

    const canvas = h('canvas');
    this.scopeEl = h('div', { class: 'scope' }, canvas, this.scopeSat, this.scopeHint);
    this.scopeEl.addEventListener('pointerdown', (e) => this.handleTap(e));

    const nav = this.nav;
    for (const tab of TABS) {
      const badge = h('span', { class: 'badge' });
      badge.hidden = true; // só aparece quando alguma aba pede atenção
      const btn = h(
        'button',
        { class: 'tab', attrs: { 'data-tab': tab.id }, onClick: () => this.showTab(tab.id) },
        h('span', { class: 'icon', text: tab.icon }),
        h('span', { text: tab.label }),
        badge,
      );
      this.tabButtons.set(tab.id, { btn, badge });
      nav.append(btn);
    }

    root.replaceChildren(
      h('header', { class: 'hud' }, h('div', {}, this.hudData, this.hudRate), this.hudSignal),
      this.scopeEl,
      this.logEl,
      this.panelHost,
      nav,
    );

    this.scope = new Oscilloscope(canvas, () => {
      const r = game.rates();
      const peak = game.peak;
      const now = Date.now();
      return {
        signal: r.signal,
        saturated: r.saturated,
        order: game.state.story.done.length / STORY.length,
        glow: game.state.settings.crt,
        peak:
          peak && now < peak.expiresAt
            ? { x: peak.x, life: (peak.expiresAt - now) / (peak.expiresAt - peak.spawnedAt) }
            : null,
      };
    });
    this.scope.start();

    this.tutorial = new Tutorial(root, game, () => cb.requestSave());
    game.onLog((msg) => this.pushLog(msg));
    game.onEvent((e) => this.handleEvent(e));
    // Áudio só pode começar depois de um gesto do usuário.
    root.addEventListener('pointerdown', () => sound.unlock(), { capture: true });
    this.applySettings();
    this.showTab('antennas');
  }

  /** Chamado ~10x por segundo. */
  update(now = Date.now()): void {
    const s = this.game.state;
    const r = this.game.rates(now);

    setText(this.hudData, formatBytes(s.data));
    const boostLeft = s.boost ? Math.ceil((s.boost.endsAt - now) / 1000) : 0;
    setText(
      this.hudRate,
      `+${formatBytes(r.dataPerSec)}/s` + (r.boost > 1 ? ` · ×${r.boost} ${boostLeft}s` : ''),
    );
    this.hudRate.classList.toggle('boost', r.boost > 1);
    setText(
      this.hudSignal,
      `~ ${formatHz(r.signal)}\n▤ ${formatHz(r.capacity)} máx` +
        (r.saturated ? `\n−${formatBytes(r.lostDataPerSec)}/s perdidos` : ''),
    );
    this.hudSignal.classList.toggle('sat', r.saturated);
    setVisible(this.scopeSat, r.saturated);
    setVisible(this.scopeHint, s.stats.taps < 5);

    // A aba Silêncio só aparece quando liberada.
    const silenceOpen = this.game.isSilenceUnlocked();
    const silenceTab = this.tabButtons.get('silence')!;
    if (silenceTab.btn.hidden === silenceOpen) silenceTab.btn.hidden = !silenceOpen;
    const columns = `repeat(${silenceOpen ? TABS.length : TABS.length - 1}, 1fr)`;
    if (this.nav.style.gridTemplateColumns !== columns) this.nav.style.gridTemplateColumns = columns;
    this.setBadge('silence', silenceOpen && this.game.canSilence() && s.prestige.silences === 0);

    const journalBadge =
      s.story.unread.length > 0 || (!s.story.decoding && this.game.availableTransmissions().length > 0);
    this.setBadge('journal', journalBadge);
    const spectrumOpen = this.game.isSpectrumUnlocked();
    this.setBadge('spectrum', spectrumOpen && (s.spectrum.unseen || (s.spectrum.scans === 0 && !s.spectrum.scan)));
    this.tabButtons.get('spectrum')?.btn.classList.toggle('locked', !spectrumOpen);

    this.panels[this.current].update(now);
    this.tutorial.update();
  }

  showOfflineReport(report: OfflineReport): void {
    const body: (Node | string)[] = [
      `Você ficou fora por ${formatDuration(report.elapsed)}.`,
      `As antenas captaram ${formatBytes(report.gained)}.`,
    ];
    if (report.counted < report.elapsed) {
      body.push(h('p', { class: 'muted small', text: `(Só as primeiras ${formatDuration(report.counted)} foram registradas.)` }));
    }
    const decoded = report.storyUnlocked.map((id) => getStory(id)).filter((e) => e?.kind === 'transmission');
    if (decoded.length > 0) {
      body.push(`${decoded.length === 1 ? 'Uma transmissão foi decifrada' : `${decoded.length} transmissões foram decifradas`}.`);
    }
    if (report.scan) {
      const src = report.scan.sourceId ? getSource(report.scan.sourceId) : undefined;
      body.push(src ? `A varredura encontrou uma fonte: ${src.name}.` : 'A varredura terminou. Nada novo.');
    }
    showModal('Enquanto você estava fora…', body);
  }

  private handleEvent(e: GameEvent): void {
    const haptics = this.game.state.settings.haptics;
    switch (e.type) {
      case 'buy':
        sound.play('buy');
        break;
      case 'decoded':
        sound.play('decoded');
        hapticMedium(haptics);
        break;
      case 'journal':
        sound.play('journal');
        break;
      case 'scan':
        sound.play(e.found ? 'scanFound' : 'scanEmpty');
        if (e.found) hapticMedium(haptics);
        break;
      case 'peak':
        sound.play('peak');
        break;
      case 'peakClaim':
        sound.play('peakClaim');
        break;
      case 'silence':
        sound.play('silence');
        break;
      case 'decodeStart':
      case 'scanStart':
        // Momento certo para pedir permissão: o jogador acabou de começar algo demorado.
        void ensureNotificationPermission(this.game.state.settings.notifications);
        break;
    }
  }

  private showSilenceModal(clarity: number, previous: string, operator: string): void {
    const p = this.game.state.prestige;
    showModal(
      'Fim do turno',
      [
        previous === 'você' ? 'Você deixa a estação.' : `${previous} deixa a estação.`,
        `+${clarity} de Clareza. Agora são ${p.clarity} (+${Math.round(p.clarity * 2)}% de dados).`,
        `${operator} assume o turno. Na gaveta, encontra o caderno de quem veio antes, e o diário inteiro.`,
        h('p', { class: 'muted small', text: 'As antenas foram desmontadas. O céu continua lá.' }),
      ],
      'Começar o turno',
    );
  }

  private showTab(id: TabId): void {
    this.current = id;
    for (const [tabId, { btn }] of this.tabButtons) btn.classList.toggle('active', tabId === id);
    const panel = this.panels[id];
    this.panelHost.replaceChildren(panel.el);
    this.panelHost.scrollTop = 0;
    panel.onShow?.();
    panel.update(Date.now());
  }

  private setBadge(id: TabId, on: boolean): void {
    const tab = this.tabButtons.get(id);
    if (tab) setVisible(tab.badge, on);
  }

  private handleTap(e: PointerEvent): void {
    const rect = this.scopeEl.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const xFrac = x / rect.width;
    this.scope.pulse(xFrac);

    const reward = this.game.claimPeak(xFrac);
    if (reward) {
      hapticMedium(this.game.state.settings.haptics);
      const text = reward.kind === 'boost' ? `×${reward.mult} por ${reward.seconds}s` : `+${formatBytes(reward.bytes)}`;
      this.spawnFloater(x, y, text, true);
      return;
    }

    const gained = this.game.tap();
    sound.play('tap');
    hapticLight(this.game.state.settings.haptics);
    this.spawnFloater(x, y, `+${formatBytes(gained)}`, false);
  }

  private spawnFloater(x: number, y: number, text: string, special: boolean): void {
    const floater = h('div', { class: special ? 'floater special' : 'floater', text });
    floater.style.left = `${x}px`;
    floater.style.top = `${y}px`;
    // Timeout em vez de animationend: com "reduzir movimento" a animação não roda.
    window.setTimeout(() => floater.remove(), 950);
    this.scopeEl.append(floater);
  }

  private pushLog(message: string): void {
    this.logEl.append(h('div', { class: 'log-line', text: message }));
    while (this.logEl.childElementCount > LOG_MAX) this.logEl.firstElementChild?.remove();
  }

  private applySettings(): void {
    const st = this.game.state.settings;
    document.body.classList.toggle('crt', st.crt);
    sound.configure(st.sound, st.ambient);
  }
}
