import { describe, expect, it } from 'vitest';
import { ACCOUNT, SUPPLIED_TRADES } from '../data/mockData';
import type { Trade } from '../data/types';
import {
  assessRisk,
  calculateSizingGuidance,
  levelFromUtilisation,
  worstLevel,
} from './risk';

const trade = (pnl: number, date = '2026-08-05'): Trade => ({
  id: `${pnl}-${date}`,
  asset: 'BTC',
  direction: 'Long',
  pnl,
  date,
});

describe('levelFromUtilisation', () => {
  it('maps each band to the right level', () => {
    expect(levelFromUtilisation(0)).toBe('safe');
    expect(levelFromUtilisation(49.9)).toBe('safe');
    expect(levelFromUtilisation(50)).toBe('approaching');
    expect(levelFromUtilisation(79.9)).toBe('approaching');
    expect(levelFromUtilisation(80)).toBe('at-risk');
    expect(levelFromUtilisation(99.9)).toBe('at-risk');
    expect(levelFromUtilisation(100)).toBe('breached');
  });
});

describe('worstLevel', () => {
  it('returns the more severe of two levels, either way round', () => {
    expect(worstLevel('safe', 'at-risk')).toBe('at-risk');
    expect(worstLevel('at-risk', 'safe')).toBe('at-risk');
    expect(worstLevel('approaching', 'breached')).toBe('breached');
    expect(worstLevel('safe', 'safe')).toBe('safe');
  });
});

describe('assessRisk', () => {
  it('rates the supplied data as safe', () => {
    const result = assessRisk(SUPPLIED_TRADES, ACCOUNT);
    expect(result.overallLevel).toBe('safe');
    expect(result.drawdownLevel).toBe('safe');
    expect(result.dailyLossLevel).toBe('safe');
  });

  it('rates an untraded account as safe', () => {
    expect(assessRisk([], ACCOUNT).overallLevel).toBe('safe');
  });

  it('escalates when drawdown alone is severe', () => {
    // 8,500 of a 10,000 drawdown = 85%, but spread so no single day breaches.
    const trades = [
      trade(-4_000, '2026-08-01'),
      trade(-4_500, '2026-08-02'),
    ];
    const result = assessRisk(trades, ACCOUNT);
    expect(result.drawdownLevel).toBe('at-risk');
    expect(result.overallLevel).toBe('at-risk');
    expect(result.message).toContain('maximum drawdown');
  });

  it('escalates when the daily loss alone is severe', () => {
    // 4,500 of a 5,000 daily limit = 90%, but only 45% of the drawdown.
    const result = assessRisk([trade(-4_500, '2026-08-05')], ACCOUNT);
    expect(result.dailyLossLevel).toBe('at-risk');
    expect(result.drawdownLevel).toBe('safe');
    expect(result.overallLevel).toBe('at-risk');
    expect(result.message).toContain('daily loss limit');
  });

  it('takes the worst of the two rules as the headline verdict', () => {
    // Daily loss is only 20%, drawdown is 100%.
    const trades = [trade(-9_000, '2026-08-01'), trade(-1_000, '2026-08-02')];
    const result = assessRisk(trades, ACCOUNT);
    expect(result.dailyLossLevel).toBe('safe');
    expect(result.overallLevel).toBe('breached');
  });

  it('names both rules when they are equally severe', () => {
    const result = assessRisk([trade(-10_000, '2026-08-05')], ACCOUNT);
    expect(result.overallLevel).toBe('breached');
    expect(result.message).toContain('maximum drawdown');
    expect(result.message).toContain('daily loss limit');
  });
});

describe('calculateSizingGuidance', () => {
  it('estimates how many average losses fit in the remaining buffer', () => {
    // Average loss 1,000; day is down 2,000 so 3,000 of the daily limit remains.
    const trades = [
      trade(5_000, '2026-08-01'),
      trade(-1_000, '2026-08-02'),
      trade(-1_000, '2026-08-02'),
    ];
    const guidance = calculateSizingGuidance(trades, ACCOUNT);
    expect(guidance.averageLoss).toBe(1_000);
    expect(guidance.lossesUntilDailyLimit).toBe(3);
    // 2,000 into the drawdown, 8,000 left, so 8 average losses.
    expect(guidance.lossesUntilDrawdownLimit).toBe(8);
    expect(guidance.bindingConstraint).toBe('daily');
    expect(guidance.maxSafeLoss).toBe(3_000);
  });

  it('reports the drawdown as binding when it runs out first', () => {
    // Drawdown 9,000 used on an earlier day; today is flat.
    const trades = [trade(-9_000, '2026-08-01'), trade(0, '2026-08-05')];
    const guidance = calculateSizingGuidance(trades, ACCOUNT);
    expect(guidance.remainingDrawdown).toBe(1_000);
    expect(guidance.remainingDailyLoss).toBe(5_000);
    expect(guidance.bindingConstraint).toBe('drawdown');
  });

  it('degrades gracefully when there are no losing trades yet', () => {
    const guidance = calculateSizingGuidance([trade(500)], ACCOUNT);
    expect(guidance.averageLoss).toBeNull();
    expect(guidance.lossesUntilDailyLimit).toBeNull();
    expect(guidance.bindingConstraint).toBeNull();
    expect(guidance.headline).toContain('losing trade on record');
  });

  it('handles an empty account without dividing by zero', () => {
    const guidance = calculateSizingGuidance([], ACCOUNT);
    expect(guidance.averageLoss).toBeNull();
    expect(guidance.maxSafeLoss).toBe(5_000);
  });

  it('warns when there is no room left for another average loss', () => {
    // Average loss 2,000, only 500 of the daily limit left.
    const trades = [trade(-2_000, '2026-08-05'), trade(-2_500, '2026-08-05')];
    const guidance = calculateSizingGuidance(trades, ACCOUNT);
    expect(guidance.lossesUntilDailyLimit).toBe(0);
    expect(guidance.headline).toContain('would breach');
  });
});
