# Assumable Homes — Claude notes

## Project status (as of 2026-05-26)

Deployed to Vercel via GitHub (`kamalnallandighal/assumablewebsite`). Static site, also runs locally with `python3 -m http.server 8000`.

**Active branch: `redesign`** — full visual redesign implemented from a design handoff package at `/Users/knallandighal/Downloads/design_handoff_assumable_homes`. Branch `main` is preserved as-is and is the current Vercel production deploy. Do not push `redesign` until the user confirms they're happy with it.

Mobile responsiveness pass landed 2026-05-26 (uncommitted) — see "Responsive design" section below.

> **Important context disconnect to know about:** the *current* repo is a vanilla HTML/CSS/JS static site using Google Maps + a static `listings.json` of 16 fake Phoenix listings. The *product thesis* below describes a Next.js + Supabase + Mapbox app driven by ARMLS + Cotality data. The static site is the current marketing/UX prototype; the real product backend has not been built. **Do not start the Next.js rebuild or migrate listings off `listings.json` until the Cotality data pipeline is validated** (see "Current blocker" below).

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

### Cotality Property API V2 (loan classification)

Cotality = **CoreLogic rebranded (March 2025)**. Contact: **Gene Rinas, Principal Sales Engineer (grinas@cotality.com)** — reached out directly to Jeff and Erik Youngberg-Aspelin pointing us to this API. Full OpenAPI 3.1.0 swagger is at `/Users/knallandighal/Downloads/property-api-v2-openapi3-swagger.json`.

**Auth:**
```
POST https://api1.cotality.com/oauth/token?grant_type=client_credentials
Authorization: Basic <base64(client_id:client_secret)>
```

**Pipeline endpoints (verified against swagger — corrects a few details from earlier briefs):**

1. **Property search → clipId**
   ```
   GET /v2/properties/search?streetAddress=...&state=AZ&zipCode=...&bestMatch=true
   ```
   Returns `PropertySearchProductV2`. `clip` is Cotality's unique property identifier (not `clipId` in the path — see correction below).

2. **Current mortgage** (the money endpoint)
   ```
   GET /v2/properties/{clip}/mortgage/current
   ```
   Returns `MortgageTransactionProduct` → `items: MortgageDetail[]`. Each `MortgageDetail.mortgageTransactionDetail` contains:
   - `loanTypeCode` + `loanTypeCodeDescription` — **Conventional / FHA / VA** ← the filter field
   - `interestRate` — ⚠️ **swagger says "Beginning interest rate per the recorded loan documents for Adjustable Rate Mortgages"** — so this may only be populated for ARMs, not fixed-rate FHA/VA. Validate against real AZ data; if null for fixed loans, document-image OCR becomes mandatory.
   - `interestRateTypeCode` — Fixed vs ARM
   - `amount` — original loan amount at recording
   - `recordingDate` (YYYYMMDD integer)
   - `mortgageTypeCode` / `purposeCode` — Purchase / Refi / HELOC
   - `lienPosition` — 1 = primary
   - `statusIndicator` — open / closed / paid off (filter on "open")
   - `term`, `termCode`, `dueDate`
   - `lenderDetail` (separate sub-object) — servicer name
   - `mortgageArmDetail` (separate sub-object) — ARM index/margin

3. **Document image** (rate fallback for fixed-rate loans)
   ```
   GET /v2/properties/document-images/{product}
     ?fipsCode=04013        (Maricopa County)
     &recordingDate=YYYYMMDD
     &documentNumber=...
     &outputType=PDF|TIFF
   ```
   ⚠️ Correction from earlier briefs: this endpoint is **not** `/v2/properties/{clipId}/document-image`. It's a global endpoint keyed by **fipsCode + recordingDate + documentNumber** — all of which you get from the mortgage/current response. Many 2019–2022 AZ deeds of trust include the interest rate in the document body — OCR + regex extracts it.

4. **Estimated unpaid balance / LTV — not on the basic mortgage endpoint.** Correction from earlier brief: `estimatedUnpaidBalance` and `estimatedLTV` do **not** exist on `MortgageDetail`. They live on the **enriched liens** endpoint:
   ```
   GET /v2/properties/liens/enriched/{clip}
   ```
   under `EnrichedLienEstimatedPIQ.unpaidPrincipalBalance`, `.presentLTV`, `.presentLTVConfidenceRank`. This is a separate (likely paid-tier) product — check pricing before assuming we get UPB cheaply.

### Freddie Mac PMMS (market rate + rate fallback estimate)

Free weekly feed. Used for:
- "Market rate" in savings calculations on every listing
- Fallback rate estimate when both `interestRate` is null AND document OCR fails — match by `recordingDate` week.

