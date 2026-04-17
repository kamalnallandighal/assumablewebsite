# Project specs — Assumable Homes (front-end)

Summary
- Goal: Build a modern, responsive marketing site for Assumable Homes with two main views:
  1) Landing/home page (marketing + featured properties)
  2) Properties page — interactive map + sidebar with filters and listing cards (Map-first UX)
- Minimal tech: static HTML/CSS/JS site (currently implemented). Future: migrate to a small SPA or static site generator if needed.

Repository layout (current)
- `index.html` — landing page (hero, features, partners, featured listing previews)
- `properties.html` — dedicated map page with filters, sidebar, map container
- `styles.css` — global styles, responsive rules
- `app.js` — map initialization, listing rendering, filters, marker creation
- `listings.json` — sample listing data for local dev

Pages & UX
- Home (`index.html`)
  - Hero with search box
  - Region cards (Phoenix, Mesa, Chandler)
  - Short explainer about assumable mortgages
  - Featured listings preview populated by `app.js` from `listings.json`
  - 'Properties' nav item links to `properties.html`

- Properties (`properties.html`)
  - Top filter bar: `minPrice`, `maxPrice`, `minBeds`, `assumableOnly` toggle
  - Left sidebar: scrollable list of listing cards (photo, price, address, meta, assumable chip)
  - Right/main: Google Map (Google Maps JS API v3) with custom price marker pills
  - Click card → pan map + open info window. Click marker → open info window + highlight card.

Data
- `listings.json` sample file (used for local dev); fields:
  - `id`, `address`, `price`, `beds`, `baths`, `sqft`, `lat`, `lng`, `isAssumable`, `photo`
- Future: replace JSON with an API endpoint (Netlify function / Supabase / other). Keep same field names/shape for minimal changes.

Decision (current):
- We'll keep `listings.json` as the local static data source for this repository and local/dev hosting. The production source is likely a third-party MLS and will be integrated later. Keeping a static JSON makes the site simple to run locally and enables easy client-side filtering and map rendering.

Leads / contact capture (temporary):
- Requirement: leads will ultimately be sent to the client's CRM, separate from this project. For now, we provide a minimal local capture approach.
- Implementation: a contact modal is available on the `properties.html` listing info window. Submissions are saved to `localStorage` under the key `assumableLeads` and logged to the console. This preserves data locally and provides a simple payload that can be exported or forwarded to a CRM later.
- Payload sample:
  {
    "listingId": "1",
    "listingAddress": "1820 N Central Ave, Phoenix, AZ 85004",
    "name": "Jane Buyer",
    "email": "jane@example.com",
    "phone": "",
    "message": "Would like a tour",
    "createdAt": "2026-04-16T15:30:00.000Z"
  }

Upgrade path:
- To wire leads to a CRM, replace `saveLeadPayload()` in `app.js` with a `fetch()` call to the CRM intake webhook or to a small serverless function that validates and forwards the lead (e.g., Formspree, Netlify Function, Vercel Serverless, or Supabase Edge Function). The modal and `assumableLeads` localStorage key provide a consistent payload shape to forward.

Map integration
- Uses Google Maps JavaScript API (marker library + AdvancedMarkerElement)
- Marker content currently uses `.price-pill` inner HTML (styled in `styles.css`)
- InfoWindow uses a compact listing view (`.iw`) with photo + price + meta
- Map initialization in `app.js` via `initMap()` callback from the Google Maps script

Design & Styling
- Responsive grid for the landing cards and a two-column layout for the properties page
- Price pills: bold white text, pill shape; green background for assumable listings, black background for regular
- Sidebar cards: image left, text right, `Assumable` chip when `isAssumable` true

Accessibility
- Use semantic elements where possible (`header`, `main`, `aside`, `section`)
- Add `alt` text for images (currently `photo` images use empty alt—plan to add descriptive alt text)
- Ensure color contrast for pill text (white on green/black is acceptable)

Dev & run instructions
- Start a static server at the project root for local testing (we use Python's http.server for convenience):

```bash
cd "path/to/test-map"
python3 -m http.server 8000
# then open http://localhost:8000/index.html
```

- Files to edit: `index.html`, `properties.html`, `styles.css`, `app.js`, `listings.json`

Testing
- Manual test checklist:
  - Open `properties.html` and verify markers appear and match `listings.json` locations
  - Use filters and confirm sidebar + map update accordingly
  - Click marker and sidebar card to ensure popups and highlighting work
  - Verify mobile responsiveness (sidebar stacks under map)

Deployment
- This is a static site; host on Vercel, Netlify, or GitHub Pages.
- When deploying, replace any hardcoded API keys with env-managed host config or a minimal proxy that injects keys server-side (for production protect the API key).

Open questions / decisions needed
1. Map API key: do we use the live Google API key currently in `index.html` (exposed) or switch to a server-side proxy/host-managed key? For production we should NOT publish private keys in public repos.
2. Data source: should listings be fetched from a remote API (Supabase / headless CMS / REST) instead of `listings.json`? If yes, which provider and what auth requirements?
3. UX polish: do you want the landing page to match the live site's exact typography & spacing (fonts, custom icons) or keep the current system fonts?
4. SEO: Are there specific meta tags, structured data, or analytics to include (we saw schema.org in the live site)?
5. Contact & lead flow: Should clicking a listing provide a contact form / agent lead capture widget? If so, what fields and where should leads be stored (email only, Google Forms, Supabase)?

Next tasks I can do (pick any)
- Wire a simple backend (Supabase or static JSON hosted) to serve real listings.
- Replace the exposed Google Maps key with an environment-secured proxy setup.
- Improve listing card accessibility (add `alt` text, ARIA attributes).
- Add integration with Claude for automated listing copy (I already added `CLAUDE.md`).

Questions for you
- Which data source do you want for listings in production (Supabase, custom API, third-party MLS, or remain static)?
- Should the Google Maps key be considered public (we can keep current) or do you want me to add instructions for a secure key injection during deploy?
- Any analytics / tracking (Google Analytics, Plausible, etc.) you want added now?

