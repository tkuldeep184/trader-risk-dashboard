import type { Account, Trade } from '../data/types';

/** Sum of all realised P&L. */
export function calculateTotalPnl(trades: Trade[]): number {
  return trades.reduce((sum, trade) => sum + trade.pnl, 0);
}

/**
 * Current balance is derived, never stored: starting balance plus everything
 * the trader has realised since.
 */
export function calculateCurrentBalance(trades: Trade[], account: Account): number {
  return account.startingBalance + calculateTotalPnl(trades);
}

export interface TradeStats {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  /** Trades that closed at exactly 0 — neither a win nor a loss. */
  breakevenTrades: number;
  /** Wins as a percentage of decisive (non-breakeven) trades. 0 when none. */
  winRate: number;
  /** null when there are no winning trades. */
  largestWin: number | null;
  /** null when there are no losing trades. Stored as a negative number. */
  largestLoss: number | null;
  /** null when there are no winning trades. */
  averageWin: number | null;
  /** null when there are no losing trades. Stored as a negative number. */
  averageLoss: number | null;
}

/**
 * Win/loss breakdown.
 *
 * Breakeven trades (pnl === 0) are counted separately rather than being folded
 * into losses, and are excluded from the win-rate denominator — a flat trade
 * shouldn't drag down a win rate.
 */
export function calculateTradeStats(trades: Trade[]): TradeStats {
  const wins = trades.filter((t) => t.pnl > 0);
  const losses = trades.filter((t) => t.pnl < 0);
  const breakeven = trades.filter((t) => t.pnl === 0);

  const decisiveCount = wins.length + losses.length;

  return {
    totalTrades: trades.length,
    winningTrades: wins.length,
    losingTrades: losses.length,
    breakevenTrades: breakeven.length,
    // Guard the divide: an account with no decisive trades has no win rate.
    winRate: decisiveCount === 0 ? 0 : (wins.length / decisiveCount) * 100,
    // Math.max/min on an empty array returns -Infinity/Infinity, so guard first.
    largestWin: wins.length === 0 ? null : Math.max(...wins.map((t) => t.pnl)),
    largestLoss: losses.length === 0 ? null : Math.min(...losses.map((t) => t.pnl)),
    averageWin:
      wins.length === 0 ? null : calculateTotalPnl(wins) / wins.length,
    averageLoss:
      losses.length === 0 ? null : calculateTotalPnl(losses) / losses.length,
  };
}

export interface EquityPoint {
  /** 0 = the starting balance, before any trade. */
  tradeNumber: number;
  equity: number;
  /** Running high-water mark at this point. */
  peak: number;
  label: string;
}

/**
 * Walks the trades in chronological order, building the equity curve and the
 * running high-water mark. This is the basis for peak-to-trough drawdown.
 */
export function buildEquityCurve(trades: Trade[], account: Account): EquityPoint[] {
  const ordered = sortTradesChronologically(trades);

  let equity = account.startingBalance;
  let peak = account.startingBalance;

  const points: EquityPoint[] = [
    { tradeNumber: 0, equity, peak, label: 'Start' },
  ];

  ordered.forEach((trade, index) => {
    equity += trade.pnl;
    peak = Math.max(peak, equity);
    points.push({
      tradeNumber: index + 1,
      equity,
      peak,
      label: `${trade.asset} ${trade.direction}`,
    });
  });

  return points;
}

/** Chronological order, with the original array order breaking same-day ties. */
export function sortTradesChronologically(trades: Trade[]): Trade[] {
  return trades
    .map((trade, index) => ({ trade, index }))
    .sort((a, b) => {
      if (a.trade.date === b.trade.date) return a.index - b.index;
      return a.trade.date < b.trade.date ? -1 : 1;
    })
    .map(({ trade }) => trade);
}

export interface DrawdownResult {
  /** Highest equity ever reached. */
  peakEquity: number;
  currentEquity: number;
  /** How far below the peak we are now. Never negative. */
  currentDrawdown: number;
  /** Buffer left before the max drawdown is breached. Never negative. */
  remainingDrawdown: number;
  /** Worst peak-to-trough decline seen at any point in the history. */
  maxDrawdownReached: number;
  /** Share of the allowance consumed, 0–100 (clamped). */
  utilisation: number;
}

