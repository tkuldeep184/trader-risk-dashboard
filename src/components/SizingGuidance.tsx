import type { SizingGuidance as Guidance } from '../lib/risk';
import { formatCurrency, formatOrDash } from '../lib/format';
import { StatCard } from './StatCard';

interface SizingGuidanceProps {
  guidance: Guidance;
}

/**
 * The added feature.
 *
 * The risk panel above tells the trader where they stand. This one turns that
 * into a decision about the *next* trade: given how they actually size their
 * losers, how many more can they take before a rule breaks?
 */
export function SizingGuidance({ guidance }: SizingGuidanceProps) {
  const {
    averageLoss,
    lossesUntilDailyLimit,
    lossesUntilDrawdownLimit,
    bindingConstraint,
    maxSafeLoss,
    headline,
  } = guidance;

  const hasEstimate = averageLoss !== null;
  const remainingCount =
    lossesUntilDailyLimit !== null && lossesUntilDrawdownLimit !== null
      ? Math.min(lossesUntilDailyLimit, lossesUntilDrawdownLimit)
      : null;

  return (
    <section className="panel" aria-labelledby="sizing-heading">
      <header className="panel__head">
        <h2 className="panel__title" id="sizing-heading">
          Room to trade
        </h2>
        <span className="panel__tag">Added feature</span>
      </header>

      <p className="sizing__headline">{headline}</p>

      <div className="stat-grid">
        <StatCard
          label="Average losing trade"
          value={formatOrDash(averageLoss, formatCurrency)}
          hint="Your typical downside"
        />
        <StatCard
          label="Losses left today"
          value={lossesUntilDailyLimit === null ? '—' : String(lossesUntilDailyLimit)}
          hint={`Within ${formatCurrency(guidance.remainingDailyLoss)} daily buffer`}
        />
        <StatCard
          label="Losses left overall"
          value={
            lossesUntilDrawdownLimit === null ? '—' : String(lossesUntilDrawdownLimit)
          }
          hint={`Within ${formatCurrency(guidance.remainingDrawdown)} drawdown buffer`}
        />
        <StatCard
          label="Max safe single loss"
          value={formatCurrency(maxSafeLoss)}
          hint={
            bindingConstraint === null
              ? 'Smaller of your two buffers'
              : bindingConstraint === 'daily'
                ? 'Capped by the daily limit'
                : 'Capped by max drawdown'
          }
        />
      </div>

      {hasEstimate && remainingCount !== null && (
        <p className="panel__note">
          Based on your average loss of {formatCurrency(averageLoss)}. A larger position
          than usual reduces this count — size accordingly.
        </p>
      )}
    </section>
  );
}
