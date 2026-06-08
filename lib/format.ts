export const formatMoney = (n: number): string => `$${n.toLocaleString('en-US')}`;

// Zillow-style compact money: $123K, $1.2M. Used on map markers where space
// is tight and you don't need the trailing thousands.
export const formatMoneyCompact = (n: number): string => {
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    // $1M, $1.2M, $1.25M — strip trailing zeros after the decimal
    const formatted = m.toFixed(2).replace(/\.?0+$/, '');
    return `$${formatted}M`;
  }
  if (n >= 1000) {
    return `$${Math.round(n / 1000)}K`;
  }
  return `$${n}`;
};

export const formatRate = (r: number): string =>
  `${(r * 100).toFixed(3).replace(/\.?0+$/, '')}%`;