/**
 * Peak-to-trough drawdown: how far equity has fallen from its high-water mark.
 *
 * This is the standard trailing-drawdown model used by prop firms. It is not
 * `startingBalance - currentBalance`, which would report a negative drawdown for
 * any profitable account and would miss a giveback from a high.
 */
export function calculateDrawdown(trades: Trade[], account: Account): DrawdownResult {
  const curve = buildEquityCurve(trades, account);
  const last = curve[curve.length - 1];

  const currentDrawdown = Math.max(0, last.peak - last.equity);

  // Worst decline at any single point in the history, not just right now.
  const maxDrawdownReached = curve.reduce(
    (worst, point) => Math.max(worst, point.peak - point.equity),
    0,
  );

  return {
    peakEquity: last.peak,
    currentEquity: last.equity,
    currentDrawdown,
    // Clamp: a breached account has zero buffer left, not a negative one.
    remainingDrawdown: Math.max(0, account.maxDrawdown - currentDrawdown),
    maxDrawdownReached,
    utilisation: safeUtilisation(currentDrawdown, account.maxDrawdown),
  };
}

export interface DayResult {
  date: string;
  pnl: number;
  tradeCount: number;
}

/** Per-day P&L totals, chronologically ordered. */
export function calculateDailyPnl(trades: Trade[]): DayResult[] {
  const byDate = new Map<string, DayResult>();

  for (const trade of trades) {
    const existing = byDate.get(trade.date);
    if (existing) {
      existing.pnl += trade.pnl;
      existing.tradeCount += 1;
    } else {
      byDate.set(trade.date, { date: trade.date, pnl: trade.pnl, tradeCount: 1 });
    }
  }

  return [...byDate.values()].sort((a, b) => (a.date < b.date ? -1 : 1));
}

export interface DailyLossResult {
  date: string | null;
  /** Today's net P&L. Can be positive. */
  dayPnl: number;
  /** Today's loss as a positive number. 0 if the day is flat or green. */
  currentDayLoss: number;
  /** Buffer left before the daily limit is breached. Never negative. */
  remainingDailyLoss: number;
  utilisation: number;
}

/**
 * Loss on the most recent trading day.
 *
 * "Today" is taken as the latest date present in the data rather than the wall
 * clock, so the dashboard stays meaningful with static mock data.
 */
export function calculateDailyLoss(trades: Trade[], account: Account): DailyLossResult {
  const days = calculateDailyPnl(trades);

  if (days.length === 0) {
    return {
      date: null,
      dayPnl: 0,
      currentDayLoss: 0,
      remainingDailyLoss: account.dailyLossLimit,
      utilisation: 0,
    };
  }

  const today = days[days.length - 1];
  // A profitable day consumes none of the loss limit.
  const currentDayLoss = today.pnl < 0 ? Math.abs(today.pnl) : 0;

  return {
    date: today.date,
    dayPnl: today.pnl,
    currentDayLoss,
    remainingDailyLoss: Math.max(0, account.dailyLossLimit - currentDayLoss),
    utilisation: safeUtilisation(currentDayLoss, account.dailyLossLimit),
  };
}

/** Aggregated performance for one asset. */
export interface AssetPerformance {
  asset: string;
  pnl: number;
  tradeCount: number;
  winningTrades: number;
  winRate: number;
}

export function calculatePerformanceByAsset(trades: Trade[]): AssetPerformance[] {
  const byAsset = new Map<string, Trade[]>();

  for (const trade of trades) {
    const existing = byAsset.get(trade.asset);
    if (existing) existing.push(trade);
    else byAsset.set(trade.asset, [trade]);
  }

  return [...byAsset.entries()]
    .map(([asset, assetTrades]) => {
      const stats = calculateTradeStats(assetTrades);
      return {
        asset,
        pnl: calculateTotalPnl(assetTrades),
        tradeCount: assetTrades.length,
        winningTrades: stats.winningTrades,
        winRate: stats.winRate,
      };
    })
    .sort((a, b) => b.pnl - a.pnl);
}

/**
 * Percentage of an allowance consumed, clamped to 0–100 and guarded against a
 * zero or missing limit (which would otherwise produce NaN or Infinity).
 */
export function safeUtilisation(used: number, limit: number): number {
  if (!Number.isFinite(limit) || limit <= 0) return used > 0 ? 100 : 0;
  return Math.min(100, Math.max(0, (used / limit) * 100));
}
