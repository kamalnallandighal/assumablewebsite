-- verifications — Jeff's manual gold-tier overrides.
-- Always wins over Cotality's derived_badge.
-- Many rows per listing allowed (history); the most-recent unexpired wins.

CREATE TYPE verification_tier AS ENUM (
  'seller-verified',   -- seller uploaded mortgage statement, Jeff confirmed
  'lender-confirmed'   -- lender directly attested
);

CREATE TABLE verifications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id      UUID NOT NULL
                    REFERENCES listings(id) ON DELETE CASCADE,

  tier            verification_tier NOT NULL,

  -- Verified values (override Cotality)
  loan_type       loan_type NOT NULL,
  interest_rate   NUMERIC(5, 3) NOT NULL,
  unpaid_balance  INTEGER NOT NULL,
  maturity_date   DATE,
  monthly_payment INTEGER,

  -- Evidence (PDF lives in Supabase Storage, URL here)
  evidence_url    TEXT,
  notes           TEXT,

  -- Provenance
  verified_by     TEXT NOT NULL,         -- 'Jeff Salazar' or verifier email
  verified_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Mortgage statements go stale fast; 90 days default expiry.
  expires_at      TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '90 days')
);

CREATE INDEX verifications_listing_id ON verifications (listing_id);
-- Composite index drives the public_listings view's LATERAL subquery
-- (lookup by listing_id, newest first, expiry filter applied at query time).
-- Can't make this a partial index on `WHERE expires_at > NOW()` — Postgres
-- requires index predicates to be IMMUTABLE, and NOW() is STABLE.
CREATE INDEX verifications_recent ON verifications (listing_id, verified_at DESC);
