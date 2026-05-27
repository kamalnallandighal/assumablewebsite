export type LoanType = 'VA' | 'FHA' | 'Conventional';

// Shape of listings.json on disk — rates as "2.99%", money as "$1,621",
// loanType nullable for non-assumable listings. Used only by data.ts.
export interface RawListing {
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
  rate: string;
  marketRate: string;
  assumedMonthly: string;
  marketMonthly: string;
  downPayment: string;
  loanType: LoanType | null;
}

// Normalized shape used throughout the app: rates as decimals (0.0299),
// money as numbers (1621), loanType non-null after the assumable filter.
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
  rate: number;
  marketRate: number;
  assumedMonthly: number;
  marketMonthly: number;
  downPayment: number;
  loanType: LoanType | null;
}
