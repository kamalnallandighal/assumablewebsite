-- assumable_flags — Cotality enrichment, one row per listing.
-- Written by: Cotality enrichment worker only.
-- Read by:    public_listings view (precedence rules with verifications).

CREATE TYPE loan_type AS ENUM (
  'VA',
  'FHA',
  'USDA',
  'CNV',    -- conventional (NOT assumable, but stored so we know we checked)
  'PP',     -- private party / seller-financed
  'SBA',
  'EMP'
);

CREATE TYPE rate_type AS ENUM ('FIX', 'ADJ', 'BAL');

CREATE TYPE assumable_badge AS ENUM (
  'verified',       -- min Cotality confidence >= 4
  'plain',          -- min Cotality confidence == 3
  'contact-agent'   -- min Cotality confidence <= 2 (or null)
);

CREATE TABLE assumable_flags (
  -- Identity (1:1 with listings)
  id                              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  listing_id                      UUID NOT NULL UNIQUE
                                    REFERENCES listings(id) ON DELETE CASCADE,

  -- Cotality lookup state
  clip                            TEXT,                       -- NULL when search failed
  lookup_failed_at                TIMESTAMPTZ,                -- gates retry

  -- Loan classification (each field has its own confidence rank 1-5)
  loan_type                       loan_type,
  loan_type_confidence            SMALLINT,
  rate_type                       rate_type,
  rate_type_confidence            SMALLINT,

  -- Rate
  interest_rate                   NUMERIC(5, 3),              -- 2.875 etc.
  interest_rate_confidence        SMALLINT,

  -- Balance / equity
  unpaid_balance                  INTEGER,
  unpaid_balance_confidence       SMALLINT,
  present_ltv                     SMALLINT,                   -- integer percent
  ltv_at_origination              SMALLINT,
  estimated_equity                INTEGER,

  -- Loan details
  origination_amount              INTEGER,
  origination_date                DATE,
  loan_term_years                 SMALLINT,
  maturity_date                   DATE,

  -- Lender / servicer (title co needs servicer for assumption)
  servicer_name                   TEXT,
  originator_name                 TEXT,

  -- Compliance signal — must be exactly 1 for clean primary assumable
  open_lien_count                 SMALLINT,

  -- Derived & memoized so the public read path doesn't recompute
  derived_badge                   assumable_badge,

  -- Audit / freshness
  cotality_raw                    JSONB,                      -- last full enriched payload
  enriched_at                     TIMESTAMPTZ,                -- when real data last written
  cotality_calc_run_date          DATE,                       -- upbAndPLTVRunDate from response

  created_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at                      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Confidence ranks are 1-5 when present
  CONSTRAINT conf_loan_type  CHECK (loan_type_confidence       IS NULL OR loan_type_confidence       BETWEEN 1 AND 5),
  CONSTRAINT conf_rate       CHECK (interest_rate_confidence   IS NULL OR interest_rate_confidence   BETWEEN 1 AND 5),
  CONSTRAINT conf_rate_type  CHECK (rate_type_confidence       IS NULL OR rate_type_confidence       BETWEEN 1 AND 5),
  CONSTRAINT conf_upb        CHECK (unpaid_balance_confidence  IS NULL OR unpaid_balance_confidence  BETWEEN 1 AND 5)
);

CREATE INDEX flags_clip          ON assumable_flags (clip) WHERE clip IS NOT NULL;
CREATE INDEX flags_badge         ON assumable_flags (derived_badge);
CREATE INDEX flags_enriched_at   ON assumable_flags (enriched_at);
CREATE INDEX flags_loan_type     ON assumable_flags (loan_type) WHERE derived_badge IS NOT NULL;

CREATE TRIGGER flags_touch_updated_at
  BEFORE UPDATE ON assumable_flags
  FOR EACH ROW EXECUTE FUNCTION touch_updated_at();
