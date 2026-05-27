# Assumable Homes

Next.js 15 + TypeScript + Tailwind app for FHA / VA assumable mortgage listings in Arizona.
Public-facing, no login wall. Powered by ARMLS (listings) + Cotality (loan classification).

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in tokens (see Environment below)
npm run dev                         # http://localhost:3000 (or 3001 if 3000 is taken)
```

## Environment

| Var | Required for | Purpose |
|-----|--------------|---------|
| `COTALITY_CLIENT_ID` / `COTALITY_CLIENT_SECRET` | `/api/cotality/probe` | OAuth client-credentials grant for Cotality Property API V2 |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Properties map | Mapbox GL token (domain-scoped publishable token) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Not yet used | Reserved for post-validation rebuild |

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm start` | Run the production build |
| `npm run test` | Vitest unit tests |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | `next lint` |

## Cotality probe

Validates that the Cotality Property API V2 returns useful loan data for AZ addresses.
The route hard-caps at 10 addresses per request (the dev trial is 100 calls/day; each address ≈ 2 calls).

```bash
curl -X POST http://localhost:3000/api/cotality/probe \
  -H 'Content-Type: application/json' \
  -d '{
    "addresses": [
      {"streetAddress":"123 Example St","state":"AZ","zipCode":"85001","label":"known-FHA-1"}
    ]
  }'
```

Response shape:
```json
{
  "summary": {
    "total": 1,
    "withClip": 1,
    "withMortgage": 1,
    "withRate": 0,
    "byLoanType": { "FHA": 1 }
  },
  "results": [ /* one ProbeResult per input address */ ]
}
```

## Project context

See [`CLAUDE.md`](./CLAUDE.md) for the full architecture write-up: product thesis, ARMLS + Cotality data pipeline, current blocker (Cotality validation), competitor landscape, compliance requirements, and the post-validation backend plan.

The original implementation plan that produced this codebase lives at
[`docs/superpowers/plans/2026-05-26-nextjs-migration.md`](./docs/superpowers/plans/2026-05-26-nextjs-migration.md).
