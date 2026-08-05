import { describe, expect, it } from 'vitest';
import { ACCOUNT, SUPPLIED_TRADES } from '../data/mockData';
import type { Account, Trade } from '../data/types';
import {
  buildEquityCurve,
  calculateCurrentBalance,
  calculateDailyLoss,
  calculateDailyPnl,
  calculateDrawdown,
  calculatePerformanceByAsset,
  calculateTotalPnl,
  calculateTradeStats,
  safeUtilisation,
  sortTradesChronologically,
} from './calculations';

const trade = (pnl: number, date = '2026-08-05', asset = 'BTC'): Trade => ({
  id: `${asset}-${pnl}-${date}`,
  asset,
  direction: 'Long',
  pnl,
  date,
});

describe('supplied data from the brief', () => {
  it('derives the current balance the brief quotes ($103,250)', () => {
    expect(calculateCurrentBalance(SUPPLIED_TRADES, ACCOUNT)).toBe(103_250);
  });

  it('totals P&L to +$3,250', () => {
    expect(calculateTotalPnl(SUPPLIED_TRADES)).toBe(3_250);
  });

  it('reports 3 wins, 2 losses and a 60% win rate', () => {
    const stats = calculateTradeStats(SUPPLIED_TRADES);
    expect(stats.winningTrades).toBe(3);
    expect(stats.losingTrades).toBe(2);
    expect(stats.winRate).toBe(60);
  });

  it('identifies the largest win and loss', () => {
    const stats = calculateTradeStats(SUPPLIED_TRADES);
    expect(stats.largestWin).toBe(2_000);
    expect(stats.largestLoss).toBe(-450);
  });

  it('is at an equity high, so drawdown is zero and the full buffer remains', () => {
    const result = calculateDrawdown(SUPPLIED_TRADES, ACCOUNT);
    expect(result.currentDrawdown).toBe(0);
    expect(result.remainingDrawdown).toBe(10_000);
    expect(result.peakEquity).toBe(103_250);
  });
});

describe('calculateTradeStats', () => {
  it('handles an empty trade list without dividing by zero', () => {
    const stats = calculateTradeStats([]);
    expect(stats.totalTrades).toBe(0);
    expect(stats.winRate).toBe(0);
    expect(stats.largestWin).toBeNull();
    expect(stats.largestLoss).toBeNull();
    expect(stats.averageWin).toBeNull();
    expect(stats.averageLoss).toBeNull();
  });

  it('reports 100% when every trade wins, with no loss figures', () => {
    const stats = calculateTradeStats([trade(100), trade(200)]);
    expect(stats.winRate).toBe(100);
    expect(stats.largestLoss).toBeNull();
    expect(stats.averageLoss).toBeNull();
  });

  it('reports 0% when every trade loses, with no win figures', () => {
    const stats = calculateTradeStats([trade(-100), trade(-200)]);
    expect(stats.winRate).toBe(0);
    expect(stats.largestWin).toBeNull();
    expect(stats.averageWin).toBeNull();
  });

  it('counts breakeven trades separately and excludes them from win rate', () => {
    const stats = calculateTradeStats([trade(100), trade(-100), trade(0)]);
    expect(stats.breakevenTrades).toBe(1);
    expect(stats.winningTrades).toBe(1);
    expect(stats.losingTrades).toBe(1);
    // 1 win of 2 decisive trades, not 1 of 3.
    expect(stats.winRate).toBe(50);
  });

  it('averages wins and losses independently', () => {
    const stats = calculateTradeStats([trade(100), trade(300), trade(-200)]);
    expect(stats.averageWin).toBe(200);
    expect(stats.averageLoss).toBe(-200);
  });
});

describe('buildEquityCurve', () => {
  it('starts at the starting balance before any trade', () => {
    const curve = buildEquityCurve([], ACCOUNT);
    expect(curve).toHaveLength(1);
    expect(curve[0].equity).toBe(ACCOUNT.startingBalance);
  });

  it('tracks equity and a non-decreasing high-water mark', () => {
    const curve = buildEquityCurve(
      [trade(1_000, '2026-08-01'), trade(-400, '2026-08-02')],
      ACCOUNT,
    );
    expect(curve.map((p) => p.equity)).toEqual([100_000, 101_000, 100_600]);
    // Peak holds at the high even after the account gives some back.
    expect(curve.map((p) => p.peak)).toEqual([100_000, 101_000, 101_000]);
  });
});

describe('calculateDrawdown', () => {
  it('measures from the peak, not from the starting balance', () => {
    // Up 5k then down 2k: profitable overall, but 2k below the high.
    const trades = [trade(5_000, '2026-08-01'), trade(-2_000, '2026-08-02')];
    const result = calculateDrawdown(trades, ACCOUNT);
    expect(result.peakEquity).toBe(105_000);
    expect(result.currentEquity).toBe(103_000);
    expect(result.currentDrawdown).toBe(2_000);
    expect(result.remainingDrawdown).toBe(8_000);
  });

  it('never reports a negative drawdown for an account at its high', () => {
    const result = calculateDrawdown([trade(5_000)], ACCOUNT);
    expect(result.currentDrawdown).toBe(0);
  });

  it('clamps remaining drawdown at zero once the limit is exceeded', () => {
    const trades = [trade(1_000, '2026-08-01'), trade(-15_000, '2026-08-02')];
    const result = calculateDrawdown(trades, ACCOUNT);
    expect(result.currentDrawdown).toBe(15_000);
    expect(result.remainingDrawdown).toBe(0);
  });

  it('remembers the worst decline even after recovering', () => {
    const trades = [
      trade(5_000, '2026-08-01'),
      trade(-4_000, '2026-08-02'),
      trade(6_000, '2026-08-03'),
    ];
    const result = calculateDrawdown(trades, ACCOUNT);
    expect(result.currentDrawdown).toBe(0);
    expect(result.maxDrawdownReached).toBe(4_000);
  });
});

