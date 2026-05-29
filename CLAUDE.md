# Assumable Homes — Claude notes

## Project status (as of 2026-05-29)

Deployed to Vercel via GitHub (`kamalnallandighal/assumablewebsite`). Local dev: `npm run dev` (Next.js, port 3000 — falls back to 3001 because another local project occupies 3000).

**Active branch: `next-rebuild`** — Next.js 15 + TS + Tailwind + Mapbox app. Replaces the static `index.html` / `properties.html` / `styles.css` / `app.js` (deleted 2026-05-27). 28 unit tests pass. Not yet pushed to remote. `redesign` branch preserved as the design reference. `main` is still the Vercel production deploy (the old static site).

**🟢 Cotality data pipeline VALIDATED (2026-05-29).** The core product thesis is unblocked — Cotality's enriched endpoint returns actual interest rates with confidence ranks for fixed-rate FHA/VA loans in Arizona. See "Cotality validation — what we proved" section below for the live test result. The 30-day trial includes the enriched tier (no paid upgrade required for validation). What remains is wiring the enriched endpoint into `lib/cotality/client.ts` and extending the probe — see "What's left to wire up" below.

---

## Cotality validation — what we proved (2026-05-29)

Live test against **2208 N 78th Gln, Phoenix, AZ 85035** (real address user provided). Response from `GET /v2/properties/liens/enriched/3129147428`:

| Field | Value | Confidence |
|---|---|---|
| `enrichedInterestRate` | **2.8** (2.8%) | **5 / Excellent** |
| `enrichedInterestRateTypeCode` | **FIX** (fixed-rate) | **4 / Very Good** |
| `enrichedLoanTypeCode` | **VA** | **5 / Excellent** |
| `enrichedTerm` | 30 years | 5 |
| `unpaidPrincipalBalance` | **$233,126** | **5** |
| `presentLTV` | 67% | 5 |
| `ltv` (at origination) | 96% | 3 |
| `estimatedEquity` | $84,158 | — |
| `purchaseAmount` / `purchaseRecordingDate` | $265,000 / 2021-04-13 | — |
| `amount` (original loan) | $259,060 (recorded 2022-01-25) | — |
| `maturityDate` | 2052-02-01 | — |
| `totalNumberOfOpenMortgageLiens` | **1** (clean primary) | — |
| `originationLenderDetails.companyName` | PENNYMAC LN SVCS LLC | — |
| `currentLenderDetails.companyName` | PENNYMAC LN SVCS LLC | — |
| `countyMortgageCoverageSummary` | Maricopa records 1930–2026-05-22 | — |

**What this means:**

1. **The product pitch ("buy at 2–4%") is literally true** — this is a real 2.8% VA loan still open, confidence 5/5, no estimation involved.
2. **The trial includes the enriched tier.** No paid upgrade required to validate or build the MVP.
3. **`enrichedLoanTypeCode` (FHA/VA/CNV) populates with confidence rank** — this is the assumable filter field. Authoritative.
4. **`unpaidPrincipalBalance` is real** — exact figure for the savings calculator. Buyer's down = sale price − $233K.
5. **Servicer is exposed** — buyer's title company needs the servicer to process the assumption. Bonus we didn't expect.
6. **Single open primary lien confirmed** — no piggyback / no HELOC complications.

**Critical auth + behavior corrections we discovered during the test:**

