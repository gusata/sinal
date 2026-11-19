// Fórmulas puras de economia. Sem estado, fáceis de testar e de balancear.

export const COST_GROWTH = 1.15;

/** Marcos de quantidade: cada marco atingido dobra a produção daquela antena. */
export const MILESTONES = [10, 25, 50, 100, 200] as const;

/** Custo da próxima unidade, tendo `owned` unidades. */
export function costOfNext(base: number, owned: number, growth = COST_GROWTH): number {
  return base * growth ** owned;
}

/** Custo total para comprar `n` unidades a partir de `owned` (soma geométrica). */
export function costOfN(base: number, owned: number, n: number, growth = COST_GROWTH): number {
  if (n <= 0) return 0;
  return (base * growth ** owned * (growth ** n - 1)) / (growth - 1);
}

/** Quantas unidades dá para comprar com `budget`. */
export function maxAffordable(base: number, owned: number, budget: number, growth = COST_GROWTH): number {
  const first = costOfNext(base, owned, growth);
  if (budget < first) return 0;
  let n = Math.floor(Math.log((budget * (growth - 1)) / first + 1) / Math.log(growth));
  // Corrige imprecisão de ponto flutuante.
  while (n > 0 && costOfN(base, owned, n, growth) > budget) n--;
  return n;
}

export function milestoneMultiplier(count: number): number {
  return 2 ** MILESTONES.filter((m) => count >= m).length;
}

export function nextMilestone(count: number): number | null {
  return MILESTONES.find((m) => count < m) ?? null;
}
