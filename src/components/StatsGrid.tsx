import type { Account } from '../data/types';
import type { TradeStats } from '../lib/calculations';
import {
  formatCurrency,
  formatOrDash,
  formatPercent,
  formatSignedCurrency,
  formatSignedPercent,
} from '../lib/format';
import { toneFromValue } from '../lib/tone';
import { StatCard } from './StatCard';

interface StatsGridProps {
  account: Account;
  currentBalance: number;
  totalPnl: number;
  stats: TradeStats;
}

/** Account figures and trading performance, every value derived from the trades. */
export function StatsGrid({ account, currentBalance, totalPnl, stats }: StatsGridProps) {
  const returnPct =
    account.startingBalance > 0 ? (totalPnl / account.startingBalance) * 100 : 0;

  return (
    <div className="stat-grid">
      <StatCard
        label="Starting balance"
        value={formatCurrency(account.startingBalance)}
        hint="Account opening equity"
      />
      <StatCard
        label="Current balance"
        value={formatCurrency(currentBalance)}
        hint="Starting balance + total P&L"
        tone={toneFromValue(totalPnl)}
      />
      <StatCard
        label="Total P&L"
        value={formatSignedCurrency(totalPnl)}
        hint={`${formatSignedPercent(returnPct)} on starting balance`}
        tone={toneFromValue(totalPnl)}
      />
      <StatCard
        label="Win rate"
        value={formatPercent(stats.winRate)}
        hint={`${stats.winningTrades}W / ${stats.losingTrades}L${
          stats.breakevenTrades > 0 ? ` / ${stats.breakevenTrades}BE` : ''
        }`}
      />
      <StatCard
        label="Winning trades"
        value={String(stats.winningTrades)}
        hint={`of ${stats.totalTrades} total`}
        tone={stats.winningTrades > 0 ? 'positive' : 'neutral'}
      />
      <StatCard
        label="Losing trades"
        value={String(stats.losingTrades)}
        hint={`of ${stats.totalTrades} total`}
        tone={stats.losingTrades > 0 ? 'negative' : 'neutral'}
      />
      <StatCard
        label="Largest win"
        value={formatOrDash(stats.largestWin, formatSignedCurrency)}
        hint="Best single trade"
        tone={stats.largestWin ? 'positive' : 'neutral'}
      />
      <StatCard
        label="Largest loss"
        value={formatOrDash(stats.largestLoss, formatSignedCurrency)}
        hint="Worst single trade"
        tone={stats.largestLoss ? 'negative' : 'neutral'}
      />
    </div>
  );
}
