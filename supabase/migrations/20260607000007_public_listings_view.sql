-- public_listings — the single view the website hits.
--
-- Responsibilities:
--   1. Stitch listings + assumable_flags + verifications into a flat row.
--   2. Apply precedence: verification (if active) wins over Cotality.
--   3. Compute `is_assumable` as a single boolean for the public filter.
--   4. Filter to status='active' AND source != 'off-market' (on-market only per
--      product decision; off-market lives behind the lead-magnet page).
--
-- Why a regular VIEW (not MATERIALIZED):
--   At our scale (<100K active rows) the JOIN resolves in <50ms with the
--   underlying indexes. A materialized view would add refresh latency and
--   complexity that we don't need yet.

CREATE OR REPLACE VIEW public_listings AS
SELECT
  l.id,
  l.mls_number,
  l.source,
  l.street_address,
  l.city,
  l.state,
  l.zip_code,
  l.county,
  l.lat,
  l.lng,
  l.geog,
  l.price,
  l.beds,
  l.baths,
  l.sqft,
  l.lot_sqft,
  l.year_built,
  l.property_type,
  l.photos,
  l.description,
  l.hoa_monthly,
  l.listing_broker_name,
  l.listing_broker_phone,
  l.listing_broker_email,
  l.listing_broker_agent,
  l.listing_date,
  l.synced_at,
  l.status,

  -- Effective values: active verification overrides Cotality
  COALESCE(v.loan_type,       f.loan_type)       AS loan_type,
  COALESCE(v.interest_rate,   f.interest_rate)   AS interest_rate,
  COALESCE(v.unpaid_balance,  f.unpaid_balance)  AS unpaid_balance,
  COALESCE(v.maturity_date,   f.maturity_date)   AS maturity_date,
  v.monthly_payment AS verified_monthly_payment,

  f.present_ltv,
  f.estimated_equity,
  f.servicer_name,
  f.enriched_at,

  -- Single badge for the UI to render
  CASE
    WHEN v.tier = 'lender-confirmed' THEN 'lender-confirmed'
    WHEN v.tier = 'seller-verified'  THEN 'seller-verified'
    ELSE f.derived_badge::TEXT
  END AS display_badge,

  -- The product gate: a listing is publicly "assumable" iff either
  -- (a) there's an active manual verification, OR
  -- (b) Cotality classified it as VA/FHA/USDA with a derived_badge AND it's
  --     a clean primary lien (exactly 1 open mortgage).
  (
    (v.id IS NOT NULL AND v.expires_at > NOW())
    OR (
      f.loan_type IN ('VA','FHA','USDA')
      AND f.derived_badge IS NOT NULL
      AND f.open_lien_count = 1
    )
  ) AS is_assumable

FROM listings l
LEFT JOIN assumable_flags f
  ON f.listing_id = l.id
LEFT JOIN LATERAL (
  SELECT *
  FROM verifications
  WHERE listing_id = l.id
    AND (expires_at IS NULL OR expires_at > NOW())
  ORDER BY verified_at DESC
  LIMIT 1
) v ON TRUE
WHERE l.status = 'active'
  AND l.source <> 'off-market';