describe('daily figures', () => {
  it('groups P&L by date in chronological order', () => {
    const days = calculateDailyPnl(SUPPLIED_TRADES);
    expect(days).toEqual([
      { date: '2026-08-03', pnl: 750, tradeCount: 2 },
      { date: '2026-08-04', pnl: 500, tradeCount: 2 },
      { date: '2026-08-05', pnl: 2_000, tradeCount: 1 },
    ]);
  });

  it('reports no loss on a profitable final day', () => {
    const result = calculateDailyLoss(SUPPLIED_TRADES, ACCOUNT);
    expect(result.dayPnl).toBe(2_000);
    expect(result.currentDayLoss).toBe(0);
    expect(result.remainingDailyLoss).toBe(5_000);
  });

  it('reports the loss and shrinks the buffer on a losing final day', () => {
    const trades = [trade(1_000, '2026-08-01'), trade(-2_000, '2026-08-02')];
    const result = calculateDailyLoss(trades, ACCOUNT);
    expect(result.currentDayLoss).toBe(2_000);
    expect(result.remainingDailyLoss).toBe(3_000);
  });

  it('clamps the daily buffer at zero once breached', () => {
    const result = calculateDailyLoss([trade(-8_000)], ACCOUNT);
    expect(result.remainingDailyLoss).toBe(0);
    expect(result.utilisation).toBe(100);
  });

  it('returns the full allowance when there are no trades', () => {
    const result = calculateDailyLoss([], ACCOUNT);
    expect(result.date).toBeNull();
    expect(result.remainingDailyLoss).toBe(ACCOUNT.dailyLossLimit);
  });

  it('only counts the most recent day, not the whole history', () => {
    const trades = [trade(-4_000, '2026-08-01'), trade(-1_000, '2026-08-02')];
    expect(calculateDailyLoss(trades, ACCOUNT).currentDayLoss).toBe(1_000);
  });
});

describe('sortTradesChronologically', () => {
  it('orders by date regardless of input order', () => {
    const trades = [trade(1, '2026-08-05'), trade(2, '2026-08-01'), trade(3, '2026-08-03')];
    expect(sortTradesChronologically(trades).map((t) => t.pnl)).toEqual([2, 3, 1]);
  });

  it('preserves input order for trades on the same day', () => {
    const trades = [trade(1, '2026-08-01'), trade(2, '2026-08-01')];
    expect(sortTradesChronologically(trades).map((t) => t.pnl)).toEqual([1, 2]);
  });

  it('does not mutate the input array', () => {
    const trades = [trade(1, '2026-08-05'), trade(2, '2026-08-01')];
    sortTradesChronologically(trades);
    expect(trades.map((t) => t.pnl)).toEqual([1, 2]);
  });
});

describe('calculatePerformanceByAsset', () => {
  it('aggregates per asset and sorts by P&L descending', () => {
    const result = calculatePerformanceByAsset(SUPPLIED_TRADES);
    // BTC 1200+800 = 2000, ETH -450+2000 = 1550, SOL -300.
    expect(result.map((a) => a.asset)).toEqual(['BTC', 'ETH', 'SOL']);
    expect(result.find((a) => a.asset === 'BTC')?.pnl).toBe(2_000);
    expect(result.find((a) => a.asset === 'ETH')?.pnl).toBe(1_550);
    expect(result.find((a) => a.asset === 'SOL')?.pnl).toBe(-300);
  });

  it('returns an empty array for no trades', () => {
    expect(calculatePerformanceByAsset([])).toEqual([]);
  });
});

describe('safeUtilisation', () => {
  it('returns a percentage of the limit consumed', () => {
    expect(safeUtilisation(2_500, 5_000)).toBe(50);
  });

  it('clamps above 100 and below 0', () => {
    expect(safeUtilisation(9_000, 5_000)).toBe(100);
    expect(safeUtilisation(-100, 5_000)).toBe(0);
  });

  it('does not produce NaN or Infinity for a zero limit', () => {
    expect(safeUtilisation(0, 0)).toBe(0);
    expect(safeUtilisation(100, 0)).toBe(100);
  });
});

const zeroLimitAccount: Account = {
  startingBalance: 100_000,
  maxDrawdown: 0,
  dailyLossLimit: 0,
};

describe('degenerate account rules', () => {
  it('handles zero limits without NaN', () => {
    const result = calculateDrawdown([trade(-500, '2026-08-01')], zeroLimitAccount);
    expect(Number.isFinite(result.utilisation)).toBe(true);
    expect(result.remainingDrawdown).toBe(0);
  });
});
