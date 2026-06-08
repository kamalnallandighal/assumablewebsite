#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Imports hand-curated listings into Supabase.
 *
 * For each entry the script does:
 *   1. Geocodes the address via Mapbox (→ lat, lng, zip).
 *   2. Cotality search          → clip.
 *   3. Cotality enriched-liens  → loan_type, interest_rate, UPB, badge, etc.
 *   4. Cotality property-detail → beds/baths/sqft/year/lot/last-sale-price
 *                                  (only if user didn't supply them).
 *   5. Insert into `listings` (source='manual').
 *   6. Insert into `assumable_flags` with the Cotality data.
 *
 * Skips with a reason when:
 *   - Cotality search returns no match.
 *   - Loan type isn't VA/FHA/USDA (not assumable for our product).
 *   - More than one open mortgage (HELOC — not a clean primary).
 *
 * Run with:
 *   npx tsx scripts/seed-manual-listings.ts
 *
 * Env required:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SECRET_KEY  (or legacy SUPABASE_SERVICE_ROLE_KEY)
 *   NEXT_PUBLIC_MAPBOX_TOKEN
 *   COTALITY_CLIENT_ID, COTALITY_CLIENT_SECRET
 */

import { config } from 'dotenv';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { z } from 'zod';
import { getSupabaseServiceClient } from '../lib/supabase/client';
import { getEnrichedLiens, getPropertyDetail, searchProperty } from '../lib/cotality/client';
import { deriveBadge } from '../lib/cotality/probe';

config({ path: path.resolve(process.cwd(), '.env.local') });

// ---------- Input schema (deliberately lax — Cotality fills the rest) ----------

const ListingInputSchema = z.object({
  street_address: z.string().min(1),
  city: z.string().min(1),
  state: z.string().length(2).default('AZ'),
  zip_code: z.string().min(5).optional(),

  // If you have them, the script skips the Cotality property-detail call.
  price: z.number().int().positive().optional(),
  beds: z.number().int().positive().optional(),
  baths: z.number().positive().optional(),
  sqft: z.number().int().positive().optional(),

  // Anything below is purely optional cosmetic data.
  lot_sqft: z.number().int().optional(),
  year_built: z.number().int().optional(),
  property_type: z
    .enum(['single_family', 'condo', 'townhouse', 'multifamily', 'manufactured', 'land', 'other'])
    .optional(),
  photos: z.array(z.string().url()).default([]),
  description: z.string().max(8000).optional(),
  hoa_monthly: z.number().int().optional().nullable()
});

const FileSchema = z.object({
  listings: z.array(ListingInputSchema.passthrough()).min(1)
});

type ListingInput = z.infer<typeof ListingInputSchema>;

// ---------- Mapbox geocoding ----------

interface GeocodeResult {
  lat: number;
  lng: number;
  zip: string | null;
}

async function geocodeAddress(input: ListingInput): Promise<GeocodeResult> {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  if (!token) throw new Error('Missing NEXT_PUBLIC_MAPBOX_TOKEN');
  const query = encodeURIComponent(
    `${input.street_address}, ${input.city}, ${input.state}${input.zip_code ? ` ${input.zip_code}` : ''}`
  );
  const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${query}.json?access_token=${token}&limit=1&country=us&types=address`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Geocode failed (${res.status}) for ${input.street_address}`);
  const json = (await res.json()) as {
    features?: Array<{
      center?: [number, number];
      context?: Array<{ id: string; text?: string }>;
    }>;
  };
  const feature = json.features?.[0];
  if (!feature?.center) throw new Error(`No geocode match for "${input.street_address}"`);
  const postal = feature.context?.find((c) => c.id.startsWith('postcode'))?.text ?? null;
  return { lng: feature.center[0], lat: feature.center[1], zip: postal };
}

// ---------- Cotality response extraction ----------

interface PropertyFacts {
  beds: number | null;
  baths: number | null;
  sqft: number | null;
  lot_sqft: number | null;
  year_built: number | null;
  property_type: string | null;
  last_sale_amount: number | null;
}

const STRUCTURE_TO_PROPERTY_TYPE: Record<string, string> = {
  SFR: 'single_family',
  RES: 'single_family',
  CONDO: 'condo',
  TWNHS: 'townhouse',
  TWNHSE: 'townhouse',
  MFR: 'multifamily',
  MOBILE: 'manufactured',
  MFG: 'manufactured'
};

