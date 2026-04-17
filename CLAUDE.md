# Assumable Homes — Claude notes

## Project status (as of 2026-04-17, updated same day)

What is built and working (static site, run with `python3 -m http.server 8000`):

- `index.html` — fully rebuilt landing page replicating assumablehomesaz.com design
  - Top announcement bar (Jeff Salazar, Scottsdale AZ, phone)
  - Sticky nav with Sign In / profile dropdown (see Auth below)
  - Hero with parallax background, entry animations, pulsing green dot
  - Region cards: Phoenix, Mesa, Chandler (hover zoom)
  - "What is an assumable mortgage" section with SVG circular diagram
  - Three benefit cards (%, $, savings icons — all SVG, no emoji)
  - Dark "certified properties" section with two auto-scrolling carousels
    - Carousels pause individually on hover (rows are independent)
    - Data fetched live from `listings.json` — only assumable listings shown
  - "How it works" section (ghost numbers + SVG step icons)
  - Win-win section: Buyers / Sellers / Investors cards
  - Agent section (Jeff Salazar, dark bg, contact pill)
  - FAQ accordion + "Book a 15 min call" card
  - Second CTA hero + footer
  - Scroll-reveal animations on all major sections

- `properties.html` — map page (Google Maps JS API, AdvancedMarkerElement)
  - Filter bar: min/max price, min beds, assumable-only toggle
  - Left sidebar: listing cards rendered from `listings.json`
  - Map with price-pill markers (green = assumable, black = regular)
  - Click card or marker → opens rich **Property Detail Modal** (Zillow-style overlay)
    - Photo gallery: 5 faked images per listing, arrows + dots + counter, fade transition
    - Header: serif price display, address, bed/bath/sqft pills, assumable badge + loan tag
    - About section: fake description (3 rotating templates, mentions rate if assumable)
    - Features grid: 8 deterministic fake features per listing
    - Property Details accordion: 6 sections (Parking, Interior, Exterior, Utilities, Location, Public Facts) with fake but realistic data
    - Payment Calculator: live slider (5–20% down), recalculates assumed vs market rate, savings banner showing monthly + 30-yr total savings
    - Tour Scheduler: next 7 days as pills (formatted M/D), 9am–6pm in 30-min slots, confirm → success state
    - Contact Agent button → opens existing lead capture modal
    - Fonts: DM Serif Display (price/amounts) + DM Sans (body) via Google Fonts
  - Leads saved to `localStorage` under key `assumableLeads`

- `listings.json` — single source of truth for both pages (16 listings total)
  - Fields: id, address, price, beds, baths, sqft, lat, lng, isAssumable, photo,
            rate, marketRate, assumedMonthly, marketMonthly, downPayment, loanType
  - 10 original Phoenix listings + 6 new assumable listings (Mesa, Chandler, more Phoenix)
  - Adding fields here automatically updates both pages

- `app.js` — handles map init, markers, sidebar render, filters, lead modal, `renderPreview()`

- `styles.css` — styles for `properties.html` only
  - `index.html` has all its own styles inline (to avoid coupling)

## Auth system (index.html only, temporary)

- Hardcoded user: username `Kamal`, password `Test123`
- Account name: Kamal Nallandighal — avatar shows initials "KN"
- Session stored in `sessionStorage` (clears on tab close)
- Nav shows "Sign In" button when logged out; profile circle + dropdown when logged in
- To add more users: extend the `USERS` array in the `<script>` block in `index.html`
- To replace with real auth later: swap `USERS` lookup + `sessionStorage` for a fetch to an auth endpoint

## UMe — intentionally excluded

The original site has a "We proudly partner with UMe" section. This is excluded by design. Do not add it back without asking the user.

## Open decisions / next tasks

- Wire Google Maps key securely (currently exposed in HTML — fine for local dev, must proxy for production)
- Replace `listings.json` with a live API / Supabase / MLS feed (keep same field shape)
- Wire lead captures (`assumableLeads` in localStorage) to a CRM webhook
- Add real user auth (replace hardcoded credentials)
- SEO: structured data (schema.org/RealEstateListing), meta tags, analytics
- Multilingual support: add `lang` param to Claude prompts when needed

---

Purpose
- Central notes for using Claude (or other Anthropic models) with the Assumable Homes project.
- Capture recommended prompts, use-cases, safety considerations, and integration tips for generating listing copy, meta descriptions, and social blurbs.

When to call Claude
- Generate short listing descriptions (50–140 chars) from listing fields.
- Create SEO-friendly title and meta description for each property page.
- Produce social captions (Instagram / Facebook / X) given a listing’s `address`, `price`, `beds`, `baths`, `sqft`, and public remarks.
- Rewriting seller-provided copy to be concise and buyer-focused.

Recommended prompts
- Short listing headline (one line)

  Prompt:
  "Write a concise, attention-grabbing headline (<= 60 characters) for a home listing using this data: address: {{address}}, price: {{price}}, beds: {{beds}}, baths: {{baths}}, sqft: {{sqft}}. Keep it direct and buyer-focused."

- SEO title + meta description

  Prompt:
  "Create an SEO title (<= 60 chars) and a meta description (<= 155 chars) for a property with the following details: {{address}}, price {{price}}, {{beds}} bd, {{baths}} ba, {{sqft}} sqft. Include the city and the phrase 'assumable loan' when appropriate. Return JSON: {\"title\":..., \"description\":...}."

- Social caption (Instagram)

  Prompt:
  "Write an Instagram caption (max 2200 chars, keep it under 300 chars recommended) highlighting a unique selling point of this property: {{publicRemarks}}. Include a short CTA like 'DM for a tour' and 3 short hashtags. Return plain text."

- Short property summary for cards (1–2 sentences)

  Prompt:
  "Produce a 1–2 sentence summary for a property card using: price: {{price}}, beds: {{beds}}, baths: {{baths}}, sqft: {{sqft}}, address: {{address}}. Keep it under 120 characters."

Safety & content guidelines
- Do NOT include personal data beyond property contact handles provided by the user.
- Avoid creating legal, financial, or mortgage advice. When asked about loan terms or assumability specifics, respond with a short disclaimer: 'Contact the listing agent or lender for details. This is not financial advice.'
- Sanitize any user-provided public remarks to remove phone numbers, emails, or PII before sending to Claude.

Integration tips
- Keep prompts short and deterministic. Use explicit length limits and JSON-return instructions when the frontend expects structured data.
- Run Claude calls server-side (Edge Function) to protect the API key. Return only the sanitized outputs to the client.
- Cache generated content in a small local store (or in listings.json) to avoid re-calling the model on each page load.

Cost & performance
- Use shorter models or lower temperature for short text generation (title, meta). Use higher temperature or longer-context models only when generating creative social captions.
- Batch requests when generating multiple captions (e.g., generate summaries for 10 featured listings in one call) to reduce per-request overhead.

Example server-side usage (pseudo)

1. Receive listing data from frontend.
2. Sanitize fields (remove PII, trim long remarks).
3. Build prompt as per above templates.
4. Call Claude Edge function with model settings: temperature 0.3 for SEO/title, 0.6 for captions.
5. Validate and store returned text.
6. Return the sanitized result to the client.

Notes
- If we later add multilingual support, include a `lang` parameter in prompts.
- Log prompt + trimmed response for auditing, but never persist raw user PII.
