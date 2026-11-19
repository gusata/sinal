// Progresso offline: calculado de forma analítica (taxa × tempo), sem simular tick a tick.
// Enquanto o jogador está fora nada é comprado, então a taxa é constante.
// Eficiência e limite vêm das melhorias "Gravador de fita" e "Turno estendido" (data/upgrades.ts).

/** Pausas maiores que isso contam como "offline" (rendem menos e geram relatório). */
export const OFFLINE_THRESHOLD_S = 10;
/** Ausências menores que isso não mostram o relatório na tela. */
export const OFFLINE_REPORT_MIN_S = 60;

export interface OfflineResult {
  /** Tempo real que o jogador ficou fora. */
  elapsed: number;
  /** Tempo efetivamente contabilizado (com limite). */
  counted: number;
  gained: number;
}

export function computeOffline(
  dataPerSec: number,
  elapsedSec: number,
  efficiency: number,
  capSec: number,
): OfflineResult {
  const elapsed = Math.max(0, elapsedSec);
  const counted = Math.min(elapsed, capSec);
  return { elapsed, counted, gained: dataPerSec * counted * efficiency };
}
