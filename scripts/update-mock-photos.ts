#!/usr/bin/env tsx
/* eslint-disable no-console */

/**
 * Assigns mock Arizona-style house photos to every listing in Supabase.
 *
 * Photos are hot-linked from Unsplash (free, hotlink-friendly CDN).
 * Each listing gets 4 photos picked by size/city bucket so a 600 sqft
 * studio doesn't get a 4-bedroom mansion photo.
 *
 * Run with:
 *   npx tsx scripts/update-mock-photos.ts
 *
 * To re-randomize a listing, just delete its photos column in Supabase Studio
 * and re-run.
 */

import { config } from 'dotenv';
import path from 'node:path';
import { getSupabaseServiceClient } from '../lib/supabase/client';

config({ path: path.resolve(process.cwd(), '.env.local') });

// --- Curated photo pools ---
// Pulled from Unsplash. All hot-linkable. Each ?w=800 keeps the file size
// reasonable on mobile.

const PHOTOS = {
  // 1-2 BR / under 1100 sqft / condo-style
  condo: [
    'https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?w=800&q=80',
    'https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=800&q=80',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=80',
    'https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=800&q=80',
    'https://images.unsplash.com/photo-1567496898669-ee935f5f647a?w=800&q=80',
    'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800&q=80'
  ],
  // 2-3 BR / 1100-1900 sqft / typical AZ single-family
  mid: [
    'https://images.unsplash.com/photo-1564013799919-ab600027ffc6?w=800&q=80',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=80',
    'https://images.unsplash.com/photo-1605276374104-dee2a0ed3cd6?w=800&q=80',
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=80',
    'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=800&q=80',
    'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80'
  ],
  // 3-4 BR / 1900-2500 sqft / larger family homes
  large: [
    'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=800&q=80',
    'https://images.unsplash.com/photo-1605146768851-eda79da39897?w=800&q=80',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=800&q=80',
    'https://images.unsplash.com/photo-1600585154526-990dced4db0d?w=800&q=80',
    'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=80',
    'https://images.unsplash.com/photo-1576941089067-2de3c901e126?w=800&q=80'
  ],
  // Scottsdale / 2500+ sqft / upscale desert modern
  luxury: [
    'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=800&q=80',
    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=800&q=80',
    'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?w=800&q=80',
    'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=800&q=80',
    'https://images.unsplash.com/photo-1600585154363-67eb9e2e2099?w=800&q=80',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=80'
  ]
};

interface Listing {
  id: string;
  city: string;
  beds: number;
  sqft: number;
}

function bucketFor(l: Listing): keyof typeof PHOTOS {
  // Scottsdale + large = luxury
  if (l.city === 'Scottsdale' && l.sqft >= 1800) return 'luxury';
  // Fountain Hills + large = luxury
  if (l.city === 'Fountain Hills' && l.sqft >= 1800) return 'luxury';
  // Big family homes anywhere
  if (l.sqft >= 2000 || l.beds >= 4) return 'large';
  // Small condos
  if (l.sqft < 1100 || l.beds <= 2) return 'condo';
  return 'mid';
}

// Deterministic seeded pick — same listing always gets the same 4 photos
// across runs.
function pickPhotos(l: Listing): string[] {
  const pool = PHOTOS[bucketFor(l)];
  // Hash the listing id to a stable start index
  let h = 0;
  for (let i = 0; i < l.id.length; i++) h = ((h << 5) - h + l.id.charCodeAt(i)) | 0;
  const start = Math.abs(h) % pool.length;
  const picks: string[] = [];
  for (let i = 0; i < 4; i++) picks.push(pool[(start + i) % pool.length]);
  return picks;
}

async function main() {
  const supabase = getSupabaseServiceClient();

  const { data: listings, error } = await supabase
    .from('listings')
    .select('id, city, beds, sqft')
    .eq('status', 'active');

  if (error) {
    console.error('Failed to read listings:', error.message);
    process.exit(1);
  }

  console.log(`Updating photos for ${listings.length} listing(s)…`);

  let updated = 0;
  for (const l of listings as Listing[]) {
    const photos = pickPhotos(l);
    const { error: updErr } = await supabase
      .from('listings')
      .update({ photos })
      .eq('id', l.id);
    if (updErr) {
      console.error(`  ✗ ${l.id}: ${updErr.message}`);
      continue;
    }
    console.log(`  ✓ ${l.id} (${bucketFor(l)}) → ${photos.length} photos`);
    updated++;
  }
  console.log(`\nDone. Updated ${updated} listing(s).`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
