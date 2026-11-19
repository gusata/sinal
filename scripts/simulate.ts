/**
 * Simulação de ritmo: um "bot" joga o jogo inteiro com um relógio virtual
 * (horas de jogo rodam em milissegundos) e mede quanto tempo real cada marco levaria.
 *
 * Uso:
 *   npm run sim                          # todos os perfis, 10 partidas cada
 *   npm run sim -- --seeds 30            # mais partidas (mais confiável)
 *   npm run sim -- --perfil casual       # só um perfil
 *   npm run sim -- --perfil casual --detalhe   # linha do tempo completa da 1ª partida
 *   npm run sim -- --ate fim-arco-1      # para cada partida num marco (mais rápido para balancear)
 */
import { formatBytes } from '../src/core/format';
import { Game } from '../src/core/game';
import { allMet, type Requirement } from '../src/core/requirements';
import { createInitialState, type GameState } from '../src/core/state';
import { ANTENNAS } from '../src/data/antennas';
import type { DecoderUpgrade } from '../src/data/decoder';
import { SCANS, SOURCES } from '../src/data/spectrum';
import { STORY } from '../src/data/story';
import { UPGRADES, type UpgradeId } from '../src/data/upgrades';

const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const STEP_MS = SEC;
const MAX_DAYS = 60;
/** Para a simulação se ficar tanto tempo (online) sem nenhum progresso. */
const STUCK_ONLINE_MS = 6 * HOUR;

// ─── Perfis de jogador ──────────────────────────────────────────────

interface Session {
  /** Início, em ms desde a meia-noite. */
  start: number;
  duration: number;
}

interface Profile {
  id: string;
  name: string;
  desc: string;
  tapsPerSec: number;
  /** Chance de pegar um pico que aparece enquanto está jogando. */
  peakCatch: number;
  /** Segundos até tocar no pico. */
  reactionS: number;
  sessions: Session[];
}

const at = (h: number, m = 0) => h * HOUR + m * MIN;

const PROFILES: Profile[] = [
  {
    id: 'maratona',
    name: 'Maratona',
    desc: 'joga sem parar, 2 toques/s (limite teórico, ninguém joga assim)',
    tapsPerSec: 2,
    peakCatch: 1,
    reactionS: 1,
    sessions: [{ start: 0, duration: DAY }],
  },
  {
    id: 'dedicado',
    name: 'Dedicado',
    desc: '3 sessões de 1h por dia, 1,5 toque/s',
    tapsPerSec: 1.5,
    peakCatch: 0.9,
    reactionS: 1.5,
    sessions: [at(9), at(14), at(21)].map((start) => ({ start, duration: HOUR })),
  },
  {
    id: 'casual',
    name: 'Casual',
    desc: '8 sessões de 10min por dia (a cada 2h, das 8h às 22h), 1 toque/s',
    tapsPerSec: 1,
    peakCatch: 0.7,
    reactionS: 2,
    sessions: [8, 10, 12, 14, 16, 18, 20, 22].map((h) => ({ start: at(h), duration: 10 * MIN })),
  },
  {
    id: 'idle',
    name: 'Idle',
    desc: '3 espiadas de 3min por dia, 0,5 toque/s',
    tapsPerSec: 0.5,
    peakCatch: 0.5,
    reactionS: 2,
    sessions: [at(8), at(13), at(20)].map((start) => ({ start, duration: 3 * MIN })),
  },
];

// ─── Utilitários ────────────────────────────────────────────────────

/** RNG com semente (mulberry32): mesma semente = mesma partida. */
function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fmtTime(ms: number | undefined): string {
  if (ms === undefined) return '—';
  const totalMin = Math.round(ms / MIN);
  const d = Math.floor(totalMin / (24 * 60));
  const h = Math.floor((totalMin % (24 * 60)) / 60);
  const m = totalMin % 60;
  if (d > 0) return `${d}d ${String(h).padStart(2, '0')}h`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  if (ms < MIN) return `${Math.round(ms / SEC)}s`;
  return `${m}min`;
}

