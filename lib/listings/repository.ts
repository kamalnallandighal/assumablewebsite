import { getSupabaseAnonClient } from '../supabase/client';
import { listings as fixtureListings, findListing as fixtureFindListing } from './data';
import { MARKET_RATE_PERCENT, monthlyPayment, yearsUntil } from './finance';
import type { Listing, LoanType } from './types';

/**
 * Source of truth for listing data at runtime.
 *
 * Strategy:
 *   - If Supabase env vars are set → query the `public_listings` view (anon RLS).
 *   - Otherwise → return the JSON fixture (current dev path, tests).
 *
 * Both branches return the same `Listing` shape so consumers don't care.
 */

// Row shape returned by the public_listings view. Narrow — only what we map.
interface PublicListingRow {
  id: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  lat: number;
  lng: number;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  photos: string[] | null;
  loan_type: 'VA' | 'FHA' | 'USDA' | 'CNV' | 'PP' | 'SBA' | 'EMP' | null;
  interest_rate: number | null; // percent format, e.g. 2.875
  unpaid_balance: number | null;
  maturity_date: string | null; // ISO date
  verified_monthly_payment: number | null;
  is_assumable: boolean;
}

function mapLoanType(t: PublicListingRow['loan_type']): LoanType | null {
  if (t === 'VA' || t === 'FHA') return t;
  if (t === 'USDA') return 'FHA'; // bucket USDA with FHA-style for badge purposes
  if (t === 'CNV') return 'Conventional';
  return null;
}

function mapRow(row: PublicListingRow): Listing {
  const ratePercent = row.interest_rate ?? 0;
  const rateDecimal = ratePercent / 100;
  const marketRateDecimal = MARKET_RATE_PERCENT / 100;

  // Remaining term: if we have a maturity_date use it, else assume 25 years
  // left (typical mid-life of a 30-yr loan).
  const remainingYears = yearsUntil(row.maturity_date) ?? 25;
  const upb = row.unpaid_balance ?? 0;

  const assumedMonthly =
    row.verified_monthly_payment ??
    (upb > 0 && ratePercent > 0
      ? monthlyPayment(upb, ratePercent, remainingYears)
      : 0);

  // For comparison: what would a new buyer pay at today's rate, 30-yr, 10% down?
  const marketLoanAmount = Math.round(row.price * 0.9);
  const marketMonthly = monthlyPayment(marketLoanAmount, MARKET_RATE_PERCENT, 30);

  // Down payment for an assumable = the seller's equity (price − UPB).
  // Floor at zero in case of a UPB > price edge case.
  const downPayment = Math.max(0, row.price - upb);

  // Reconstruct a single address string for the existing Listing shape, which
  // concatenates city/state/zip into one field.
  const address = `${row.street_address}, ${row.city}, ${row.state} ${row.zip_code}`;

  return {
    id: row.id,
    address,
    price: row.price,
    beds: row.beds,
    baths: row.baths,
    sqft: row.sqft,
    lat: row.lat,
    lng: row.lng,
    isAssumable: row.is_assumable,
    photo: row.photos?.[0] ?? null,
    rate: rateDecimal,
    marketRate: marketRateDecimal,
    assumedMonthly,
    marketMonthly,
    downPayment,
    loanType: mapLoanType(row.loan_type)
  };
}

/**
 * Fetch all listings the site should display.
 * Already filtered to assumable + on-market by the public_listings view's
 * WHERE clauses. We additionally filter `is_assumable = true` here for safety
 * (the view computes it; we trust but verify).
 */
export async function fetchAllListings(): Promise<readonly Listing[]> {
  const supabase = getSupabaseAnonClient();
  if (!supabase) {
    return fixtureListings;
  }

  const { data, error } = await supabase
    .from('public_listings')
    .select(
      'id, street_address, city, state, zip_code, lat, lng, price, beds, baths, sqft, ' +
        'photos, loan_type, interest_rate, unpaid_balance, maturity_date, ' +
        'verified_monthly_payment, is_assumable'
    )
    .eq('is_assumable', true);

  if (error) {
    console.error('[repository] Supabase query failed, falling back to fixture:', error);
    return fixtureListings;
  }

  return ((data ?? []) as unknown as PublicListingRow[]).map(mapRow);
}

/** Single listing by id. Used by the detail route. */
export async function findListingById(id: string): Promise<Listing | null> {
  const supabase = getSupabaseAnonClient();
  if (!supabase) {
    return fixtureFindListing(id) ?? null;
  }

  const { data, error } = await supabase
    .from('public_listings')
    .select(
      'id, street_address, city, state, zip_code, lat, lng, price, beds, baths, sqft, ' +
        'photos, loan_type, interest_rate, unpaid_balance, maturity_date, ' +
        'verified_monthly_payment, is_assumable'
    )
    .eq('id', id)
    .maybeSingle();

  if (error) {
    console.error('[repository] Supabase findById failed, falling back to fixture:', error);
    return fixtureFindListing(id) ?? null;
  }
  if (!data) return null;
  return mapRow(data as unknown as PublicListingRow);
}
