import type { Account, Trade } from '../data/types';
import {
  calculateDailyLoss,
  calculateDrawdown,
  calculateTradeStats,
  type DailyLossResult,
  type DrawdownResult,
} from './calculations';

export type RiskLevel = 'safe' | 'approaching' | 'at-risk' | 'breached';

/**
 * Thresholds are expressed as the share of an allowance consumed.
 *
 * The brief asks for Safe / Approaching Limit / At Risk but doesn't define the
 * cut-offs, so these are our choice: comfortable below half, warning from half,
 * urgent past 80%. A fully consumed allowance is called out as breached.
 */
export const RISK_THRESHOLDS = {
  approaching: 50,
  atRisk: 80,
} as const;

export const RISK_LABELS: Record<RiskLevel, string> = {
  safe: 'Safe',
  approaching: 'Approaching Limit',
  'at-risk': 'At Risk',
  breached: 'Limit Breached',
};

/** Maps a utilisation percentage to a risk level. */
export function levelFromUtilisation(utilisation: number): RiskLevel {
  if (utilisation >= 100) return 'breached';
  if (utilisation >= RISK_THRESHOLDS.atRisk) return 'at-risk';
  if (utilisation >= RISK_THRESHOLDS.approaching) return 'approaching';
  return 'safe';
}

const SEVERITY: Record<RiskLevel, number> = {
  safe: 0,
  approaching: 1,
  'at-risk': 2,
  breached: 3,
};

/** The more severe of two levels — used to roll rules up into one verdict. */
export function worstLevel(a: RiskLevel, b: RiskLevel): RiskLevel {
  return SEVERITY[a] >= SEVERITY[b] ? a : b;
}

export interface RiskAssessment {
  drawdown: DrawdownResult;
  dailyLoss: DailyLossResult;
  drawdownLevel: RiskLevel;
  dailyLossLevel: RiskLevel;
  /** Worst of the individual rule levels — the headline verdict. */
  overallLevel: RiskLevel;
  /** Plain-language explanation of the verdict. */
  message: string;
}

/**
 * Rolls both account rules up into a single answer to the trader's real
 * question: "am I in danger of violating my account rules?"
 */
export function assessRisk(trades: Trade[], account: Account): RiskAssessment {
  const drawdown = calculateDrawdown(trades, account);
  const dailyLoss = calculateDailyLoss(trades, account);

  const drawdownLevel = levelFromUtilisation(drawdown.utilisation);
  const dailyLossLevel = levelFromUtilisation(dailyLoss.utilisation);
  const overallLevel = worstLevel(drawdownLevel, dailyLossLevel);

  return {
    drawdown,
    dailyLoss,
    drawdownLevel,
    dailyLossLevel,
    overallLevel,
    message: buildMessage(overallLevel, drawdownLevel, dailyLossLevel),
  };
}

function buildMessage(
  overall: RiskLevel,
  drawdownLevel: RiskLevel,
  dailyLossLevel: RiskLevel,
): string {
  if (overall === 'safe') {
    return 'Both account rules have comfortable headroom. Nothing to action.';
  }

  // Name whichever rule is actually driving the verdict.
  const drivers: string[] = [];
  if (SEVERITY[drawdownLevel] === SEVERITY[overall]) drivers.push('maximum drawdown');
  if (SEVERITY[dailyLossLevel] === SEVERITY[overall]) drivers.push('daily loss limit');
  const driverText = drivers.join(' and ');

  if (overall === 'breached') {
    return `Your ${driverText} has been breached. Stop trading and review the account terms.`;
  }
  if (overall === 'at-risk') {
    return `You are close to breaching your ${driverText}. Consider reducing size or stopping for the day.`;
  }
  return `You have used a meaningful share of your ${driverText}. Trade with caution.`;
}

export interface SizingGuidance {
  remainingDailyLoss: number;
  remainingDrawdown: number;
  /** The trader's average losing trade, as a positive number. null if none yet. */
  averageLoss: number | null;
  /** How many more average losses fit inside today's remaining limit. */
  lossesUntilDailyLimit: number | null;
  /** How many more average losses fit inside the remaining drawdown. */
  lossesUntilDrawdownLimit: number | null;
  /** The binding constraint — the smaller of the two counts. */
  bindingConstraint: 'daily' | 'drawdown' | null;
  /** Largest single loss that still leaves both rules intact. */
  maxSafeLoss: number;
  headline: string;
}

/**
 * Turns the remaining allowances into something actionable.
 *
 * Knowing you have $4,300 of daily buffer left is abstract. Knowing that is
 * roughly three more trades at your typical losing size is a decision you can
 * act on before the next entry.
 */
export function calculateSizingGuidance(
  trades: Trade[],
  account: Account,
): SizingGuidance {
  const { drawdown, dailyLoss } = assessRisk(trades, account);
  const stats = calculateTradeStats(trades);

  const averageLoss = stats.averageLoss === null ? null : Math.abs(stats.averageLoss);

  // The binding rule is whichever allowance runs out first.
  const maxSafeLoss = Math.min(dailyLoss.remainingDailyLoss, drawdown.remainingDrawdown);

  // Guard the divide: no losing trades yet, or a zero-sized average.
  const canDivide = averageLoss !== null && averageLoss > 0;
  const lossesUntilDailyLimit = canDivide
    ? Math.floor(dailyLoss.remainingDailyLoss / averageLoss)
    : null;
  const lossesUntilDrawdownLimit = canDivide
    ? Math.floor(drawdown.remainingDrawdown / averageLoss)
    : null;

  // Compare the remaining amounts, not the floored trade counts: two very
  // different buffers can both floor to 0 losses, and the smaller one is still
  // the rule that binds.
  let bindingConstraint: 'daily' | 'drawdown' | null = null;
  if (canDivide) {
    bindingConstraint =
      dailyLoss.remainingDailyLoss <= drawdown.remainingDrawdown ? 'daily' : 'drawdown';
  }

  return {
    remainingDailyLoss: dailyLoss.remainingDailyLoss,
    remainingDrawdown: drawdown.remainingDrawdown,
    averageLoss,
    lossesUntilDailyLimit,
    lossesUntilDrawdownLimit,
    bindingConstraint,
    maxSafeLoss,
    headline: buildSizingHeadline(
      averageLoss,
      lossesUntilDailyLimit,
      lossesUntilDrawdownLimit,
      bindingConstraint,
    ),
  };
}

function buildSizingHeadline(
  averageLoss: number | null,
  daily: number | null,
  drawdownCount: number | null,
  binding: 'daily' | 'drawdown' | null,
): string {
  if (averageLoss === null || daily === null || drawdownCount === null) {
    return 'Once you have a losing trade on record, we can estimate how many more your limits allow.';
  }

  const count = Math.min(daily, drawdownCount);
  const rule = binding === 'daily' ? "today's loss limit" : 'your maximum drawdown';

  if (count === 0) {
    return `Another average losing trade would breach ${rule}. Reduce size or stop here.`;
  }
  if (count === 1) {
    return `You have room for roughly 1 more average losing trade before hitting ${rule}.`;
  }
  return `You have room for roughly ${count} more average losing trades before hitting ${rule}.`;
}
