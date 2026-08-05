import type { EquityPoint } from '../lib/calculations';
import { formatCurrency } from '../lib/format';

interface EquitySparklineProps {
  curve: EquityPoint[];
  startingBalance: number;
}

const WIDTH = 600;
const HEIGHT = 120;
const PADDING = 4;

/**
 * A small equity curve drawn as inline SVG — no chart library needed for a
 * line this simple. It gives the drawdown numbers visual context: you can see
 * the peak the drawdown is measured from.
 */
export function EquitySparkline({ curve, startingBalance }: EquitySparklineProps) {
  // A single point (no trades) has no line to draw.
  if (curve.length < 2) {
    return <p className="empty-note">Your equity curve will appear once you have traded.</p>;
  }

  const values = curve.map((p) => p.equity);
  const min = Math.min(...values, startingBalance);
  const max = Math.max(...values, startingBalance);
  // Guard a flat line, where max === min would divide by zero.
  const range = max - min || 1;

  const x = (i: number) => (i / (curve.length - 1)) * (WIDTH - PADDING * 2) + PADDING;
  const y = (v: number) => HEIGHT - PADDING - ((v - min) / range) * (HEIGHT - PADDING * 2);

  const line = curve.map((p, i) => `${i === 0 ? 'M' : 'L'} ${x(i)} ${y(p.equity)}`).join(' ');
  const area = `${line} L ${x(curve.length - 1)} ${HEIGHT} L ${x(0)} ${HEIGHT} Z`;

  const finishedUp = values[values.length - 1] >= startingBalance;
  const tone = finishedUp ? 'positive' : 'negative';
  const baselineY = y(startingBalance);

  return (
    <figure className="sparkline">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        preserveAspectRatio="none"
        className={`sparkline__svg sparkline__svg--${tone}`}
        role="img"
        aria-label={`Equity curve from ${formatCurrency(values[0])} to ${formatCurrency(
          values[values.length - 1],
        )}`}
      >
        {/* Starting balance reference line. */}
        <line
          x1={0}
          x2={WIDTH}
          y1={baselineY}
          y2={baselineY}
          className="sparkline__baseline"
        />
        <path d={area} className="sparkline__area" />
        <path d={line} className="sparkline__line" />
      </svg>
      <figcaption className="sparkline__caption">
        Equity from {formatCurrency(startingBalance)} (dashed) to{' '}
        {formatCurrency(values[values.length - 1])} across {curve.length - 1} trades
      </figcaption>
    </figure>
  );
}
