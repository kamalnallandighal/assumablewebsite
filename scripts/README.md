# Scripts

## seed-manual-listings.ts

Imports hand-curated listings into Supabase. Use this for:
- Your initial 30 pre-ARMLS demo listings.
- Off-market / pocket inventory Jeff hand-enters.
- Any one-off listing that doesn't come through the ARMLS sync.

### Setup once

1. Confirm `.env.local` has:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
   SUPABASE_SECRET_KEY=sb_secret_...          # or legacy SUPABASE_SERVICE_ROLE_KEY
   NEXT_PUBLIC_MAPBOX_TOKEN=pk....            # only needed if any listing is missing lat/lng
   ```
   (Script accepts either the new `SUPABASE_SECRET_KEY` or the legacy
   `SUPABASE_SERVICE_ROLE_KEY` — both are the same key, just renamed in 2025.)
2. Copy the template to your real file:
   ```
   cp data/manual-listings.example.json data/manual-listings.json
   ```

### Fill in `data/manual-listings.json`

The JSON has a `listings: []` array. Fill in one object per property.

**Required fields per listing:**

| Field | Type | Notes |
|---|---|---|
| `street_address` | string | "1820 N Central Ave" |
| `city` | string | "Phoenix" |
| `zip_code` | string | "85004" |
| `price` | number | Asking price in USD (no cents) |
| `beds` | int | |
| `baths` | number | Halves OK (2.5) |
| `sqft` | int | |
| `loan_type` | "VA" \| "FHA" \| "USDA" | Loan type of the EXISTING mortgage |
| `interest_rate` | number | Percent format. 2.875 not 0.02875 |
| `unpaid_balance` | int | Remaining principal. Buyer's down payment = price − this. |

**Optional (use these for richer data):**

| Field | Type | Default |
|---|---|---|
| `state` | string(2) | "AZ" |
| `lat`, `lng` | number | Geocoded via Mapbox if missing |
| `county` | string | NULL |
| `lot_sqft`, `year_built` | int | NULL |
| `property_type` | enum | "single_family" |
| `photos` | string[] | [] (empty array shows placeholder) |
| `description` | string | NULL (max 8000 chars) |
| `hoa_monthly`, `hoa_name` | int / string | NULL |
| `listing_broker_*` | string | NULL |
| `maturity_date` | ISO date | NULL (uses loan_term_years instead) |
| `loan_term_years` | int | 30 |

### Run

```bash
npx tsx scripts/seed-manual-listings.ts

# Or point at a different file:
npx tsx scripts/seed-manual-listings.ts data/some-other-batch.json
```

### What it does, per listing

1. **Geocode** the address via Mapbox if lat/lng are missing.
2. **Insert into `listings`** with `source='manual'`, `status='active'`.
3. **Insert into `verifications`** with `tier='seller-verified'`, computing `monthly_payment` from rate + balance + remaining term.

The `public_listings` view then treats it as assumable because of the verification row — no need to populate `assumable_flags`. (Cotality enrichment can still run on it later and fill that table in.)

### Re-running

The script doesn't dedupe. Running it twice on the same file creates duplicate listings. If you need to redo:

```sql
-- Wipe just the manual seed rows (does NOT touch ARMLS data)
DELETE FROM listings WHERE source = 'manual';
-- Cascade also clears their verifications + assumable_flags rows.
```

### Troubleshooting

**`Could not read data/manual-listings.json`** — you forgot to copy `.example.json` over.

**`No geocode match for ...`** — Mapbox didn't find that address. Either fix the spelling or hand-set `lat`/`lng`.

**`listings insert failed: new row violates check constraint "lat_in_az"`** — your lat/lng is outside Arizona bounds (31–37 N, 109–115 W). Double-check the geocoded values.

**`verifications insert failed: column "loan_type" violates ...`** — your `loan_type` isn't one of `VA`/`FHA`/`USDA`. Conventional loans aren't assumable; don't seed them.
