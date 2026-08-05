import { formatCurrency, formatPercent } from '../lib/format';
import { RISK_LABELS, type RiskLevel } from '../lib/risk';

interface RiskMeterProps {
  title: string;
  /** Amount of the allowance consumed. */
  used: number;
  /** The total allowance. */
  limit: number;
  /** Amount still available. */
  remaining: number;
  utilisation: number;
  level: RiskLevel;
  usedLabel: string;
  remainingLabel: string;
}

/**
 * One account rule as a bar: how much of the allowance is gone, how much is
 * left, and what that means. Reused for both drawdown and the daily loss limit.
 */
export function RiskMeter({
  title,
  used,
  limit,
  remaining,
  utilisation,
  level,
  usedLabel,
  remainingLabel,
}: RiskMeterProps) {
  return (
    <div className={`meter meter--${level}`}>
      <div className="meter__head">
        <h3 className="meter__title">{title}</h3>
        <span className={`badge badge--${level}`}>{RISK_LABELS[level]}</span>
      </div>

      <div
        className="meter__track"
        role="progressbar"
        aria-label={`${title}: ${formatPercent(utilisation)} of the limit used`}
        aria-valuenow={Math.round(utilisation)}
        aria-valuemin={0}
        aria-valuemax={100}
      >
        <div className="meter__fill" style={{ width: `${utilisation}%` }} />
      </div>

      <div className="meter__figures">
        <div>
          <span className="meter__figure-label">{usedLabel}</span>
          <span className="meter__figure-value">{formatCurrency(used)}</span>
        </div>
        <div className="meter__figure--end">
          <span className="meter__figure-label">{remainingLabel}</span>
          <span className="meter__figure-value">{formatCurrency(remaining)}</span>
        </div>
      </div>

      <p className="meter__foot">
        {formatPercent(utilisation)} of your {formatCurrency(limit)} limit used
      </p>
    </div>
  );
}