function median(values: number[]): number | undefined {
  if (values.length === 0) return undefined;
  const s = [...values].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1]! + s[mid]!) / 2;
}

function pad(s: string, n: number): string {
  return s.length >= n ? s : s + ' '.repeat(n - s.length);
}

function padLeft(s: string, n: number): string {
  return s.length >= n ? s : ' '.repeat(n - s.length) + s;
}

// ─── Marcos medidos ─────────────────────────────────────────────────

interface Milestone {
  key: string;
  label: string;
}

const MILESTONES: Milestone[] = [
  ...ANTENNAS.map((a) => ({ key: `antena:${a.id}`, label: `1ª ${a.name}` })),
  ...STORY.map((e) => ({ key: `story:${e.id}`, label: `${e.kind === 'log' ? 'Diário' : 'Transm.'}: ${e.title}` })),
  { key: 'espectro', label: 'Espectro liberado' },
  { key: 'fontes:natural', label: 'Todas as fontes naturais' },
  { key: 'fim-arco-1', label: 'FIM DO ARCO 1' },
  { key: 'tudo', label: '100% do conteúdo' },
];

interface MilestoneHit {
  /** Tempo de calendário desde a primeira abertura. */
  calendar: number;
  /** Tempo com o app aberto. */
  online: number;
}

interface Stall {
  online: number;
  waitingFor: string;
  atCalendar: number;
}

interface RunResult {
  hits: Map<string, MilestoneHit>;
  timeline: { calendar: number; online: number; text: string }[];
  stalls: Stall[];
  stuck: string | null;
  final: GameState;
  peaksSeen: number;
}

// ─── Bot ────────────────────────────────────────────────────────────

interface Candidate {
  label: string;
  cost: number;
  /** Ganho de produção (bytes/s, incluindo toques) se comprar. */
  gain: number;
  buy(): boolean;
}

