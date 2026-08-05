/** Visual emphasis for a figure: gains green, losses red, everything else plain. */
export type Tone = 'neutral' | 'positive' | 'negative';

/** Picks a tone from a number's sign, for P&L-style figures. */
export function toneFromValue(value: number | null): Tone {
  if (value === null || value === 0) return 'neutral';
  return value > 0 ? 'positive' : 'negative';
}