### Maricopa County Assessor (secondary signal / backup)

Free bulk data. Sale date for origination estimation. Used as a confirmation/backup signal alongside Cotality.

### PublicRemarks regex (secondary signal)

Catches agents who typed the rate into the MLS listing description. Cheap, low coverage, but free.

---

## Full data pipeline (target state)

```
ARMLS Spark API → active listings (address, fipsCode, etc.)
       ↓
Cotality /v2/properties/search → clipId per listing
       ↓
Cotality /v2/properties/{clip}/mortgage/current → loanTypeCode + recordingDate + documentNumber + interestRate?
       ↓
Filter: loanTypeCode IN ['FHA','VA'] AND statusIndicator = open AND lienPosition = 1
       ↓
If interestRate null (fixed-rate loans) →
  /v2/properties/document-images/{product}?fipsCode=04013&recordingDate=...&documentNumber=...
  → OCR PDF → regex extract rate
       ↓
If still no rate → estimate from recordingDate + Freddie Mac PMMS that week
       ↓
(Optional, paid) /v2/properties/liens/enriched/{clip} → UPB + present LTV
       ↓
Store in `assumable_flags` with confidence score
```

---

## Current blocker — validate Cotality before building anything else

**We have not yet tested the Cotality API.** Next action gating all backend work:

1. Sign up for 30-day free trial at `developer.corelogic.com`
2. Run test calls against known Arizona addresses (pick 5–10 properties with known assumable FHA/VA loans)
3. Confirm:
   - Does `loanTypeCode` return `FHA` / `VA` for Maricopa County properties?
   - Does `interestRate` populate for fixed-rate loans, or only ARMs as the schema hints?
   - If null on fixed loans, does `/v2/properties/document-images/{product}` return a usable PDF, and is the rate extractable via OCR?
   - What's the enriched-liens pricing tier, and do we actually need UPB at launch?

**Do not start the Next.js rebuild, schema migration, or any sync worker until this is validated.** The entire product depends on reliably classifying FHA/VA and surfacing a rate.

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

- **`listings`** — ARMLS data, synced hourly. Shape mirrors the current `listings.json` fields (`address`, `price`, `beds`, `baths`, `sqft`, `lat`, `lng`, `photo`, etc.) plus ARMLS-specific keys (listing ID, listing broker, listing date, status, fipsCode).
- **`assumable_flags`** — derived classification per listing. `loan_type` (FHA / VA), `interest_rate`, `rate_source` (cotality_field / document_ocr / pmms_estimate), `unpaid_balance` (nullable, from enriched liens), `confidence` (0–100), `last_evaluated_at`. Indexed on `listing_id` + `loan_type`.
- **`verifications`** — Jeff's manual verification tier. Confirmed mortgage statement data, attached docs, verified-by user, verified_at. Joined to listings to power the "Verified" badge.

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

### `index.html` — landing page (fully rewritten in redesign)

**Removed from old version:** topbar with Jeff photo + phone, "LUXURY DIVISION" nav logo, Cormorant Garamond + Poppins fonts, parallax hero, region cards, auto-scrolling carousels, Win-win cards, old FAQ accordion.

**New structure:**

- **Nav** — `.nav` with `.nav-logo` (text "assumable" + `.nav-logo-dot` 10×10px ink square) + centered `.nav-links` (Property Search / How It Works / Contact) + `.nav-actions` (Sign in ghost + Get started terra button). Auth code is dormant — see Auth section below.

- **Hero** — 2-col grid (`1fr 1.05fr`, 72px gap). Left: `.hero-h1` (68px Source Serif 4, weight 400), with `<em>` italic navy for "2–4%" rate callout, supporting copy, and terra CTA button. Right: 2×2 stats grid (32px serif numerals) + funnel card below.

- **Funnel card** — `#funnel-card` div. Contains `.funnel-pill` (terra badge "Find your home"), `#funnel-root` (populated by JS). 6-step flow, all steps optional. State managed via `funnelState` JS object; `renderFunnel()` re-renders the entire step on each interaction.

  Steps:
  1. **StepCity** — 4×2 grid of city chips (Phoenix, Mesa, Chandler, Scottsdale, Gilbert, Tempe, Glendale, Peoria) with counts. "Open to anywhere in AZ" checkbox.
  2. **StepPrice** — Two range sliders: max monthly payment (serif 56px live value + `/mo`) and max purchase price. Info callout about 8–15% down assumption.
  3. **StepBeds** — Min beds (1/2/3/4/5+) and min baths (1/1.5/2/2.5/3+) as pill selectors.
  4. **StepLoan** — 3 cards: VA / FHA / Show both. VA selected by default.
  5. **StepUse** — 2 cards: Primary residence / Investment-rental.
  6. **StepResult** — 3 preview listing cards (from first 3 visible filtered listings), email input + "Send my matches" button wired to `submitOffMarket()`.

  Nav: progress bar strip (6 segments), Back / Skip / Continue buttons, Save & exit ghost button.