function run(profile: Profile, seed: number, stopAt: string): RunResult {
  const gameRng = seeded(seed);
  const botRng = seeded(seed ^ 0x9e3779b9);

  let now = profile.sessions[0]!.start;
  let online = 0;
  const startAt = now;
  const state = createInitialState(now);
  state.settings.buyMode = 1;
  const game = new Game(state, gameRng, () => now);

  const hits = new Map<string, MilestoneHit>();
  const timeline: RunResult['timeline'] = [];
  const stalls: Stall[] = [];
  let lastProgressOnline = 0;
  let waitingFor = 'nada';
  let peaksSeen = 0;

  const record = (key: string, text?: string) => {
    if (hits.has(key)) return;
    hits.set(key, { calendar: now - startAt, online });
    if (text) timeline.push({ calendar: now - startAt, online, text });
  };

  const progress = (text: string) => {
    const idle = online - lastProgressOnline;
    if (idle > 0) stalls.push({ online: idle, waitingFor, atCalendar: now - startAt });
    lastProgressOnline = online;
    timeline.push({ calendar: now - startAt, online, text });
  };

  // Valor que o bot dá ao estado: produção passiva + toques.
  const value = (g: Game) => g.rates(now).baseDataPerSec + profile.tapsPerSec * g.tapBytes();

  const gainOf = (mutate: (g: Game) => boolean): number => {
    const clone = new Game(structuredClone(game.state), () => 0.5, () => now);
    clone.state.data = Number.POSITIVE_INFINITY;
    if (!mutate(clone)) return 0;
    return value(clone) - value(game);
  };

  const antennaCandidate = (id: string): Candidate | null => {
    const def = ANTENNAS.find((a) => a.id === id);
    if (!def || !game.isAntennaUnlocked(def)) return null;
    return {
      label: def.name,
      cost: game.quoteAntenna(def, 1).cost,
      gain: gainOf((g) => g.buyAntenna(id)),
      buy: () => game.buyAntenna(id),
    };
  };

  const decoderCandidate = (kind: DecoderUpgrade): Candidate => ({
    label: kind === 'capacity' ? 'Capacidade do decodificador' : 'Eficiência do decodificador',
    cost: game.decoderCost(kind),
    gain: gainOf((g) => g.buyDecoder(kind)),
    buy: () => game.buyDecoder(kind),
  });

  const upgradeCandidate = (id: UpgradeId): Candidate | null => {
    const def = UPGRADES.find((u) => u.id === id)!;
    const cost = game.upgradeCost(def);
    if (!game.isUpgradeUnlocked(def) || cost === null) return null;
    return { label: def.name, cost, gain: gainOf((g) => g.buyUpgrade(id)), buy: () => game.buyUpgrade(id) };
  };

  /** Compras que destravam história/varreduras/antenas (requisitos ainda não cumpridos). */
  const goalCandidates = (): Candidate[] => {
    const reqs: Requirement[] = [
      ...STORY.filter((e) => !state.story.done.includes(e.id)).flatMap((e) => e.requires),
      ...SCANS.filter((s) => !allMet(s.requires, state)).flatMap((s) => s.requires),
      ...ANTENNAS.filter((a) => !game.isAntennaUnlocked(a)).flatMap((a) => a.requires),
    ].filter((r) => !allMet([r], state));

    const out: Candidate[] = [];
    for (const r of reqs) {
      if (r.kind === 'antenna') {
        const c = antennaCandidate(r.id);
        if (c) out.push({ ...c, label: `${c.label} (objetivo: ${r.count})` });
      } else if (r.kind === 'decoder') {
        out.push({ ...decoderCandidate(r.upgrade), label: `${decoderCandidate(r.upgrade).label} (objetivo: nv ${r.level})` });
      }
    }
    return out;
  };

  const productionCandidates = (): Candidate[] => {
    const list: (Candidate | null)[] = [
      ...ANTENNAS.map((a) => antennaCandidate(a.id)),
      decoderCandidate('capacity'),
      decoderCandidate('efficiency'),
      upgradeCandidate('ouvido'),
    ];
    return list.filter((c): c is Candidate => !!c && c.gain > 0);
  };

  /** Melhorias de conforto (offline, picos): compra quando custam até 10min de produção. */
  const comfortCandidates = (): Candidate[] =>
    (['gravador', 'turno', 'reflexo'] as UpgradeId[])
      .map((id) => upgradeCandidate(id))
      .filter((c): c is Candidate => !!c && c.cost <= game.rates(now).dataPerSec * 600);

  let currentPeak: unknown = null;
  let claimAt = Number.POSITIVE_INFINITY;
  let tapAcc = 0;

  const act = () => {
    // Picos
    if (game.peak && game.peak !== currentPeak) {
      currentPeak = game.peak;
      peaksSeen++;
      claimAt = botRng() < profile.peakCatch ? game.peak.spawnedAt + profile.reactionS * SEC : Number.POSITIVE_INFINITY;
    }
    if (game.peak && now >= claimAt) {
      claimAt = Number.POSITIVE_INFINITY;
      const reward = game.claimPeak(game.peak.x, now);
      if (reward) timeline.push({ calendar: now - startAt, online, text: `  pico: ${reward.kind === 'boost' ? '×10 30s' : `+${formatBytes(reward.bytes)}`}` });
    }

    // Toques
    tapAcc += (profile.tapsPerSec * STEP_MS) / SEC;
    while (tapAcc >= 1) {
      game.tap();
      tapAcc--;
    }

    // Decifrar (prioridade máxima: é a história)
    if (!state.story.decoding) {
      const next = game
        .availableTransmissions()
        .filter((e) => (e.cost ?? 0) <= state.data)
        .sort((a, b) => (a.cost ?? 0) - (b.cost ?? 0))[0];
      if (next && game.startDecoding(next.id, now)) progress(`decifra "${next.title}"`);
    }

    // Varrer: a mais profunda que ainda tenha fonte ao alcance e custe até metade do saldo
    if (game.isSpectrumUnlocked() && !state.spectrum.scan) {
      const scan = [...game.availableScans()]
        .sort((a, b) => b.depth - a.depth)
        .find((s) => game.sourcePool(s.depth).length > 0 && s.cost <= state.data * 0.5);
      if (scan && game.startScan(scan.depth, now)) progress(`inicia ${scan.name.toLowerCase()}`);
    }

    // Comprar
    for (let i = 0; i < 50; i++) {
      const goal = goalCandidates()
        .filter((c) => c.cost <= state.data)
        .sort((a, b) => a.cost - b.cost)[0];
      if (goal) {
        if (!goal.buy()) break;
        progress(`compra ${goal.label}`);
        continue;
      }
      const comfort = comfortCandidates().find((c) => c.cost <= state.data);
      if (comfort) {
        if (!comfort.buy()) break;
        progress(`compra ${comfort.label}`);
        continue;
      }
      // Melhor retorno: menor tempo de payback (custo / ganho).
      const best = productionCandidates().sort((a, b) => a.cost / a.gain - b.cost / b.gain)[0];
      if (!best) {
        waitingFor = 'nada para comprar';
        break;
      }
      if (best.cost > state.data) {
        waitingFor = best.label;
        break;
      }
      if (!best.buy()) break;
      progress(`compra ${best.label}`);
    }
  };

  const checkMilestones = () => {
    for (const a of ANTENNAS) if ((state.antennas[a.id] ?? 0) > 0) record(`antena:${a.id}`);
    for (const id of state.story.done) {
      const e = STORY.find((s) => s.id === id);
      if (e && !hits.has(`story:${id}`)) {
        const r = game.rates(now);
        record(
          `story:${id}`,
          `★ ${e.kind === 'log' ? 'diário' : 'transmissão'}: ${e.title}  [${formatBytes(r.dataPerSec)}/s · sinal ${r.signal.toFixed(1)}/${r.capacity} Hz · toque ${formatBytes(game.tapBytes())} · cap nv${state.decoder.capacityLevel} ef nv${state.decoder.efficiencyLevel} ouv nv${state.upgrades.ouvido ?? 0}]`,
        );
        lastProgressOnline = online;
      }
    }
    if (game.isSpectrumUnlocked()) record('espectro', '★ Espectro liberado');
    for (const id of state.spectrum.found) {
      if (!hits.has(`fonte:${id}`)) {
        const s = SOURCES.find((x) => x.id === id);
        record(`fonte:${id}`, `◆ fonte: ${s?.name ?? id}`);
        lastProgressOnline = online;
      }
    }
    if (SOURCES.filter((s) => s.kind === 'natural').every((s) => state.spectrum.found.includes(s.id))) {
      record('fontes:natural');
    }
    if (state.story.done.includes('d05-ultima-pagina')) record('fim-arco-1', '■ FIM DO ARCO 1');
    if (STORY.every((e) => state.story.done.includes(e.id)) && SOURCES.every((s) => state.spectrum.found.includes(s.id))) {
      record('tudo', '■ 100% do conteúdo');
    }
  };

  let stuck: string | null = null;

  outer: for (let day = 0; day < MAX_DAYS; day++) {
    for (const session of profile.sessions) {
      const start = day * DAY + session.start;
      if (start < now) continue;
      now = start;
      game.tick(now); // ao voltar: progresso offline
      checkMilestones();
      const end = start + session.duration;
      while (now < end) {
        now += STEP_MS;
        online += STEP_MS;
        game.tick(now);
        act();
        checkMilestones();
        if (hits.has(stopAt)) break outer;
        if (online - lastProgressOnline > STUCK_ONLINE_MS) {
          stuck = `sem progresso por ${fmtTime(STUCK_ONLINE_MS)} online (esperando: ${waitingFor})`;
          break outer;
        }
      }
    }
  }

  return { hits, timeline, stalls, stuck, final: state, peaksSeen };
}

