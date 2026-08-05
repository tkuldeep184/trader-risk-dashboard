import type { Tone } from '../lib/tone';

interface StatCardProps {
  label: string;
  value: string;
  /** Optional supporting line, e.g. what the figure is measured against. */
  hint?: string;
  tone?: Tone;
}

/**
 * The dashboard's basic unit: one labelled figure.
 * Used for account details, performance stats and risk numbers alike.
 */
export function StatCard({ label, value, hint, tone = 'neutral' }: StatCardProps) {
  return (
    <div className="stat-card">
      <span className="stat-card__label">{label}</span>
      <span className={`stat-card__value stat-card__value--${tone}`}>{value}</span>
      {hint && <span className="stat-card__hint">{hint}</span>}
    </div>
  );
}
