import { describe, expect, it } from 'vitest';
import { costOfN, costOfNext, maxAffordable, milestoneMultiplier, nextMilestone } from './economy';

describe('economia', () => {
  it('custo cresce 15% por unidade', () => {
    expect(costOfNext(100, 0)).toBe(100);
    expect(costOfNext(100, 1)).toBeCloseTo(115);
    expect(costOfNext(100, 2)).toBeCloseTo(132.25);
  });

  it('custo de N bate com a soma unidade a unidade', () => {
    let sum = 0;
    for (let i = 5; i < 15; i++) sum += costOfNext(10, i);
    expect(costOfN(10, 5, 10)).toBeCloseTo(sum, 6);
  });

  it('maxAffordable nunca passa do orçamento', () => {
    for (const budget of [0, 9, 10, 25, 1000, 123456, 9.87e9]) {
      const n = maxAffordable(10, 3, budget);
      expect(costOfN(10, 3, n)).toBeLessThanOrEqual(budget);
      expect(costOfN(10, 3, n + 1)).toBeGreaterThan(budget);
    }
  });

  it('marcos dobram a produção', () => {
    expect(milestoneMultiplier(9)).toBe(1);
    expect(milestoneMultiplier(10)).toBe(2);
    expect(milestoneMultiplier(25)).toBe(4);
    expect(milestoneMultiplier(200)).toBe(32);
    expect(nextMilestone(0)).toBe(10);
    expect(nextMilestone(10)).toBe(25);
    expect(nextMilestone(200)).toBeNull();
  });
});