// ─── Relatório ──────────────────────────────────────────────────────

function parseArgs() {
  const args = process.argv.slice(2);
  const get = (name: string) => {
    const i = args.indexOf(`--${name}`);
    return i >= 0 ? args[i + 1] : undefined;
  };
  return {
    seeds: Number(get('seeds') ?? 10),
    profile: get('perfil'),
    detail: args.includes('--detalhe'),
    stopAt: get('ate') ?? 'tudo',
  };
}

function report(profile: Profile, results: RunResult[], detail: boolean) {
  const n = results.length;
  console.log('');
  console.log('═'.repeat(78));
  console.log(` ${profile.name.toUpperCase()}: ${profile.desc}`);
  console.log(` ${n} partidas simuladas`);
  console.log('═'.repeat(78));
  console.log(` ${pad('Marco', 36)}${padLeft('calendário', 12)}${padLeft('com app aberto', 17)}${padLeft('alcançado', 11)}`);
  console.log(' ' + '─'.repeat(76));

  for (const m of MILESTONES) {
    const hits = results.map((r) => r.hits.get(m.key)).filter((h): h is MilestoneHit => !!h);
    const cal = median(hits.map((h) => h.calendar));
    const onl = median(hits.map((h) => h.online));
    const reached = hits.length === n ? '' : `${hits.length}/${n}`;
    const strong = m.key === 'fim-arco-1' || m.key === 'tudo';
    const line = ` ${pad(m.label, 36)}${padLeft(fmtTime(cal), 12)}${padLeft(fmtTime(onl), 17)}${padLeft(reached, 11)}`;
    if (strong) console.log(' ' + '─'.repeat(76));
    console.log(line);
  }

  // Esperas mais longas (tempo com app aberto sem nenhum progresso)
  const allStalls = results.flatMap((r) => r.stalls).sort((a, b) => b.online - a.online);
  console.log('');
  console.log(' Maiores esperas com o app aberto (sem nada para fazer):');
  const seen = new Set<string>();
  for (const s of allStalls) {
    if (seen.has(s.waitingFor)) continue;
    seen.add(s.waitingFor);
    console.log(`   ${padLeft(fmtTime(s.online), 8)}  esperando ${s.waitingFor}  (dia ${Math.floor(s.atCalendar / DAY) + 1})`);
    if (seen.size >= 5) break;
  }

  const stuck = results.filter((r) => r.stuck);
  if (stuck.length > 0) {
    console.log('');
    console.log(` ⚠ ${stuck.length}/${n} partidas TRAVARAM: ${stuck[0]!.stuck}`);
  }

  const final = results.map((r) => r.final);
  console.log('');
  console.log(
    ` Médias no fim: ${Math.round(median(final.map((s) => s.stats.taps))!)} toques · ` +
      `${Math.round(median(final.map((s) => s.stats.peaks))!)}/${Math.round(median(results.map((r) => r.peaksSeen))!)} picos pegos · ` +
      `${Math.round(median(final.map((s) => s.spectrum.scans))!)} varreduras · ` +
      `${formatBytes(median(final.map((s) => s.lifetimeData))!)} captados`,
  );

  if (detail) {
    console.log('');
    console.log(' Linha do tempo da partida #1 (calendário | app aberto):');
    for (const t of results[0]!.timeline) {
      console.log(`   ${padLeft(fmtTime(t.calendar), 8)} | ${padLeft(fmtTime(t.online), 8)}  ${t.text}`);
    }
  }
}

function main() {
  const { seeds, profile: only, detail, stopAt } = parseArgs();
  const wanted = only?.split(',');
  const profiles = wanted ? PROFILES.filter((p) => wanted.includes(p.id)) : PROFILES;
  if (profiles.length === 0) {
    console.error(`Perfil desconhecido. Opções: ${PROFILES.map((p) => p.id).join(', ')}`);
    process.exit(1);
  }

  const t0 = performance.now();
  for (const p of profiles) {
    const results = Array.from({ length: seeds }, (_, i) => run(p, i + 1, stopAt));
    report(p, results, detail);
  }
  console.log('');
  console.log(`(simulação levou ${((performance.now() - t0) / 1000).toFixed(1)}s)`);
}

main();
