export const formatMoney = (n: number): string => `$${n.toLocaleString('en-US')}`;

export const formatRate = (r: number): string =>
  `${(r * 100).toFixed(3).replace(/\.?0+$/, '')}%`;
