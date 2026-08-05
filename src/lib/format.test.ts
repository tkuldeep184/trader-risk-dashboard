import { describe, expect, it } from 'vitest';
import {
  formatCurrency,
  formatOrDash,
  formatPercent,
  formatSignedCurrency,
  formatSignedPercent,
} from './format';

describe('formatCurrency', () => {
  it('formats whole dollars with separators', () => {
    expect(formatCurrency(103_250)).toBe('$103,250');
    expect(formatCurrency(0)).toBe('$0');
  });
});

describe('formatSignedCurrency', () => {
  it('marks gains, losses and breakeven distinctly', () => {
    expect(formatSignedCurrency(3_250)).toBe('+$3,250');
    expect(formatSignedCurrency(-450)).toBe('-$450');
    expect(formatSignedCurrency(0)).toBe('$0');
  });
});

describe('formatPercent', () => {
  it('drops the decimal for whole numbers', () => {
    expect(formatPercent(60)).toBe('60%');
  });

  it('keeps one decimal otherwise', () => {
    expect(formatPercent(66.666)).toBe('66.7%');
  });
});

describe('formatSignedPercent', () => {
  it('keeps the sign of a negative return', () => {
    // Regression: a loss previously rendered without its minus sign.
    expect(formatSignedPercent(-5.8)).toBe('-5.8%');
    expect(formatSignedPercent(3.25)).toBe('+3.3%');
    expect(formatSignedPercent(0)).toBe('0%');
  });
});

describe('formatOrDash', () => {
  it('renders an em dash for missing values', () => {
    expect(formatOrDash(null, formatCurrency)).toBe('—');
    expect(formatOrDash(500, formatCurrency)).toBe('$500');
  });
});
