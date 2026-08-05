import type { Trade } from '../data/types';
import { formatDate, formatSignedCurrency } from '../lib/format';

interface TradeTableProps {
  trades: Trade[];
}

/** The raw trade history the figures are derived from. */
export function TradeTable({ trades }: TradeTableProps) {
  if (trades.length === 0) {
    return <p className="empty-note">No trades recorded on this account yet.</p>;
  }

  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th scope="col">Trade</th>
            <th scope="col">Date</th>
            <th scope="col" className="table__num">
              P&amp;L
            </th>
          </tr>
        </thead>
        <tbody>
          {trades.map((trade) => (
            <tr key={trade.id}>
              <td>
                <span className="table__asset">{trade.asset}</span>{' '}
                <span className="table__dir">{trade.direction}</span>
              </td>
              <td className="table__muted">{formatDate(trade.date)}</td>
              <td
                className={`table__num ${
                  trade.pnl > 0
                    ? 'text-positive'
                    : trade.pnl < 0
                      ? 'text-negative'
                      : 'text-muted'
                }`}
              >
                {formatSignedCurrency(trade.pnl)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
