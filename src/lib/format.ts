const currency = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
});

/** "$103,250" — whole dollars, which is the granularity the brief uses. */
export function formatCurrency(value: number): string {
  return currency.format(value);
}

/** "+$3,250" / "-$450" — explicit sign, for P&L figures where direction matters. */
export function formatSignedCurrency(value: number): string {
  const formatted = currency.format(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

/** "60%" — one decimal only when the value isn't whole. */
export function formatPercent(value: number): string {
  const rounded = Math.round(value * 10) / 10;
  return `${Number.isInteger(rounded) ? rounded : rounded.toFixed(1)}%`;
}

/** "+3.3%" / "-5.8%" — explicit sign, for return figures. */
export function formatSignedPercent(value: number): string {
  const formatted = formatPercent(Math.abs(value));
  if (value > 0) return `+${formatted}`;
  if (value < 0) return `-${formatted}`;
  return formatted;
}

/** Falls back to an em dash for values that don't exist (e.g. no losing trades). */
export function formatOrDash(
  value: number | null,
  formatter: (n: number) => string,
): string {
  return value === null ? '—' : formatter(value);
}

/** "Wed 5 Aug" — compact and unambiguous. */
export function formatDate(iso: string): string {
  const date = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}
