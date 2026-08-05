import type { Account } from '../data/types';
import type { DayResult } from '../lib/calculations';
import { formatDate, formatPercent, formatSignedCurrency } from '../lib/format';
import { levelFromUtilisation, RISK_LABELS } from '../lib/risk';
import { safeUtilisation } from '../lib/calculations';

interface DailyBreakdownProps {
  days: DayResult[];
  account: Account;
}

/**
 * Per-session P&L, with each losing day scored against the daily loss limit —
 * so a trader can see whether a bad day was genuinely close to a breach.
 */
export function DailyBreakdown({ days, account }: DailyBreakdownProps) {
  if (days.length === 0) {
    return <p className="empty-note">No sessions to summarise yet.</p>;
  }

  return (
    <ul className="day-list">
      {days.map((day) => {
        const loss = day.pnl < 0 ? Math.abs(day.pnl) : 0;
        const utilisation = safeUtilisation(loss, account.dailyLossLimit);
        const level = levelFromUtilisation(utilisation);

        return (
          <li key={day.date} className="day-row">
            <div className="day-row__head">
              <span className="day-row__date">{formatDate(day.date)}</span>
              <span
                className={`day-row__pnl ${
                  day.pnl > 0 ? 'text-positive' : day.pnl < 0 ? 'text-negative' : 'text-muted'
                }`}
              >
                {formatSignedCurrency(day.pnl)}
              </span>
            </div>
            <div className="day-row__meta">
              <span className="text-muted">
                {day.tradeCount} {day.tradeCount === 1 ? 'trade' : 'trades'}
              </span>
              {loss > 0 ? (
                <span className={`badge badge--${level} badge--sm`}>
                  {formatPercent(utilisation)} of daily limit · {RISK_LABELS[level]}
                </span>
              ) : (
                <span className="text-muted">No daily limit used</span>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
