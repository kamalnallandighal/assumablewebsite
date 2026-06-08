-- listings — primary table for property data.
-- Written by: ARMLS hourly sync (source='armls'), manual seed (source='manual'),
--             off-market intake (source='off-market').
-- Never written by Cotality or verifications.

CREATE TYPE listing_source AS ENUM ('armls', 'manual', 'off-market');

CREATE TYPE listing_status AS ENUM (
  'active',
  'pending',
  'sold',
  'withdrawn',
  'expired'
);

CREATE TYPE property_type AS ENUM (
  'single_family',
  'condo',
  'townhouse',
  'multifamily',
  'manufactured',
  'land',
  'other'
);

CREATE TABLE listings (
  -- Identity
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mls_number            TEXT UNIQUE,                      -- NULL for manual / off-market
  source                listing_source NOT NULL DEFAULT 'armls',

  -- Lifecycle
  status                listing_status NOT NULL DEFAULT 'active',
  listing_date          DATE,
  status_changed_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Address (county normalized to bare name at sync — "Maricopa" not "Maricopa County")
  street_address        TEXT NOT NULL,
  city                  TEXT NOT NULL,
  state                 CHAR(2) NOT NULL DEFAULT 'AZ',
  zip_code              VARCHAR(10) NOT NULL,
  county                TEXT,
  fips_code             VARCHAR(5),

  -- Geo: PostGIS-derived from lat/lng for the bbox map filter
  lat                   DECIMAL(10, 7) NOT NULL,
  lng                   DECIMAL(10, 7) NOT NULL,
  geog                  GEOGRAPHY(POINT, 4326)
                          GENERATED ALWAYS AS
                          (ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography)
                          STORED,

  -- Price & physical
  price                 INTEGER NOT NULL,                 -- USD, dollars not cents
  beds                  SMALLINT NOT NULL,
  baths                 NUMERIC(3, 1) NOT NULL,           -- handles 2.5 etc.
  sqft                  INTEGER NOT NULL,
  lot_sqft              INTEGER,
  year_built            SMALLINT,
  property_type         property_type DEFAULT 'single_family',

  -- Photos (array of source URLs; image proxy decides hot-link vs re-host at render time)
  photos                TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],

  -- Marketing copy (capped to keep DB row size reasonable)
  description           TEXT,

  -- HOA
  hoa_monthly           INTEGER,
  hoa_name              TEXT,

  -- Listing broker (ARMLS compliance requires displaying on every detail page)
  listing_broker_name   TEXT,
  listing_broker_phone  TEXT,
  listing_broker_email  TEXT,
  listing_broker_agent  TEXT,

  -- Sync provenance
  armls_raw             JSONB,                            -- last Spark payload, debugging
  synced_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Sanity constraints — reject obviously-bad data at insert
  CONSTRAINT lat_in_az          CHECK (lat BETWEEN 31 AND 37),
  CONSTRAINT lng_in_az          CHECK (lng BETWEEN -115 AND -109),
  CONSTRAINT price_positive     CHECK (price > 0),
  CONSTRAINT beds_positive      CHECK (beds > 0),
  CONSTRAINT baths_positive     CHECK (baths > 0),
  CONSTRAINT sqft_positive      CHECK (sqft > 0),
  CONSTRAINT description_len    CHECK (description IS NULL OR length(description) <= 8000)
);

-- Indexes match the public query patterns:
--   bbox spatial filter     → GIST on geog
--   active-only public      → partial index on status='active'
--   price filter / sort     → btree on price
--   MLS dedupe on sync      → UNIQUE on mls_number
--   admin reports by source → btree on source
--   newest-first sort       → btree on listing_date DESC
CREATE INDEX listings_geog_idx       ON listings USING GIST (geog);
CREATE INDEX listings_status_active  ON listings (status) WHERE status = 'active';
CREATE INDEX listings_price          ON listings (price);
CREATE INDEX listings_source         ON listings (source);
CREATE INDEX listings_listing_date   ON listings (listing_date DESC NULLS LAST);

-- Bump updated_at on every UPDATE (trigger because PG doesn't do this natively).
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER listings_touch_updated_at
  BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
