import type { Listing, LoanType } from './types';

// [west, south, east, north] in degrees. Matches Mapbox `LngLatBounds.toArray().flat()` order
// after [[w,s],[e,n]] flattening, and `mapboxgl.LngLatBoundsLike` array form.
export type Bbox = [number, number, number, number];

export function isInBbox(p: { lat: number; lng: number }, b: Bbox): boolean {
  const [w, s, e, n] = b;
  return p.lng >= w && p.lng <= e && p.lat >= s && p.lat <= n;
}

export interface FilterState {
  city: string | null;          // null = all
  loanTypes: LoanType[];        // empty = all
  priceMin: number;             // 0 = no min
  priceMax: number | null;      // null = no max
  bedsMin: number;
  bathsMin: number;
  sqftMin: number;              // 0 = no min
  sqftMax: number | null;       // null = no max
  rateMax: number | null;       // decimal, e.g. 0.05 = 5%; null = no cap
  savingsMin: number;           // dollars/month, 0 = no min
  downMax: number | null;       // dollars, null = no max
}

export const defaultFilterState: FilterState = {
  city: null,
  loanTypes: [],
  priceMin: 0,
  priceMax: null,
  bedsMin: 0,
  bathsMin: 0,
  sqftMin: 0,
  sqftMax: null,
  rateMax: null,
  savingsMin: 0,
  downMax: null
};

export function applyFilters(listings: readonly Listing[], f: FilterState): Listing[] {
  return listings.filter(l => {
    // Site is assumable-only by definition. Non-assumable rows in the fixture
    // are kept around for future "comparable" views but never surface here.
    if (!l.isAssumable) return false;
    if (f.loanTypes.length > 0 && (!l.loanType || !f.loanTypes.includes(l.loanType))) return false;
    if (l.price < f.priceMin) return false;
    if (f.priceMax !== null && l.price > f.priceMax) return false;
    if (l.beds < f.bedsMin) return false;
    if (l.baths < f.bathsMin) return false;
    if (l.sqft < f.sqftMin) return false;
    if (f.sqftMax !== null && l.sqft > f.sqftMax) return false;
    if (f.rateMax !== null && l.rate > f.rateMax) return false;
    if (f.savingsMin > 0 && (l.marketMonthly - l.assumedMonthly) < f.savingsMin) return false;
    if (f.downMax !== null && l.downPayment > f.downMax) return false;
    if (f.city && !l.address.toLowerCase().includes(f.city.toLowerCase())) return false;
    return true;
  });
}
