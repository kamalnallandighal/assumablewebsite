export type LoanType = 'VA' | 'FHA' | 'Conventional';

export interface Listing {
  id: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  lat: number;
  lng: number;
  isAssumable: boolean;
  photo: string | null;
  // NOTE: rate/marketRate are stored as percent strings (e.g. "2.99%") in
  // listings.json, not decimal numbers. Monthly + downPayment values are
  // pre-formatted currency strings (e.g. "$1,621"). loanType is null for
  // non-assumable listings. Types match the JSON fixture as-is; any
  // numeric coercion should happen at the call site.
  rate: string;
  marketRate: string;
  assumedMonthly: string;
  marketMonthly: string;
  downPayment: string;
  loanType: LoanType | null;
}