- Header is `Authorization: Bearer <token>`, **NOT** `Authorization: OAuth <token>` (the prior brief was wrong; CoreLogic's V1/Spark uses `OAuth`, V2 uses standard `Bearer`).
- OAuth token POST requires a `Content-Length` header — `fetch` sets it automatically with `method: 'POST'`, but raw `curl` needs `-d ''` to send an empty body and produce the header (otherwise → 411).
- `GET /v2/properties/search` returns **HTTP 404 with `{"properties": [], "messages": [...]}`** when no address match — not an empty 200. Client treats 404 as "no hit, null", not as an error.
- Response payload field is `properties` (plural), not `items`. Code now falls back to both.

The fixes for all four are committed at `1a73316` on `next-rebuild`.

**Today's budget burned:** ~16 calls of 100/day trial cap (token + 8 initial 401s + 1 single-address test + 1 retest + 2 enriched test). Plenty of room left for more validation.

---

## Product thesis

A public-facing Arizona-only assumable mortgage listing site — Zillow but filtered exclusively to FHA and VA assumable loans in greater Phoenix / Maricopa County. **The critical differentiator: zero login wall, zero registration.** Every competitor (UMe, Roam, Assumable.io, AssumeList, RetroRate) gates listings behind auth — we don't.

### Why this works legally as a public site

We are IDX, not VOW. Under NAR Policy 7.58 and ARMLS Rules §23, IDX permits public display without login, and NAR 7.58 ¶4 explicitly permits filtering listings by loan type. Compliance requirements (non-negotiable, see "Compliance" section) apply to every page.

### Broker partner — Jeff Salazar

Licensed Scottsdale AZ Realtor at **Steward Homes** (jeff@stewardhomes.com). He is our **ARMLS sponsor** — ARMLS requires a licensed designated broker to sponsor any IDX feed. Without Jeff we cannot get MLS data legally. Jeff also provides the manual "Verified" tier for listings with confirmed mortgage statements.

The existing Jeff section on `index.html` (dark ink band, `jeff.jpeg`, contact pill) is the public face of this partnership.

### Competitor landscape

| Competitor | Model | Why we beat them |
|---|---|---|
| **UMe Projects** (assumablehomesaz.com et al) | White-label AZ agent sites, built on agent-attested DB | Login wall required to view any listing — we don't gate. (Also: intentionally excluded from our copy — see existing "UMe — intentionally excluded" note.) |
| **Roam** (withroam.com) | $12.75M funded, national, 452–665 Phoenix listings | Partial login wall, not AZ-focused, no local broker. |
| **Assumable.io** | National, subscription | Full login wall. |
| **AssumeList** | National | Login wall. |
| **RetroRate** | $2.2M seed, MLS integration play | Not AZ-specific. |

Our lane: **Arizona-only + no login wall + Cotality-powered loan data + Jeff's manual verification tier.**

---

## The data problem (and why ExistingLoanType won't save us)

Naive assumption: ARMLS has a structured `ExistingLoanType` field; we filter on it and ship. Confirmed wrong:

1. The **RESO IDX Payload standard does not include `ExistingLoanType`** as a standard field — ARMLS keeps it VOW/Private only. It will not come through an IDX feed.
2. Even where it exists, **MLS Assumable field coverage is only ~5% of actual assumable inventory** (per RetroRate founder). Agents don't fill it in.
3. Every competitor identifies assumable loans via **public records cross-referencing**, not MLS fields:
   - RetroRate: "pulls from MLS listings, county property records and historic interest rate data"
   - AssumeList: "aggregated data from public records to identify mortgages on properties"
   - Roam: "uses public records to compare properties for sale with mortgage data"
4. **No competitor shows verified actual rates at scale.** Everyone displays estimated rates derived from origination date + historical Freddie Mac PMMS weekly averages. Verified rate only comes from sellers submitting mortgage statements manually (our "Verified" tier).

---

## Data sources

### ARMLS via Spark API (listings)

ARMLS retired RETS in December 2023 — **Spark Web API is the only access path**. ARMLS issues Spark API keys **directly** (not via Trestle/Cotality — do not confuse these).

- Standard base: `https://sparkapi.com/v1/`
- Replication base (bulk sync): `https://replication.sparkapi.com/v1/`
- Auth: OAuth2 bearer; every request needs:
  ```
  Authorization: OAuth <access_token>
  X-SparkApi-User-Agent: AssumableAZ/1.0
  ```
- Rate limit: **1,500 requests / rolling 5-minute window** on IDX keys
- Coverage: ~27,000 active residential listings across Phoenix, Scottsdale, Mesa, Chandler, Tempe, Glendale
- A full sync at 1,000 records/page = 27 requests — well under the limit. Hourly sync is the plan (ARMLS requires ≤12 hour refresh cadence).

### Cotality Property API V2 (loan classification + rate)

Cotality = **CoreLogic rebranded (March 2025)**. Contact: **Gene Rinas, Principal Sales Engineer (grinas@cotality.com)** — reached out directly to Jeff and Erik Youngberg-Aspelin pointing us to this API. Full OpenAPI 3.1.0 swagger is at `/Users/knallandighal/Downloads/property-api-v2-openapi3-swagger.json`. Credentials live in `.env.local` (gitignored): `COTALITY_CLIENT_ID` + `COTALITY_CLIENT_SECRET`. Both come from the developer.corelogic.com 30-day trial. CoreLogic's portal labels them "Consumer Key" / "Consumer Secret" — same thing as OAuth `client_id` / `client_secret`.

**Trial cap: 100 API calls per day.** The probe route at `/api/cotality/probe` hard-caps at 10 addresses/request (zod). At 2 calls/property the trial supports ~50 properties/day for validation.

**Auth — verified working:**
```
POST https://api1.cotality.com/oauth/token?grant_type=client_credentials
Authorization: Basic <base64(client_id:client_secret)>
(POST must include Content-Length — fetch sets it; raw curl needs -d '')

→ { access_token, expires_in, token_type: "Bearer" }

Then every request:
Authorization: Bearer <access_token>     ← NOT "OAuth <token>"
```

Token cache lives in `lib/cotality/auth.ts` with a 30s safety window before expiry triggers refetch.

#### The 2-call pipeline (verified end-to-end against 2208 N 78th Gln)

**Step 1 — search → clip:**
```
GET /v2/properties/search?streetAddress=...&state=AZ&zipCode=...&bestMatch=true&city=...
```
Returns `PropertySearchProductV2`. Look for `properties[0].clip` (or `items[0].clip` — code accepts both). **Returns HTTP 404 with `{"properties":[],"messages":[...]}` when no match** — client treats 404 as `null`, not an error.

**Step 2 — enriched liens → everything we need:**
```
GET /v2/properties/liens/enriched/{clip}
```
Returns `SingleApiResponseEnrichedLiensRiskData` → `data: EnrichedLiensRiskData` with 4 sub-objects:

**`data.openLiens[].mortgageTransactionDetails` (`EnrichedLienMortgageRiskTransaction`)** — the money fields:

| Field | What it is |
|---|---|
| `enrichedInterestRate` (+ `enrichedInterestRateConfidenceRank` 1–5) | **Actual fixed or ARM rate, ML-enriched.** This is the gold field. |
| `enrichedInterestRateTypeCode` (+ rank) | `FIX` / `ADJ` / `BAL` / `NULL`. Confirm `FIX` before quoting a steady rate. |
| `enrichedLoanTypeCode` (+ rank) | `FHA` / `VA` / `CNV` / `PP` / `SBA` / `EMP`. **The filter field for assumable.** More authoritative than `mortgage/current.loanTypeCode`. |
| `enrichedTerm` + `enrichedTermCode` (+ ranks) | Loan term + units. `Y` = years. Used for payment calc. |
| `enrichedMortgageLienPosition` + `enrichedLTV` | Lien priority + LTV at origination (decimal). |
| `amount` | Origination loan amount. |
| `mortgageDate` | Borrower signature date (YYYYMMDD). |
| `maturityDate` | Loan due date. |

**`data.enriched` (`EnrichedLienEstimatedPIQ`)** — balance + LTV:

| Field | What it is |
|---|---|
| `unpaidPrincipalBalance` (+ `upbConfidenceRank`) | **What the buyer assumes.** Drives down-payment math: `down = salePrice − UPB`. |
| `presentLTV` (+ rank) | Current LTV (integer %). |
| `ltv` (+ rank) | LTV at origination. |
| `upbAndPLTVRunDate` | When these enriched calcs ran (YYYYMMDD). Use as freshness signal. |

**`data.openLienEquityAndLTV` (`EnrichedLienRiskEquity`)** — equity + history:

| Field | What it is |
|---|---|
| `purchaseRecordingDate` + `purchaseAmount` | Last sale date and price — powers a "bought for X in YYYY" line. |
| `totalNumberOfOpenMortgageLiens` + `totalAmountOfOpenMortgageLiens` | **Critical compliance signal** — assumable requires `1` (clean primary, no piggyback). |
| `estimatedEquity` | Current equity (THVx AVM-derived). |
| `estimatedCombinedLTV` | LTV across all open liens. |
| `purchaseCombinedLTV` | LTV at original purchase. |

**`data.countyMortgageCoverageSummary`** — `firstMortgageDate` / `lastMortgageDate` for the county. Use as trust signal: if a property's `recordingDate` is within Cotality's coverage range, confidence in the rate goes up.

**`data.openLiens[].originationLenderDetails` + `.currentLenderDetails`** — servicer (e.g. `PENNYMAC LN SVCS LLC`). Title company needs this to process the assumption.

**`data.openLiens[].recordedDocumentDetails`** — `recordingDate`, `documentNumber`. Only needed if we want to fall back to OCR (we don't — enriched solves the rate problem).

#### Confidence rank → badge logic

Cotality scale: `5 = Excellent · 4 = Very Good · 3 = Good · 2 = Fair · 1 = Very Low · NULL = not enriched`.

| Rank | UI treatment |
|---|---|
| **4 or 5** | Display rate with **"Verified"** badge |
| 3 | Display rate plain (no badge) |
| 1 or 2 | Hide rate, show "Rate available — contact agent" |
| NULL | Same as 1–2 |

For our test property: rate rank 5, type rank 4, loan type rank 5 — all eligible for the Verified badge.

#### What we previously feared but no longer need

These fallback paths were planned in case `interestRate` was null for fixed loans. **The enriched endpoint makes them unnecessary at MVP scope.** Keep them in mind only if Cotality's enriched data quality drops below ~70% rank-4-or-5:

- **`GET /v2/properties/{clip}/mortgage/current`** — basic mortgage record. We dropped this from the default pipeline. Only useful for `documentNumber` (OCR seed) or `statusIndicator` (open/closed). Enriched endpoint is "Open Voluntary Liens" by definition, so the status filter is implicit.
- **`GET /v2/properties/document-images/mortgage?fipsCode=...&recordingDate=...&documentNumber=...`** — deed-of-trust PDF. Not needed unless we add an OCR-based "Seller-Verified" tier later.
- **Freddie Mac PMMS rate estimation** — same: not needed for default rate display, only for the "market rate" comparator on each listing.

### Freddie Mac PMMS (market rate + rate fallback estimate)

Free weekly feed. Used for:
- "Market rate" in savings calculations on every listing
- Fallback rate estimate when both `interestRate` is null AND document OCR fails — match by `recordingDate` week.

### Maricopa County Assessor (secondary signal / backup)

Free bulk data. Sale date for origination estimation. Used as a confirmation/backup signal alongside Cotality.

### PublicRemarks regex (secondary signal)

Catches agents who typed the rate into the MLS listing description. Cheap, low coverage, but free.

---

## Full data pipeline (validated, target state)

```
ARMLS Spark API → active listings (address, fipsCode, etc.)
       ↓
Cotality /v2/properties/search → clip per listing
       ↓
Cotality /v2/properties/liens/enriched/{clip}
       → enrichedLoanTypeCode (FHA/VA/CNV) + confidence rank
       → enrichedInterestRate + confidence rank
       → enrichedInterestRateTypeCode (FIX/ADJ/BAL) + confidence rank
       → unpaidPrincipalBalance + confidence rank
       → presentLTV + estimatedEquity + servicer + etc
       ↓
Filter: enrichedLoanTypeCode IN ['FHA','VA']
        AND totalNumberOfOpenMortgageLiens == 1  (clean primary)
        AND maturityDate > today                  (still active)
       ↓
Compute: ratingTier = min(loanType.rank, rate.rank, typeCode.rank)
         badge = ratingTier ≥ 4 ? "Verified" : ratingTier == 3 ? null : "contact-agent"
       ↓
Store in `assumable_flags` with confidence ranks preserved per field
```

2 Cotality calls per property. At trial cap (100/day) = ~50 properties/day; production scale (~27K ARMLS listings) requires a paid Cotality tier — pricing conversation with Gene Rinas before commercial launch.

---

## What's left to wire up — Cotality enriched endpoint

The validation test was a one-off direct curl. The probe route (`/api/cotality/probe`) and `lib/cotality/client.ts` still only call the basic `mortgage/current` endpoint. Next implementation pass:

### 1. Extend `lib/cotality/types.ts`

Add narrow types for the enriched response. Only the fields we actually consume:

```ts
export interface EnrichedLienResponse {
  data: {
    clip: string;
    countyMortgageCoverageSummary?: { firstMortgageDate?: number; lastMortgageDate?: number; standardizedCounty?: string; standardizedState?: string };
    openLienEquityAndLTV?: {
      purchaseRecordingDate?: number; purchaseAmount?: number;
      totalNumberOfOpenMortgageLiens?: number; totalAmountOfOpenMortgageLiens?: number;
      estimatedEquity?: number; estimatedCombinedLTV?: number | null; purchaseCombinedLTV?: number;
    };
    enriched?: {
      unpaidPrincipalBalance?: number; upbConfidenceRank?: number;
      presentLTV?: number; presentLTVConfidenceRank?: number;
      ltv?: number; ltvConfidenceRank?: number;
      upbAndPLTVRunDate?: number;
    };
    openLiens?: Array<{
      mortgageTransactionDetails?: {
        enrichedInterestRate?: number; enrichedInterestRateConfidenceRank?: number;
        enrichedInterestRateTypeCode?: 'FIX' | 'ADJ' | 'BAL' | null; enrichedInterestRateTypeCodeConfidenceRank?: number;
        enrichedLoanTypeCode?: 'FHA' | 'VA' | 'CNV' | 'PP' | 'SBA' | 'EMP' | null; enrichedLoanTypeCodeConfidenceRank?: number;
        enrichedTerm?: number; enrichedTermCode?: 'Y' | 'M' | 'D' | null;
        enrichedMortgageLienPosition?: number; enrichedLTV?: number;
        amount?: number; mortgageDate?: number; maturityDate?: number;
      };
      recordedDocumentDetails?: { recordingDate?: number; documentNumber?: string };
      originationLenderDetails?: { companyName?: string };
      currentLenderDetails?: { companyName?: string };
    }>;
  };
}
```

### 2. Add `getEnrichedLiens(clip)` to `lib/cotality/client.ts`

```ts
export function getEnrichedLiens(clip: string): Promise<EnrichedLienResponse> {
  return authedGet<EnrichedLienResponse>(`/v2/properties/liens/enriched/${clip}`);
}
```

Note: `authedGet` already uses `Bearer` after the 2026-05-29 fix. No new auth work.

### 3. Rewrite `lib/cotality/probe.ts`

Replace the mortgage/current call with the enriched call. Extract a normalized `ProbeResult` so the route response is clean and easy to read:

```ts
export interface ProbeResult {
  input: ProbeAddress;
  clip: string | null;
  // Loan classification
  loanType: 'FHA' | 'VA' | 'CNV' | null;
  loanTypeConfidence: number | null;       // 1–5
  // Rate
  interestRate: number | null;             // decimal percent e.g. 2.8
  interestRateConfidence: number | null;
  interestRateType: 'FIX' | 'ADJ' | 'BAL' | null;
  interestRateTypeConfidence: number | null;
  // Money
  unpaidBalance: number | null;
  unpaidBalanceConfidence: number | null;
  presentLTV: number | null;
  estimatedEquity: number | null;
  // Loan details
  originationAmount: number | null;
  term: number | null;
  maturityDate: number | null;             // YYYYMMDD
  // Servicer
  servicer: string | null;
  // Compliance signals
  openLienCount: number | null;
  // Badge logic
  badge: 'verified' | 'plain' | 'contact-agent' | null;
  error?: string;
}
```

Derive `badge` from `min(loanTypeConfidence, interestRateConfidence, interestRateTypeConfidence)` — `>=4` → `verified`, `==3` → `plain`, `<=2` → `contact-agent`, `null` → null.

### 4. Update probe route summary

In `app/api/cotality/probe/route.ts`, the summary should report on what matters now:

```ts
const summary = {
  total: results.length,
  withClip: results.filter(r => r.clip).length,
  withRate: results.filter(r => r.interestRate != null).length,
  verifiable: results.filter(r => r.badge === 'verified').length,
  byLoanType: { FHA: 0, VA: 0, CNV: 0, null: 0 },          // tally
  avgConfidence: { rate: 0, loanType: 0 }                    // mean of non-null ranks
};
```

### 5. Update tests

`tests/lib/cotality.client.test.ts` needs a new test for `getEnrichedLiens(clip)` with a mocked fetch returning a realistic `EnrichedLienResponse` shape. Also add a test that the Bearer header is sent (current tests don't assert the header — they should now that we know the prior `OAuth` value was wrong).

### 6. Update `lib/cotality/probe-defaults.ts`

The 8 default city-stub addresses didn't resolve in Cotality (their search returned `properties: []` for all of them). Either replace them with known-good addresses or accept that the canned probe is mostly for plumbing checks. Suggested replacement: pull 8 random sale-recently addresses from public records (Maricopa Assessor recent sales), or just keep the canned set and document that the POST endpoint is the real path with `--data @addresses.json`.

### 7. (Later) Wire into the listings flow

Once ARMLS Spark access lands via Jeff, the sync worker should: for each new active listing → search → enriched liens → write to `assumable_flags` with all confidence ranks preserved. The `SearchCard` and `DetailModal` components already exist and display rate/payment fields — they'll need a small "Verified" badge addition driven by `badge` from the row.

### Budget plan for next validation pass

- Test 4–6 more known addresses (your network, Jeff's recent showings, or randomized Maricopa recent-sale addresses) at 2 calls each = ~8–12 calls.
- Goal: confirm the 2.8% / rank 5 result wasn't a lucky single case. If 4+ of 6 properties return rank ≥ 4 on interest rate, the "Verified" badge has solid coverage.
- Trial budget after today's 16 calls: 84 left. Plenty.

---

## Target tech stack (post-validation rebuild)

Distinct from the current vanilla static site. Plan once Cotality is confirmed:

- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS
- **Database:** Supabase Postgres
- **Hosting:** Vercel
- **CDN/DNS:** Cloudflare
- **Maps:** **Mapbox** (not Google Maps) — better pricing, 50K free map loads/month, better customization for map-first product
- **Listings:** ARMLS Spark API (hourly sync)
- **Mortgage data:** Cotality Property API V2
- **Market rate:** Freddie Mac PMMS weekly feed
- **Email:** Resend
- **Analytics:** PostHog or Plausible

Carry over from the current redesign: design tokens (`--ink`, `--terra`, `--navy`, `--ok`, etc.), Inter + Source Serif 4 typography, the funnel UX, the SearchCard / MapPopCard / detail modal patterns. The `listings.json` shape is a good starting contract for the Supabase `listings` table.

---

## Database schema (target — three core tables)

Schema documented at the brief level; full migration SQL not yet committed. Three tables:

- **`listings`** — ARMLS data, synced hourly. Shape mirrors the current `listings.json` fields (`address`, `price`, `beds`, `baths`, `sqft`, `lat`, `lng`, `photo`, etc.) plus ARMLS-specific keys (listing ID, listing broker, listing date, status, fipsCode, MLS#).

- **`assumable_flags`** — derived classification per listing, sourced from Cotality enriched liens. One row per listing. Persist:
  - `listing_id` (FK), `clip` (Cotality property id)
  - `loan_type` (FHA / VA / CNV) + `loan_type_confidence` (1–5)
  - `interest_rate` (decimal e.g. 2.8) + `interest_rate_confidence` (1–5)
  - `interest_rate_type` (FIX / ADJ / BAL) + `interest_rate_type_confidence` (1–5)
  - `unpaid_balance` + `upb_confidence` (1–5)
  - `present_ltv` + `ltv_at_origination`
  - `estimated_equity`, `purchase_amount`, `purchase_recording_date`
  - `origination_amount`, `origination_recording_date`, `loan_term_years`, `maturity_date`
  - `servicer_name` (current), `originator_name`
  - `open_lien_count` (must be 1 for assumable)
  - `derived_badge` enum: `verified` (min confidence ≥ 4) / `plain` (min == 3) / `contact-agent` (≤ 2 or null)
  - `cotality_evaluated_at` (when we last hit the enriched endpoint)
  - `cotality_calc_run_date` (from `upbAndPLTVRunDate`, when Cotality last ran its ML enrichment)
  Index: `listing_id`, `loan_type`, `derived_badge`.

- **`verifications`** — Jeff's manual verification tier (gold-standard). Confirmed mortgage statement upload, verified rate, verified UPB, attached PDF, verified-by user, verified_at. Joined to `listings` to override the Cotality-derived badge with a "Seller-Verified" tier in the UI.

If a future agent is asked to write the migration, ask the user first — schema is not final.

---

## Compliance — non-negotiable, on every page

Every page (current static site and future Next.js app) must include:

1. **ARMLS disclaimer**: "All information should be verified by the recipient and none is guaranteed as accurate by ARMLS"
2. **Listing broker attribution** on every listing detail page (firm name + phone/email)
3. **Fair Housing / Equal Housing Opportunity logo** in footer
4. **Data timestamp** showing last refresh (ARMLS requires ≤12 hour refresh cadence)
5. **"Not a real estate broker" disclaimer** with Jeff's brokerage name (Steward Homes) and his license number

The current static site footer does NOT yet include all of these — flag as a pre-launch must-do.

---

## Design system (redesign branch)

Fonts loaded via Google Fonts:
- `--sans: 'Inter', sans-serif` — body, UI, labels
- `--serif: 'Source Serif 4', Georgia, serif` — display numbers, headlines, prices

Color tokens (defined as CSS variables on `:root`):
```
--ink: #0F1623        /* near-black, primary text + selected state */
--navy: #2B4072       /* monthly payment, secondary accent */
--terra: #D35932      /* orange-red CTA, funnel pill, off-market accent */
--terra-soft: #FDD8CC /* terra tint background */
--terra-ink: #631800  /* terra dark text on light terra bg */
--ok: #1E6F5C         /* green, assumable badge, savings */
--cream: #F4F3F2      /* section backgrounds */
--paper: #FFFFFF      /* card and modal backgrounds */
--line: #E5E3E1       /* borders */
--line-2: #D4D1CE     /* lighter borders, slider track */
--muted: #888         /* secondary text */
--muted-2: #999       /* tertiary text, labels */
```

Shadows: `--shadow-sm`, `--shadow-md`, `--shadow-lg` defined inline per file.

---

## Responsive design

Mobile-first breakpoints added 2026-05-26. Both pages use `<meta name="viewport" content="width=device-width, initial-scale=1">`.

### Breakpoints

| Width | What changes |
|---|---|
| ≤1100px (properties) | Sidebar narrows to 420px, card grid collapses to 1 column, off-market teaser spans 1 col. |
| ≤980px (index)       | Hero stacks (1 col), h1 → 52px, `.how-grid` → 2 cols, featured grid → 2 cols, dual-grid stacks, stat-strip → 2×2. |
| ≤900px (properties)  | Sidebar narrows further to 360px. |
| ≤768px (properties)  | `.layout` switches to `flex-direction: column`: map takes `flex: 0 0 48vh` (min 280px) on top, card list fills rest below. Map pop card becomes full-width with `left:10px; right:10px`. Filter chips become a horizontally-scrolling row (`overflow-x:auto`, scrollbar hidden), `.filter-bar-right` count is hidden. Nav links + ghost button hidden, nav padding → 16px. Filter dropdowns clamped to `calc(100vw - 24px)`. |
| ≤780px (properties)  | Detail modal becomes a fullscreen sheet (border-radius 0, max-height 100vh), gallery stacks (`dm-gallery` 1 col, stack thumbs 2 cols), topbar tightens, share/save SVG icons hidden. |
| ≤720px (index)       | Hero h1 → 38px, all sections padding → 20px horizontal. Nav collapses to logo + "Find your home" CTA. How-grid → 1 col, featured grid → 1 col, dual-grid stacks, stat-strip → 2×2 (no left borders), agent h2 → 38px. Funnel inline grids collapse via `.fn-stack-md` / `.fn-city-grid` / `.fn-result-cta` helper classes. Step-price 56px serif numerals shrink to 36px. Footer row stacks. |
| ≤480px (properties)  | Lead modal width: `calc(100% - 24px)`. |
| ≤380px (index)       | Hero h1 → 32px, funnel headline → 24px, city chips → 1 col. |

### Funnel helper classes (added to inline JS-generated grids)

The funnel templates in `index.html` use these classes alongside their existing inline `grid-template-columns` styles. Mobile media queries override the inline columns via `!important`:

- `.fn-city-grid` — step 1 city chip grid (desktop 4 col → phone 2 col → tiny 1 col)
- `.fn-stack-md` — generic "stack on phone" class used by step 2 (price 2-col), step 4 (loan 3-col), step 5 (use 2-col), step 6 (result preview 3-col)
- `.fn-result-cta` + `.fn-result-cta-row` — step 6 email capture row, switches to column layout
- `.featured-grid` (on `#featured-grid`) — phone-stack rule target
- `.featured-head` — featured-section header row, switches to column on phone
- `.footer-row` — footer flex row, switches to column on phone

When editing the funnel JS templates, preserve these class names on the outer grid div — otherwise the mobile layout breaks.

### Section H2 sizing

Section headlines in `index.html` use inline `style="font-size:48px"` (etc.). Mobile rules override with `!important` selectors:
- `.how-section h2, .featured-section h2, .faq-section h2, .dual-section h2 { font-size: 30px !important }`
- `.agent-section h2 { font-size: 38px !important }`

If you add another major section headline, either give it an inline mobile-safe size or extend the override selector.

### Known mobile compromises

- No hamburger menu yet — nav links (`Property search / How it works / Off-market / Agent`) are hidden on ≤720px. Only logo + "Find your home" CTA remain. Add a hamburger later if nav depth grows.
- Properties page filter bar's result count (`.filter-bar-right`) is hidden on phone to keep chip row uncluttered. Counts still surface via map pop card.
- `html, body { overflow: hidden }` on properties page is preserved on mobile; only the `.sidebar` and `.map-wrap` scroll internally. Don't add page-level scroll — the card list already has its own scroll container.

---

## Files

### File layout (Next.js)

`app/page.tsx` (landing) and `app/properties/page.tsx` (map page) compose components from `components/landing/` and `components/properties/`. Shared design tokens live in `tailwind.config.ts`. The data fixture is `lib/listings/data.ts` (normalizes the JSON at `public/listings.json`). Cotality client lives under `lib/cotality/`. See the implementation plan at `docs/superpowers/plans/2026-05-26-nextjs-migration.md` for the per-file rationale and which static-site landmark each component ports from.

### `listings.json` — single source of truth for both pages (unchanged)

16 listings total (10 Phoenix original + 6 new: Mesa, Chandler, more Phoenix). Fields:
```
id, address, price, beds, baths, sqft, lat, lng,
isAssumable, photo, rate, marketRate,
assumedMonthly, marketMonthly, downPayment, loanType
```
Adding fields here automatically updates both pages.

---

## Auth system (dormant — code present, UI hidden)

Auth JS is still in `index.html` but `#navAuthSlot` div was removed from the nav in the old version. In the redesign, nav has `.nav-actions` with Sign In + Get Started buttons but they are not wired to auth logic yet — they are static HTML.

Hardcoded credentials (old system, for reference): username `Kamal`, password `Test123`, name Kamal Nallandighal. Session stored in `sessionStorage`.

To wire real auth: replace the static `.nav-actions` buttons with dynamic rendering, swap hardcoded `USERS` lookup for a fetch to an auth endpoint.

---

## UMe — intentionally excluded

The original site has a "We proudly partner with UMe" section. This is excluded by design. Do not add it back without asking the user.

---

## Open decisions / next tasks

**🟢 Validation (DONE 2026-05-29):**
- [done] Validate Cotality Property API V2 against AZ data — 2208 N 78th Gln returned a real 2.8% VA loan at confidence 5 from the enriched endpoint. Trial includes enriched. See "Cotality validation — what we proved" above.

**Immediate next (Cotality wiring):**
- Add enriched-liens types to `lib/cotality/types.ts`
- Add `getEnrichedLiens(clip)` to `lib/cotality/client.ts`
- Rewrite `lib/cotality/probe.ts` to use the enriched endpoint and produce the normalized `ProbeResult` shape with badge logic
- Update `app/api/cotality/probe/route.ts` summary to report on rate confidence + verifiable count
- Add tests covering the new client method and badge derivation
- Run a 4–6 address sanity sweep to confirm rank-4-or-5 coverage isn't a one-off
- (Detailed in "What's left to wire up" section above.)

**Static-site polish (can ship independently of data backend):**
- [done] Review + ship redesign branch — superseded by the Next.js migration on `next-rebuild`; `redesign` preserved as the design reference branch
- [done] Replace `listings.json` — now imported via `lib/listings/data.ts` with numeric normalization
- [done] Wire Google Maps → Mapbox — Mapbox GL in place on `/properties`; `NEXT_PUBLIC_MAPBOX_TOKEN` still TBD (fallback UI renders without it)
- Add a "Verified" badge component + render it on `SearchCard` / `MapPopCard` / `DetailModal` when `badge === 'verified'` (component exists already, just needs the badge prop)
- Add ARMLS / Fair Housing / broker-attribution / data-timestamp compliance to footer (see "Compliance" section) before launch
- Wire lead captures (`assumableLeads` in localStorage) to a CRM webhook
- Wire `submitOffMarket()` calls (hero + funnel step 6 + investor section) to a real backend
- SEO: structured data (schema.org/RealEstateListing), meta tags, analytics
- Push `next-rebuild` to remote + flip Vercel production from old static site to Next.js once content/compliance are ready
- Confirm Jeff's email in footer — currently `jeff@assumablehomesaz.com` (from old `index.html`); CLAUDE.md says `jeff@stewardhomes.com` (Steward Homes is his brokerage). User to clarify which is canonical for the marketing site
- Decide whether to expand FAQ from 4 → 6 items (current FAQ ports the 4 from `index.html` source)

**Backend buildout (now unblocked):**
- Stand up Supabase, write migration for `listings` / `assumable_flags` / `verifications` (ask user before committing — schema not final, see updates below)
- ARMLS Spark API access via Jeff Salazar (sponsoring broker); build hourly sync worker
- Cotality pipeline: search → enriched liens → write `assumable_flags` with confidence ranks preserved per field
- (Optional) Freddie Mac PMMS weekly fetch — needed for "market rate" comparator, not for rate display (enriched gives us actual)
- Add real user auth (replace dormant hardcoded credentials) — only if we want an account tier; public IDX surface remains login-free
- Negotiate paid Cotality tier with Gene Rinas before production launch (~27K listings means ~54K calls/day, well beyond 100/day trial)
- Multilingual support: add `lang` param to Claude prompts when needed

---

## Claude usage — prompts and guidelines

### When to call Claude
- Generate short listing descriptions (50–140 chars) from listing fields.
- Create SEO-friendly title and meta description for each property page.
- Produce social captions (Instagram / Facebook / X) given a listing's `address`, `price`, `beds`, `baths`, `sqft`, and public remarks.
- Rewriting seller-provided copy to be concise and buyer-focused.

### Recommended prompts

**Short listing headline (one line)**
```
Write a concise, attention-grabbing headline (<= 60 characters) for a home listing
using this data: address: {{address}}, price: {{price}}, beds: {{beds}},
baths: {{baths}}, sqft: {{sqft}}. Keep it direct and buyer-focused.
```

**SEO title + meta description**
```
Create an SEO title (<= 60 chars) and a meta description (<= 155 chars) for a property
with the following details: {{address}}, price {{price}}, {{beds}} bd, {{baths}} ba,
{{sqft}} sqft. Include the city and the phrase 'assumable loan' when appropriate.
Return JSON: {"title":..., "description":...}.
```

**Social caption (Instagram)**
```
Write an Instagram caption (max 300 chars recommended) highlighting a unique selling
point of this property: {{publicRemarks}}. Include a short CTA like 'DM for a tour'
and 3 short hashtags. Return plain text.
```

**Short property summary for cards (1–2 sentences)**
```
Produce a 1–2 sentence summary for a property card using: price: {{price}},
beds: {{beds}}, baths: {{baths}}, sqft: {{sqft}}, address: {{address}}.
Keep it under 120 characters.
```

### Safety & content guidelines
- Do NOT include personal data beyond property contact handles provided by the user.
- Avoid creating legal, financial, or mortgage advice. When asked about loan terms or assumability specifics, respond with: "Contact the listing agent or lender for details. This is not financial advice."
- Sanitize any user-provided public remarks to remove phone numbers, emails, or PII before sending to Claude.

### Integration tips
- Keep prompts short and deterministic. Use explicit length limits and JSON-return instructions when the frontend expects structured data.
- Run Claude calls server-side (Edge Function) to protect the API key. Return only the sanitized outputs to the client.
- Cache generated content in a small local store (or in listings.json) to avoid re-calling the model on each page load.

### Cost & performance
- Use lower temperature (0.3) for SEO/title generation. Use higher temperature (0.6) for creative captions.
- Batch requests when generating summaries for multiple listings in one call.

### Example server-side usage (pseudo)
1. Receive listing data from frontend.
2. Sanitize fields (remove PII, trim long remarks).
3. Build prompt as per above templates.
4. Call Claude Edge function: temperature 0.3 for SEO/title, 0.6 for captions.
5. Validate and store returned text.
6. Return sanitized result to the client.

Notes: If multilingual support is added later, include a `lang` parameter in prompts. Log prompt + trimmed response for auditing, but never persist raw user PII.
