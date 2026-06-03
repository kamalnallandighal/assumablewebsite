'use client';
import { useQueryState, parseAsStringEnum } from 'nuqs';
import type { Listing } from '../../../lib/listings/types';

export const SORTS = ['recommended', 'rateAsc', 'savingsDesc', 'priceAsc', 'priceDesc'] as const;
export type Sort = (typeof SORTS)[number];

export const SORT_LABELS: Record<Sort, string> = {
  recommended: 'Recommended',
  rateAsc: 'Lowest rate',
  savingsDesc: 'Biggest savings',
  priceAsc: 'Price: low to high',
  priceDesc: 'Price: high to low'
};

export function applySort(items: readonly Listing[], sort: Sort): Listing[] {
  switch (sort) {
    case 'rateAsc':
      return [...items].sort((a, b) => a.rate - b.rate);
    case 'savingsDesc':
      return [...items].sort(
        (a, b) =>
          b.marketMonthly - b.assumedMonthly - (a.marketMonthly - a.assumedMonthly)
      );
    case 'priceAsc':
      return [...items].sort((a, b) => a.price - b.price);
    case 'priceDesc':
      return [...items].sort((a, b) => b.price - a.price);
    case 'recommended':
    default:
      return [...items];
  }
}

export function useSort() {
  const [sort, setSort] = useQueryState(
    'sort',
    parseAsStringEnum<Sort>([...SORTS]).withDefault('recommended')
  );
  return { sort, setSort };
}
