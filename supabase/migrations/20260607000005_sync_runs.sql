-- sync_runs — operational health & compliance timestamp.
-- Written by: every background worker run (ARMLS sync, Cotality enrich/refresh).
-- Read by:    compliance footer ("Data updated 23 min ago"),
--             admin dashboards, Cotality budget gate.

CREATE TYPE sync_type AS ENUM (
  'armls',
  'cotality_enrich',     -- first-time enrichment for new listings
  'cotality_refresh'     -- re-enrichment of stale rows
);

CREATE TYPE sync_status AS ENUM (
  'running',
  'success',
  'partial',             -- finished with some failures
  'failed'
);

CREATE TABLE sync_runs (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type            sync_type NOT NULL,
  status          sync_status NOT NULL DEFAULT 'running',
  started_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  finished_at    TIMESTAMPTZ,

  -- Counts
  inserted_count  INTEGER NOT NULL DEFAULT 0,
  updated_count   INTEGER NOT NULL DEFAULT 0,
  deleted_count   INTEGER NOT NULL DEFAULT 0,
  skipped_count   INTEGER NOT NULL DEFAULT 0,
  failed_count    INTEGER NOT NULL DEFAULT 0,

  -- API budget (Cotality calls this run consumed)
  api_calls       INTEGER NOT NULL DEFAULT 0,

  -- Error capture
  error_message   TEXT,
  errors_sample   JSONB                       -- first N errors for triage
);

CREATE INDEX sync_runs_type_started ON sync_runs (type, started_at DESC);
CREATE INDEX sync_runs_last_success
  ON sync_runs (type, finished_at DESC)
  WHERE status = 'success' AND finished_at IS NOT NULL;