async function fetchPropertyFacts(clip: string): Promise<PropertyFacts> {
  const resp = await getPropertyDetail(clip);
  const data = resp.data ?? resp;
  const summary = data.buildings?.data?.allBuildingsSummary;
  const firstBldg = data.buildings?.data?.Buildings?.[0];
  const lot = data.siteLocation?.data?.lot;
  const lastSale = data.lastMarketSale?.items?.[0]?.transactionDetails;

  const code = firstBldg?.structureClassification?.propertyTypeCode;
  const mappedType = code ? STRUCTURE_TO_PROPERTY_TYPE[code] ?? null : null;

  return {
    beds: summary?.bedroomsCount ?? null,
    baths: summary?.bathroomsCount ?? null,
    sqft: summary?.livingAreaSquareFeet ?? null,
    lot_sqft: lot?.lotSizeSquareFeet ?? null,
    year_built: firstBldg?.constructionDetails?.yearBuilt ?? null,
    property_type: mappedType,
    last_sale_amount: lastSale?.saleAmount ?? null
  };
}

// ---------- Per-listing processor ----------

interface ProcessResult {
  street: string;
  status: 'inserted' | 'skipped' | 'failed';
  reason?: string;
}

async function processListing(input: ListingInput): Promise<ProcessResult> {
  const supabase = getSupabaseServiceClient();
  const label = `${input.street_address}, ${input.city}`;

  // 1. Geocode (zip fallback if user didn't supply).
  const geo = await geocodeAddress(input);
  const zip = input.zip_code ?? geo.zip;
  if (!zip) {
    return { street: label, status: 'failed', reason: 'No zip — geocoder returned none' };
  }

  // 2. Cotality search → clip.
  const hit = await searchProperty({
    streetAddress: input.street_address,
    city: input.city,
    state: input.state,
    zipCode: zip,
    bestMatch: true
  });
  if (!hit) {
    return { street: label, status: 'skipped', reason: 'Cotality search returned no match' };
  }

  // 3. Cotality enriched-liens → loan + rate + UPB.
  const enriched = await getEnrichedLiens(hit.clip);
  const liens = enriched.data?.openLiens ?? [];
  const primary = liens[0]?.mortgageTransactionDetails;
  const eq = enriched.data?.openLienEquityAndLTV;
  const upb = enriched.data?.enriched?.unpaidPrincipalBalance ?? null;

  const loanType = primary?.enrichedLoanTypeCode ?? null;
  const openLienCount = eq?.totalNumberOfOpenMortgageLiens ?? null;

  if (!loanType || !['VA', 'FHA'].includes(loanType)) {
    return {
      street: label,
      status: 'skipped',
      reason: `Loan type is ${loanType ?? 'unknown'} (we want VA/FHA)`
    };
  }
  if (openLienCount !== 1) {
    return {
      street: label,
      status: 'skipped',
      reason: `Property has ${openLienCount ?? '?'} open mortgages (HELOC — not clean primary)`
    };
  }

  // 4. Property-detail (only if user didn't provide all of price + b/b/sqft).
  let facts: PropertyFacts | null = null;
  const needsDetail =
    !input.price || !input.beds || !input.baths || !input.sqft;
  if (needsDetail) {
    try {
      facts = await fetchPropertyFacts(hit.clip);
    } catch (err) {
      console.warn(`  ! property-detail failed for ${label}: ${(err as Error).message}`);
    }
  }

  const beds = input.beds ?? facts?.beds;
  const baths = input.baths ?? facts?.baths;
  const sqft = input.sqft ?? facts?.sqft;
  const price = input.price ?? facts?.last_sale_amount;

  if (!beds || !baths || !sqft) {
    return {
      street: label,
      status: 'failed',
      reason: 'Missing beds/baths/sqft and Cotality property-detail did not return them'
    };
  }
  if (!price) {
    return {
      street: label,
      status: 'failed',
      reason: 'No price provided and Cotality has no last-market-sale on record'
    };
  }

  // 5. Insert listing.
  const { data: listing, error: listingErr } = await supabase
    .from('listings')
    .insert({
      source: 'manual',
      status: 'active',
      listing_date: new Date().toISOString().slice(0, 10),
      street_address: input.street_address,
      city: input.city,
      state: input.state,
      zip_code: zip,
      lat: geo.lat,
      lng: geo.lng,
      price: Math.round(price),
      beds: Math.round(beds),
      baths,
      sqft: Math.round(sqft),
      lot_sqft: input.lot_sqft ?? facts?.lot_sqft ?? null,
      year_built: input.year_built ?? facts?.year_built ?? null,
      property_type:
        input.property_type ?? (facts?.property_type as ListingInput['property_type']) ?? 'single_family',
      photos: input.photos,
      description: input.description ?? null,
      hoa_monthly: input.hoa_monthly ?? null
    })
    .select('id')
    .single();

  if (listingErr || !listing) {
    return {
      street: label,
      status: 'failed',
      reason: `listings insert failed: ${listingErr?.message ?? 'no row returned'}`
    };
  }

  // 6. Insert assumable_flags from Cotality data.
  const rate = primary?.enrichedInterestRate ?? null;
  const rateConf = primary?.enrichedInterestRateConfidenceRank ?? null;
  const rateType = primary?.enrichedInterestRateTypeCode ?? null;
  const rateTypeConf = primary?.enrichedInterestRateTypeCodeConfidenceRank ?? null;
  const loanTypeConf = primary?.enrichedLoanTypeCodeConfidenceRank ?? null;
  const badge = deriveBadge(loanTypeConf, rateConf, rateTypeConf);
  const termYears =
    primary?.enrichedTermCode === 'Y' ? primary?.enrichedTerm ?? null : null;

  const { error: flagsErr } = await supabase.from('assumable_flags').insert({
    listing_id: listing.id,
    clip: hit.clip,
    loan_type: loanType,
    loan_type_confidence: loanTypeConf,
    rate_type: rateType,
    rate_type_confidence: rateTypeConf,
    interest_rate: rate,
    interest_rate_confidence: rateConf,
    unpaid_balance: upb,
    unpaid_balance_confidence: enriched.data?.enriched?.upbConfidenceRank ?? null,
    present_ltv: enriched.data?.enriched?.presentLTV ?? null,
    ltv_at_origination: enriched.data?.enriched?.ltv ?? null,
    estimated_equity: eq?.estimatedEquity ?? null,
    origination_amount: primary?.amount ?? null,
    loan_term_years: termYears,
    maturity_date: primary?.maturityDate
      ? `${String(primary.maturityDate).slice(0, 4)}-${String(primary.maturityDate).slice(4, 6)}-${String(primary.maturityDate).slice(6, 8)}`
      : null,
    servicer_name: liens[0]?.currentLenderDetails?.companyName ?? null,
    originator_name: liens[0]?.originationLenderDetails?.companyName ?? null,
    open_lien_count: openLienCount,
    derived_badge: badge,
    cotality_raw: enriched,
    enriched_at: new Date().toISOString()
  });

  if (flagsErr) {
    return {
      street: label,
      status: 'failed',
      reason: `assumable_flags insert failed: ${flagsErr.message}`
    };
  }

  return { street: label, status: 'inserted' };
}

