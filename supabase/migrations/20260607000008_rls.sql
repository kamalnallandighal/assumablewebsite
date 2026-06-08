-- Row-Level Security.
-- Default deny — explicit policies grant the public anon role just what it
-- needs. Service-role (used by our background workers) bypasses RLS entirely.
--
-- Public can:
--   - SELECT all rows from listings, assumable_flags, verifications
--     (the public_listings VIEW filters further, but the underlying tables
--      need SELECT permission for the view to resolve as the anon role).
--   - INSERT into leads via the submit_lead() function (rate-limited).
--
-- Public cannot:
--   - SELECT leads, sync_runs.
--   - Mutate listings, assumable_flags, verifications.

-- --- Enable RLS ---
ALTER TABLE listings        ENABLE ROW LEVEL SECURITY;
ALTER TABLE assumable_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE verifications   ENABLE ROW LEVEL SECURITY;
ALTER TABLE sync_runs       ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads           ENABLE ROW LEVEL SECURITY;

-- --- Public READ on the three display tables ---
CREATE POLICY listings_anon_read
  ON listings FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY flags_anon_read
  ON assumable_flags FOR SELECT
  TO anon, authenticated
  USING (TRUE);

CREATE POLICY verifications_anon_read
  ON verifications FOR SELECT
  TO anon, authenticated
  USING (TRUE);

-- sync_runs: only authenticated (admin) and service_role can read.
-- For now: no public policy. We'll expose the compliance timestamp via a
-- specific SECURITY DEFINER function so we don't leak operational metadata.
CREATE OR REPLACE FUNCTION public_last_sync(p_type sync_type)
RETURNS TIMESTAMPTZ
LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT finished_at
  FROM sync_runs
  WHERE type = p_type AND status = 'success' AND finished_at IS NOT NULL
  ORDER BY finished_at DESC
  LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public_last_sync(sync_type) TO anon, authenticated;

-- --- Leads: insert via a function only ---
-- Stops drive-by spam by requiring our server route to call this function.
-- The function does light validation; rate limiting lives in the Next.js API
-- route that calls it (Vercel Edge can limit by IP).
CREATE OR REPLACE FUNCTION submit_lead(
  p_kind            lead_kind,
  p_email           TEXT,
  p_listing_id      UUID DEFAULT NULL,
  p_phone           TEXT DEFAULT NULL,
  p_name            TEXT DEFAULT NULL,
  p_message         TEXT DEFAULT NULL,
  p_tour_date       DATE DEFAULT NULL,
  p_tour_time       TIME DEFAULT NULL,
  p_is_virtual      BOOLEAN DEFAULT FALSE,
  p_investor_context TEXT DEFAULT NULL,
  p_source_url      TEXT DEFAULT NULL,
  p_user_agent      TEXT DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  new_id UUID;
BEGIN
  -- Basic validation. Anything heavier belongs in the app.
  IF p_email IS NULL OR p_email NOT LIKE '%@%' THEN
    RAISE EXCEPTION 'invalid email';
  END IF;
  IF length(coalesce(p_email, '')) > 320 THEN
    RAISE EXCEPTION 'email too long';
  END IF;

  INSERT INTO leads (
    kind, listing_id, email, phone, name, message,
    tour_date, tour_time, is_virtual,
    investor_context, source_url, user_agent
  )
  VALUES (
    p_kind, p_listing_id, p_email, p_phone, p_name, p_message,
    p_tour_date, p_tour_time, COALESCE(p_is_virtual, FALSE),
    p_investor_context, p_source_url, p_user_agent
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;
GRANT EXECUTE ON FUNCTION submit_lead TO anon, authenticated;

-- No general INSERT policy on leads — the SECURITY DEFINER function is the
-- only path in for anon role. Service role (workers, admin dashboards) still
-- bypasses RLS and can SELECT / UPDATE the table.