- **How it works** — 3-col grid of cards with large terra serif step numbers, ink icons, hover lift animation.

- **Featured listings** — 3-up grid fetched from `listings.json` (first 3 assumable listings). Each card: 4:3 image placeholder, loan tag badge, rate, address, monthly payment in navy.

- **Investor / Off-market dual band** — two side-by-side dark sections (ink bg). Left: investor pitch with ROI stats. Right: off-market waitlist with email input wired to `submitOffMarket()`.

- **Jeff section** — dark ink background, `jeff.jpeg` (`object-position: center top`), 64px serif headline, 4-up stat strip, `.contact-pill` with mail + phone links.

- **FAQ** — `<details>`/`<summary>` accordion, 6 questions.

- **Footer** — 3-col: logo/tagline, nav links, contact info.

- **Scroll-reveal** — `IntersectionObserver` toggles `.visible` on `.reveal` and `.stagger` elements. Stagger children get `animation-delay` increments.

### `properties.html` — map page (selectively rewritten in redesign)

**Removed from old version:** topbar, "LUXURY DIVISION" / `lux-nav`, old label/input filter bar, old auth modal references, DM Serif Display + DM Sans fonts.

**New structure:**

- **Nav** — `.a-nav` identical in structure to index.html nav (logo dot + centered links + actions). Inline CSS block at top of `<style>` tag in file.

- **Filter bar** — `.filter-bar` sticky header below nav. Contains `.filter-chips` row of pill-button chips: Location (globe icon), Loan type (tag icon), Price ($ icon), Beds (bed icon), and an Assumable-only toggle chip (active by default, `filterState.assumableOnly = true`).

- **Secondary row** — `.secondary-row` with `#secondary-count` (e.g. "10 homes · rates 2.625–4.5%") and an off-market nudge link.

- **Main layout** — `.layout` with `display: flex`:
  - **Sidebar** — `.sidebar { width: 540px }` (previously 380px), scrollable, fixed height (`100vh - nav - filter - secondary`). Contains `#card-grid`.
  - **Map** — `.map-wrap` flex 1, `#map` fills it. Overlaid:
    - `.map-controls-tl` (top-left): rate range pill + "Search this area" button.
    - `.map-zoom` (bottom-right): `+` / `−` buttons wired to `map.setZoom()`.
    - `#map-pop` (bottom-left, `.map-pop { position: absolute; bottom: 24px; left: 24px; width: 300px }`) — MapPopCard.

- **Card grid** — `#card-grid` uses `.card-grid { display: grid; grid-template-columns: repeat(2,1fr); gap: 12px }`. Cards built by `buildSearchCard(l)`.

  SearchCard structure (`.sc` classes):
  - `.sc-img { aspect-ratio: 4/3 }` — image or placeholder
  - `.sc-tag-va` / `.sc-tag-fha` — loan type badge
  - `.sc-heart` — favorite button (top-right of image)
  - `.sc-price-row`: `.sc-price` (serif 19px) + `.sc-monthly` (navy, assumed payment)
  - `.sc-addr`, `.sc-city`, `.sc-meta` (beds · baths · sqft)
  - `.sc-actions` — appears only on selected card: Tour + Details buttons
  - Selected state: `border: 2px solid var(--ink); box-shadow: var(--shadow-md)`

- **Off-market teaser** — `.offmarket-teaser { grid-column: span 2 }`, inserted after index 6 in card list.

- **MapPopCard** — rendered into `#map-pop` by `renderMapPopCard(l)`. Shows 16:9 image, loan tag + rate badge, address, monthly payment, "View details" button (opens modal) and X close. `window._popListing` holds current pop listing.

- **Map markers** — `.price-pill` with colored dot: `.price-pill-dot-va { background: var(--navy) }` / `.price-pill-dot-fha { background: var(--terra) }`. Selected marker gets `.selected` class.

- **Property Detail Modal** — preserved from old version (Zillow-style overlay):
  - Photo gallery (5 faked images, arrows + dots + counter, fade transition)
  - Header: serif price, address, bed/bath/sqft pills, assumable badge + loan tag
  - About section with fake description (3 rotating templates)
  - Features grid (8 deterministic fake features)
  - Property Details accordion (6 sections: Parking, Interior, Exterior, Utilities, Location, Public Facts)
  - Payment Calculator: live slider 5–20% down, assumed vs market rate, savings banner
  - Tour Scheduler: next 7 days as pills, 9am–6pm 30-min slots, confirm → success state
  - Contact Agent button → lead capture modal
  - Modal tokens updated to new design system variables

