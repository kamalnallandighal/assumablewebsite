#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Prints the 7 lowest-rate assumable listings (the ones in the hero slideshow)
 * so the user knows which addresses to source photos for.
 *
 * Run with:
 *   npx tsx scripts/print-slideshow-listings.ts
 */

import { config } from 'dotenv';
import path from 'node:path';
import { getSupabaseServiceClient } from '../lib/supabase/client';

config({ path: path.resolve(process.cwd(), '.env.local') });

interface Row {
  id: string;
  street_address: string;
  city: string;
  state: string;
  zip_code: string;
  loan_type: string | null;
  interest_rate: number | null;
}

async function main() {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase
    .from('public_listings')
    .select('id, street_address, city, state, zip_code, loan_type, interest_rate')
    .eq('is_assumable', true)
    .order('interest_rate', { ascending: true, nullsFirst: false })
    .limit(7);

  if (error) {
    console.error('Query failed:', error.message);
    process.exit(1);
  }

  const rows = (data ?? []) as Row[];
  console.log(`\nTop ${rows.length} lowest-rate assumable listings (slideshow lineup):\n`);
  console.log('  #  Rate    Loan  Address                                                   Id');
  console.log('  -  ------  ----  --------------------------------------------------------  ------------------------------------');
  rows.forEach((r, i) => {
    const rate = r.interest_rate != null ? `${r.interest_rate.toFixed(3)}%` : '   —  ';
    const loan = (r.loan_type ?? '   ').padEnd(4);
    const addr = `${r.street_address}, ${r.city}, ${r.state} ${r.zip_code}`.padEnd(56);
    console.log(`  ${i + 1}  ${rate.padEnd(6)}  ${loan}  ${addr.slice(0, 56)}  ${r.id}`);
  });
  console.log('');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