// ---------- Main ----------

async function main() {
  const inputPath = path.resolve(
    process.cwd(),
    process.argv[2] ?? 'data/manual-listings.json'
  );

  let raw: string;
  try {
    raw = readFileSync(inputPath, 'utf8');
  } catch {
    console.error(`Could not read ${inputPath}.`);
    process.exit(1);
  }

  const json = JSON.parse(raw) as unknown;
  const parsed = FileSchema.safeParse(json);
  if (!parsed.success) {
    console.error('Invalid listings file:');
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    process.exit(1);
  }
  const inputs = parsed.data.listings as ListingInput[];

  console.log(`Importing ${inputs.length} listing(s) from ${inputPath}…`);
  console.log('');

  const results: ProcessResult[] = [];
  for (const input of inputs) {
    try {
      const r = await processListing(input);
      const icon = r.status === 'inserted' ? '✓' : r.status === 'skipped' ? '·' : '✗';
      const tail = r.reason ? `  (${r.reason})` : '';
      console.log(`  ${icon} ${r.street}${tail}`);
      results.push(r);
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      console.log(`  ✗ ${input.street_address}, ${input.city}  (${reason})`);
      results.push({
        street: `${input.street_address}, ${input.city}`,
        status: 'failed',
        reason
      });
    }
  }

  const inserted = results.filter((r) => r.status === 'inserted').length;
  const skipped = results.filter((r) => r.status === 'skipped').length;
  const failed = results.filter((r) => r.status === 'failed').length;

  console.log('');
  console.log(`Done. Inserted ${inserted}, skipped ${skipped}, failed ${failed}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
