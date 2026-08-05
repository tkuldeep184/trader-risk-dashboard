import type { Account } from '../data/types';
import { formatCurrency, formatDate, formatSignedCurrency } from '../lib/format';
import { RISK_LABELS, type RiskAssessment } from '../lib/risk';
import { RiskMeter } from './RiskMeter';

interface RiskIndicatorProps {
  assessment: RiskAssessment;
  account: Account;
}

/**
 * The most important panel on the page: a single verdict the trader can read at
 * a glance, backed by the two rules that produced it.
 */
export function RiskIndicator({ assessment, account }: RiskIndicatorProps) {
  const { drawdown, dailyLoss, overallLevel, message } = assessment;

  return (
    <section className="panel" aria-labelledby="risk-heading">
      <div className={`verdict verdict--${overallLevel}`} role="status">
        <div className="verdict__main">
          <span className="verdict__eyebrow">Account risk status</span>
          <h2 className="verdict__label" id="risk-heading">
            {RISK_LABELS[overallLevel]}
          </h2>
        </div>
        <p className="verdict__message">{message}</p>
      </div>

      <div className="meter-grid">
        <RiskMeter
          title="Maximum drawdown"
          used={drawdown.currentDrawdown}
          limit={account.maxDrawdown}
          remaining={drawdown.remainingDrawdown}
          utilisation={drawdown.utilisation}
          level={assessment.drawdownLevel}
          usedLabel="Current drawdown"
          remainingLabel="Remaining"
        />
        <RiskMeter
          title="Daily loss limit"
          used={dailyLoss.currentDayLoss}
          limit={account.dailyLossLimit}
          remaining={dailyLoss.remainingDailyLoss}
          utilisation={dailyLoss.utilisation}
          level={assessment.dailyLossLevel}
          usedLabel="Today's loss"
          remainingLabel="Remaining"
        />
      </div>

      <p className="panel__note">
        Drawdown is measured from your peak equity of{' '}
        <strong>{formatCurrency(drawdown.peakEquity)}</strong>.
        {dailyLoss.date && (
          <>
            {' '}
            Latest session <strong>{formatDate(dailyLoss.date)}</strong> closed at{' '}
            <strong>{formatSignedCurrency(dailyLoss.dayPnl)}</strong>.
          </>
        )}
      </p>
    </section>
  );
}