- Leads saved to `localStorage` under key `assumableLeads`
- Page is fully viewport-locked (no page scroll); only sidebar scrolls

### `styles.css` — styles for `properties.html` only (fully rewritten in redesign)

All old Luxury Division styles replaced. New design tokens as `:root` variables (mirrored from index.html inline styles). Key rule groups:
- `.a-nav`, `.a-nav-logo`, `.a-nav-dot`, `.a-nav-links`, `.a-nav-actions`
- `.filter-bar`, `.filter-chips`, `.filter-chip`, `.filter-chip-active`
- `.secondary-row`, `.layout`, `.sidebar`, `.card-grid`
- `.sc`, `.sc-img`, `.sc-tag-va`, `.sc-tag-fha`, `.sc-heart`, `.sc-body`, `.sc-price-row`, `.sc-price`, `.sc-monthly`, `.sc-addr`, `.sc-city`, `.sc-meta`, `.sc-actions`, `.sc-btn-tour`, `.sc-btn-details`, `.sc.selected`
- `.offmarket-teaser`
- `.map-wrap`, `.map-controls-tl`, `.map-pill`, `.map-pill-btn`, `.map-zoom`, `.map-zoom-btn`
- `.price-pill`, `.price-pill-dot`, `.price-pill-dot-va`, `.price-pill-dot-fha`, `.price-pill.selected`
- `.map-pop`, `.map-pop-img`, `.map-pop-body`, `.map-pop-close`
- All detail modal styles (updated to new tokens)

`index.html` has all its own styles inline — `styles.css` is not loaded by it.

### `app.js` — map, markers, sidebar, filters, modals (selectively updated)

Key changes in redesign:
- `filterState.assumableOnly = true` — default filter on
- `let selectedListingId = null` — module-level selection state
- `renderMarkers()` — inserts colored dot span inside pill (VA = navy dot, FHA = terra dot)
- `buildSearchCard(l)` — new card builder using `.sc` classes, 4:3 image, loan tag, heart, selected state with action buttons
- `buildListingCard` aliased to `buildSearchCard` for any legacy references
- `renderSidebar(visible)` — targets `#card-grid`, builds 2-col grid, inserts off-market teaser after index 6, re-renders on selection change
- `openPopup(l)` — sets `selectedListingId`, calls `renderSidebar` + `highlightMarker` + `renderMapPopCard` (no longer opens modal directly from marker click)
- `highlightMarker(id)` — toggles `.selected` class on marker pill content elements
- `renderMapPopCard(l)` — builds HTML into `#map-pop`, sets `window._popListing = l`, shows the div
- `highlightCard(id)` — scrolls `.sc[data-id]` into view
- `render()` — updates `#secondary-count` with count + min rate range from visible listings
- `buildOffMarketTeaser()` — returns `.offmarket-teaser` div

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

**Gating task (blocks all backend work):**
- **Validate Cotality Property API V2 against AZ data** — sign up for the 30-day trial at developer.corelogic.com, run `mortgage/current` against 5–10 known FHA/VA Maricopa County addresses, confirm `loanTypeCode` populates, decide whether `interestRate` is usable or whether document-image OCR is mandatory. See "Current blocker" section.

**Static-site polish (can ship independently of data backend):**
- **Review + ship redesign branch** — confirm visuals match design handoff, then push `redesign` to remote and set as Vercel production
- Add ARMLS / Fair Housing / broker-attribution / data-timestamp compliance to footer (see "Compliance" section) before launch — missing today
- Wire Google Maps key securely (currently exposed in HTML — fine for local dev, must proxy for production; also: Mapbox migration is in the target stack, decide whether to migrate now or after rebuild)
- Wire lead captures (`assumableLeads` in localStorage) to a CRM webhook
- Wire `submitOffMarket()` calls (hero + funnel step 6 + investor section) to a real backend
- SEO: structured data (schema.org/RealEstateListing), meta tags, analytics

**Backend rebuild (gated on Cotality validation):**
- Stand up Supabase, write migration for `listings` / `assumable_flags` / `verifications` (ask user before committing — schema not final)
- ARMLS Spark API access via Jeff Salazar (sponsoring broker); build hourly sync worker
- Cotality pipeline: property search → mortgage/current → (OCR fallback) → write `assumable_flags`
- Freddie Mac PMMS weekly fetch + rate-estimate fallback
- Migrate frontend to Next.js 15 + Tailwind + Mapbox, replace `listings.json` with Supabase queries
- Add real user auth (replace dormant hardcoded credentials) — if and when we actually need an account tier (the public IDX surface should remain login-free)
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
