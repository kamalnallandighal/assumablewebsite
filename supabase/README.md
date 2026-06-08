# Supabase setup

Schema migrations + setup instructions for the Assumable Homes project DB.

## What's in here

```
supabase/
├── README.md                   ← you are here
└── migrations/
    ├── 20260607000001_extensions.sql         postgis + pgcrypto
    ├── 20260607000002_listings.sql           main listings table + PostGIS geog
    ├── 20260607000003_assumable_flags.sql    Cotality enrichment, 1:1 with listings
    ├── 20260607000004_verifications.sql      Jeff's manual gold-tier overrides
    ├── 20260607000005_sync_runs.sql          background-job health & compliance timestamp
    ├── 20260607000006_leads.sql              tour requests / contact-agent / offmarket signups
    ├── 20260607000007_public_listings_view.sql   the single VIEW the website reads
    └── 20260607000008_rls.sql                Row-Level Security + submit_lead() function
```

Migrations are append-only and timestamped. Don't edit one that's been applied — write a new one.

## Applying migrations — two paths

### Path A: Supabase Studio (simplest, no CLI install)

1. Open your project at https://supabase.com/dashboard → your project → **SQL Editor**.
2. Paste each migration file IN ORDER. Run each one and confirm it succeeded before moving to the next.
3. After all 8 run clean, check **Table Editor**: you should see `listings`, `assumable_flags`, `verifications`, `sync_runs`, `leads` tables and a `public_listings` view.

### Path B: Supabase CLI (preferred for repeatability)

```bash
brew install supabase/tap/supabase            # one-time install
supabase login                                # opens browser

# Link this repo to your remote project
supabase link --project-ref <your-project-ref>
# (project-ref is the xxxxx in https://xxxxx.supabase.co)

# Push every pending migration to the remote DBs
supabase db push
```

The CLI tracks which migrations have been applied (via `supabase_migrations` table) so re-running is safe.

## Env vars

After the project exists, set these in `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co

# Public-side key (safe to ship to the browser). Pick ONE of these:
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=   # new naming (2025+)
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...                      # legacy naming, still works

# Server-only secret key. Pick ONE:
SUPABASE_SECRET_KEY=sb_secret_...           # new naming (2025+)
SUPABASE_SERVICE_ROLE_KEY=eyJ...            # legacy naming, still works
```

Find both keys at **Project Settings → API → Project API keys**. Supabase renamed
`anon` → `publishable` and `service_role` → `secret` in late 2025. The keys are
interchangeable from the SDK's perspective — only the names changed. Our env
loader accepts whichever pair you have.

**The secret key bypasses RLS. NEVER expose it to the client.** Only background
workers and server-side API routes should read it. Never commit it. It must
never appear in any `NEXT_PUBLIC_*` env var.

## Verifying the schema is alive

After applying migrations, run this in the SQL editor:

```sql
-- Should return 0 (no listings yet, but the view exists and queries cleanly)
SELECT COUNT(*) FROM public_listings;

-- Should list our 5 tables + 1 view
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public' AND table_name IN (
  'listings', 'assumable_flags', 'verifications',
  'sync_runs', 'leads', 'public_listings'
);

-- Should list the bbox + price indexes among others
SELECT indexname FROM pg_indexes WHERE schemaname='public' AND tablename='listings';

-- Confirm postgis is enabled
SELECT postgis_version();
```

## How the app uses it

- **Read path:** Server components / API routes query the `public_listings` view via the Supabase JS client (anon key OK; RLS allows SELECT). The bbox map filter uses PostGIS: `ST_Intersects(geog, ST_MakeEnvelope(...))`.
- **Lead capture:** Public anon role can ONLY insert leads via the `submit_lead()` SECURITY DEFINER function — no direct INSERT on the table.
- **Sync workers (ARMLS, Cotality):** Run server-side, use the service-role key, write directly to `listings` + `assumable_flags` + `sync_runs`. They bypass RLS.
- **Admin (Jeff):** Uses Supabase Studio directly to add verifications, manually patch listings, etc.

## Adding a new migration

When the schema needs to change:

1. Create a new file `YYYYMMDDHHMMSS_<short_name>.sql` in `supabase/migrations/`.
2. Use forward-compatible changes only (ADD COLUMN, CREATE INDEX, etc.).
3. If you need to drop or rename, write a separate migration and coordinate the app deploy.
4. Commit the migration BEFORE you apply it to prod, so the file lands in git first.

## Local dev without Supabase

The app falls back to the `public/listings.json` fixture when `NEXT_PUBLIC_SUPABASE_URL` is unset. You can develop without Supabase running locally.

## Common pitfalls

- **Forgetting to apply migration in order.** The view references the tables; tables must exist first. The timestamp prefix sorts them correctly — just paste in order.
- **Service role key leaked to client.** If you ever see `SUPABASE_SERVICE_ROLE_KEY` in a `NEXT_PUBLIC_*` env var or a client component, stop. Rotate it.
- **Editing an already-applied migration.** Postgres has already executed it. Editing the file just confuses future reviewers and the CLI tracker. Write a NEW migration to alter the schema.
- **Bbox query slow?** Run `EXPLAIN ANALYZE` on the query. The GiST index on `geog` should be used; if it isn't, the planner's stats are stale — run `ANALYZE listings;`.
