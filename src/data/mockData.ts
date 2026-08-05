import type { Account, Scenario, Trade } from './types';

/**
 * Account rules exactly as supplied in the brief.
 *
 * Note: `currentBalance` is deliberately NOT stored here. The brief quotes it as
 * $103,250, but that figure is derivable — it is startingBalance + total P&L.
 * Storing it would mean hardcoding a calculated value, so we derive it instead.
 * See `calculateCurrentBalance` in lib/calculations.ts.
 */
export const ACCOUNT: Account = {
  startingBalance: 100_000,
  maxDrawdown: 10_000,
  dailyLossLimit: 5_000,
};

/**
 * The five trades supplied in the brief.
 *
 * Assumption: the brief lists no dates, but "current day's loss" is meaningless
 * without them. We spread the trades across three sessions in close order,
 * which lets us compute per-day figures and a daily breakdown honestly.
 */
export const SUPPLIED_TRADES: Trade[] = [
  { id: 't1', asset: 'BTC', direction: 'Long', pnl: 1_200, date: '2026-08-03' },
  { id: 't2', asset: 'ETH', direction: 'Short', pnl: -450, date: '2026-08-03' },
  { id: 't3', asset: 'BTC', direction: 'Short', pnl: 800, date: '2026-08-04' },
  { id: 't4', asset: 'SOL', direction: 'Long', pnl: -300, date: '2026-08-04' },
  { id: 't5', asset: 'ETH', direction: 'Long', pnl: 2_000, date: '2026-08-05' },
];

/**
 * The supplied data sits at zero drawdown, so the risk indicator would only ever
 * render "Safe". These extra scenarios exercise the other states so the logic is
 * visibly working rather than trivially green.
 */
export const SCENARIOS: Scenario[] = [
  {
    id: 'supplied',
    label: 'Supplied data',
    description: 'The five trades from the brief. Account is at an equity high.',
    trades: SUPPLIED_TRADES,
  },
  {
    id: 'approaching',
    label: 'Approaching limit',
    description: 'A strong run followed by a giveback that eats most of the buffer.',
    trades: [
      { id: 'a1', asset: 'BTC', direction: 'Long', pnl: 4_200, date: '2026-08-03' },
      { id: 'a2', asset: 'ETH', direction: 'Long', pnl: 1_800, date: '2026-08-03' },
      { id: 'a3', asset: 'SOL', direction: 'Short', pnl: -2_600, date: '2026-08-04' },
      { id: 'a4', asset: 'BTC', direction: 'Short', pnl: -1_900, date: '2026-08-05' },
      { id: 'a5', asset: 'ETH', direction: 'Short', pnl: -1_800, date: '2026-08-05' },
    ],
  },
  {
    id: 'at-risk',
    label: 'At risk',
    description: 'Deep drawdown from the peak and a heavy loss today.',
    trades: [
      { id: 'r1', asset: 'BTC', direction: 'Long', pnl: 3_000, date: '2026-08-03' },
      { id: 'r2', asset: 'ETH', direction: 'Short', pnl: -2_400, date: '2026-08-04' },
      { id: 'r3', asset: 'SOL', direction: 'Long', pnl: -1_900, date: '2026-08-04' },
      { id: 'r4', asset: 'BTC', direction: 'Short', pnl: -3_100, date: '2026-08-05' },
      { id: 'r5', asset: 'ETH', direction: 'Long', pnl: -1_400, date: '2026-08-05' },
    ],
  },
  {
    id: 'empty',
    label: 'No trades yet',
    description: 'A funded account before the first trade — an edge case worth handling.',
    trades: [],
  },
];
