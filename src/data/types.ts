/** A single closed trade. `pnl` is the realised profit/loss in account currency. */
export interface Trade {
  id: string;
  asset: string;
  direction: 'Long' | 'Short';
  /** Realised P&L. Positive = win, negative = loss, exactly 0 = breakeven. */
  pnl: number;
  /** ISO date (YYYY-MM-DD) the trade was closed on. */
  date: string;
}

/** The rules the trader's account is evaluated against. */
export interface Account {
  startingBalance: number;
  /** Max peak-to-trough equity decline allowed before the account is breached. */
  maxDrawdown: number;
  /** Max loss allowed within a single trading day. */
  dailyLossLimit: number;
}

/** A named set of trades, used to demo the risk indicator across scenarios. */
export interface Scenario {
  id: string;
  label: string;
  description: string;
  trades: Trade[];
}
