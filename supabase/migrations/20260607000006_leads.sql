-- leads — captures every conversion path on the site.
-- INSERT only from the public via a server function (see RLS migration).
-- Read only by Jeff / admin.

CREATE TYPE lead_kind AS ENUM (
  'tour',         -- "Book a tour" from modal/detail page
  'contact',      -- "Chat" / contact-agent button
  'offmarket',    -- email signup for off-market list
  'investor'     -- "Discuss ROI" button
);

CREATE TABLE leads (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kind            lead_kind NOT NULL,
  listing_id      UUID REFERENCES listings(id) ON DELETE SET NULL,  -- nullable: offmarket has none

  -- Contact
  email           TEXT NOT NULL,
  phone           TEXT,
  name            TEXT,
  message         TEXT,

  -- Tour-specific
  tour_date       DATE,
  tour_time       TIME,
  is_virtual      BOOLEAN NOT NULL DEFAULT FALSE,

  -- Investor-specific (free text — could become structured later)
  investor_context TEXT,

  -- Provenance
  source_url      TEXT,
  user_agent      TEXT,

  -- Lifecycle (Jeff updates these once worked)
  contacted_at    TIMESTAMPTZ,
  closed_at       TIMESTAMPTZ,

  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Minimal email shape check (full validation in app)
  CONSTRAINT email_has_at CHECK (email LIKE '%@%')
);

CREATE INDEX leads_kind_created ON leads (kind, created_at DESC);
CREATE INDEX leads_listing      ON leads (listing_id) WHERE listing_id IS NOT NULL;
CREATE INDEX leads_email        ON leads (email);
CREATE INDEX leads_open         ON leads (created_at DESC) WHERE closed_at IS NULL;
