import type { Listing, LoanType } from './types';

export interface FilterState {
  city: string | null;          // null = all
  loanTypes: LoanType[];        // empty = all
  priceMin: number;
  priceMax: number;
  bedsMin: number;
  bathsMin: number;
  assumableOnly: boolean;       // default true (see CLAUDE.md)
}

export const defaultFilterState: FilterState = {
  city: null,
  loanTypes: [],
  priceMin: 0,
  priceMax: Number.POSITIVE_INFINITY,
  bedsMin: 0,
  bathsMin: 0,
  assumableOnly: true
};

export function applyFilters(listings: readonly Listing[], f: FilterState): Listing[] {
  return listings.filter(l => {
    if (f.assumableOnly && !l.isAssumable) return false;
    if (f.loanTypes.length > 0 && (!l.loanType || !f.loanTypes.includes(l.loanType))) return false;
    if (l.price < f.priceMin || l.price > f.priceMax) return false;
    if (l.beds < f.bedsMin) return false;
    if (l.baths < f.bathsMin) return false;
    if (f.city && !l.address.toLowerCase().includes(f.city.toLowerCase())) return false;
    return true;
  });
}
