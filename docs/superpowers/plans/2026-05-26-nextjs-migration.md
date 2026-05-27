# Next.js Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate the static Assumable Homes site (`index.html`, `properties.html`, `styles.css`, `app.js`, `listings.json`) to a Next.js 15 + TypeScript + Tailwind app on branch `next-rebuild`, with feature parity for the redesigned UI plus a server-side Cotality probe API route ready for trial validation.

**Architecture:** Next.js 15 App Router. Existing CSS design tokens (`--ink`, `--terra`, `--navy`, `--ok`, etc.) move into Tailwind theme extension so the JSX uses utility classes (`bg-ink`, `text-terra`). Fonts (Inter + Source Serif 4) loaded via `next/font/google`. Mapbox GL replaces Google Maps. `listings.json` stays as a typed fixture imported from `lib/listings/data` until Supabase is wired. All Cotality work runs in server-only `lib/cotality/` modules behind `/api/cotality/probe` so client never sees credentials.

**Tech Stack:** Next.js 15 (App Router) · React 19 · TypeScript 5 · Tailwind CSS 3 · Mapbox GL JS · vitest + @testing-library/react (for logic/state) · zod (env + API validation)

---

## Pre-flight (read before Task 1)

**Current branch:** `redesign` with uncommitted mobile-responsive work (`M CLAUDE.md app.js index.html properties.html styles.css`). Before Task 1, commit that work on `redesign` so the migration branches off a clean state.

**Existing source files used as port references:**
- `index.html` lines 377–667 — markup (nav, hero, funnel card, how, featured, dual band, FAQ, Jeff, footer)
- `index.html` lines 668–1058 — funnel state machine + `submitOffMarket` + listing card renderer
- `properties.html` lines 1–388 — nav + filter bar + layout shell + detail modal styles
- `styles.css` — all properties-page styles (will be ported into Tailwind theme + component classNames)
- `app.js` — Google Maps init, markers, sidebar, filters, modal, payment calculator, tour scheduler
- `listings.json` — 16 listings, canonical fixture shape

**Design tokens to preserve (already in CLAUDE.md):**
```
--ink: #0F1623   --navy: #2B4072   --terra: #D35932   --terra-soft: #FDD8CC
--terra-ink: #631800   --ok: #1E6F5C   --cream: #F4F3F2   --paper: #FFFFFF
--line: #E5E3E1   --line-2: #D4D1CE   --muted: #888   --muted-2: #999
```

**Branch strategy:** Work on `next-rebuild` branched from `redesign`. The static HTML files stay in the working tree until Task 18 (final cleanup), so Vercel preview deploys keep working. We move Next.js scaffolding into the repo root and let Next.js take over `index.html` and `properties.html` routes via `app/page.tsx` and `app/properties/page.tsx`; the static `.html` files become unused and get deleted at the end.

**Out of scope (do not implement in this plan):**
- Real ARMLS sync
- Supabase schema or queries (only client *stub* with env wiring)
- Lead capture webhooks
- Auth replacement (the dormant Sign In / Get Started buttons stay static)
- Replacing `listings.json` with live data
- Hamburger menu for mobile (current redesign hides nav links ≤720px; preserve that)

---

## File Structure

```
.
├── app/
│   ├── layout.tsx              # Root layout: fonts, body, global Tailwind, ARMLS-compliance footer wiring point
│   ├── page.tsx                # Landing page (index.html port)
│   ├── properties/
│   │   └── page.tsx            # Properties map page (properties.html port)
│   ├── api/
│   │   └── cotality/
│   │       └── probe/route.ts  # POST: runs search→mortgage/current→doc-image pipeline on test addresses
│   └── globals.css             # Tailwind base + a handful of utilities that don't fit Tailwind cleanly
├── components/
│   ├── nav/
│   │   └── Nav.tsx             # Shared nav for both pages
│   ├── landing/
│   │   ├── Hero.tsx
│   │   ├── FunnelCard.tsx      # Outer card shell + progress bar + nav buttons
│   │   ├── funnel/
│   │   │   ├── StepCity.tsx
│   │   │   ├── StepPrice.tsx
│   │   │   ├── StepBeds.tsx
│   │   │   ├── StepLoan.tsx
│   │   │   ├── StepUse.tsx
│   │   │   ├── StepResult.tsx
│   │   │   └── useFunnel.ts    # Reducer + hook owning funnel state
│   │   ├── HowItWorks.tsx
│   │   ├── FeaturedListings.tsx
│   │   ├── DualBand.tsx        # Investor + off-market combined section
│   │   ├── JeffSection.tsx
│   │   ├── Faq.tsx
│   │   └── Footer.tsx
│   └── properties/
│       ├── FilterBar.tsx
│       ├── filters/
│       │   ├── ChipLocation.tsx
│       │   ├── ChipLoan.tsx
│       │   ├── ChipPrice.tsx
│       │   ├── ChipBeds.tsx
│       │   └── useFilters.ts   # Filter state hook + visible-listings derivation
│       ├── Sidebar.tsx
│       ├── SearchCard.tsx
│       ├── OffMarketTeaser.tsx
│       ├── PropertiesMap.tsx   # Mapbox GL wrapper (client-only)
│       ├── MapPopCard.tsx
│       ├── DetailModal.tsx     # Big Zillow-style modal — gallery, calculator, tour scheduler
│       └── LeadModal.tsx
├── lib/
│   ├── listings/
│   │   ├── types.ts            # Listing type
│   │   ├── data.ts             # imports + types listings.json
│   │   └── filters.ts          # applyFilters(listings, filterState) → visible listings
│   ├── cotality/
│   │   ├── env.ts              # zod-validated client_id/secret from process.env
│   │   ├── auth.ts             # OAuth token fetch + in-memory cache
│   │   ├── client.ts           # search / mortgage-current / document-image
│   │   ├── types.ts            # MortgageDetail, PropertySearchResult, etc. (only fields we use)
│   │   └── probe.ts            # Pipeline: address → clipId → mortgage → (optional doc image)
│   └── supabase/
│       ├── env.ts              # zod-validated URL + anon key (optional — empty values allowed pre-trial)
│       └── client.ts           # createClient stub, exported but not yet used
├── public/
│   ├── jeff.jpeg               # moved from repo root
│   └── listings.json           # moved from repo root for static reference
├── scripts/
│   └── (empty for now)
├── docs/
│   └── superpowers/
│       └── plans/
│           └── 2026-05-26-nextjs-migration.md  # this file
├── tests/
│   ├── lib/
│   │   ├── listings.filters.test.ts
│   │   ├── cotality.auth.test.ts
│   │   └── cotality.client.test.ts
│   └── components/
│       └── landing/
│           └── funnel.useFunnel.test.ts
├── .env.local.example          # template (committed)
├── .env.local                  # actual creds (gitignored)
├── .gitignore
├── next.config.mjs
├── tailwind.config.ts
├── postcss.config.mjs
├── tsconfig.json
├── vitest.config.ts
├── package.json
├── CLAUDE.md                   # preserved
├── README.md                   # updated at end
├── index.html                  # DELETED in Task 18
├── properties.html             # DELETED in Task 18
├── styles.css                  # DELETED in Task 18
├── app.js                      # DELETED in Task 18
├── listings.json               # MOVED to public/ in Task 4
└── jeff.jpeg                   # MOVED to public/ in Task 4
```

---

## Task 1: Pre-flight commit + branch + Next.js scaffold

**Files:**
- Create: `package.json`, `tsconfig.json`, `next.config.mjs`, `postcss.config.mjs`, `tailwind.config.ts`, `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, `.gitignore`
- Modify: none (existing files untouched this task)

- [ ] **Step 1: Commit pending mobile-responsive work on `redesign`**

```bash
cd /Users/knallandighal/Documents/Websites/assumable
git status
git add CLAUDE.md app.js index.html properties.html styles.css
git commit -m "Mobile responsiveness pass for redesign branch"
```

Expected: clean working tree on `redesign`.

- [ ] **Step 2: Create and switch to `next-rebuild` branch**

```bash
git checkout -b next-rebuild
```

- [ ] **Step 3: Initialize package.json**

Create `/Users/knallandighal/Documents/Websites/assumable/package.json`:

```json
{
  "name": "assumable",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "dependencies": {
    "next": "15.0.3",
    "react": "19.0.0",
    "react-dom": "19.0.0",
    "mapbox-gl": "^3.8.0",
    "zod": "^3.23.8"
  },
  "devDependencies": {
    "@types/mapbox-gl": "^3.4.0",
    "@types/node": "^22.9.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "@testing-library/react": "^16.0.1",
    "@testing-library/jest-dom": "^6.6.3",
    "autoprefixer": "^10.4.20",
    "eslint": "^9.15.0",
    "eslint-config-next": "15.0.3",
    "jsdom": "^25.0.1",
    "postcss": "^8.4.49",
    "tailwindcss": "^3.4.15",
    "typescript": "^5.6.3",
    "vitest": "^2.1.5"
  }
}
```

- [ ] **Step 4: Install dependencies**

```bash
npm install
```

Expected: `node_modules/` populated, `package-lock.json` created. No peer-dep errors.

- [ ] **Step 5: Create `tsconfig.json`**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 6: Create `next.config.mjs`**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: { remotePatterns: [] }
};
export default nextConfig;
```

- [ ] **Step 7: Create `.gitignore`**

```
node_modules/
.next/
out/
.env.local
.env*.local
.DS_Store
*.log
coverage/
.vercel
```

- [ ] **Step 8: Create minimal `app/layout.tsx` and `app/page.tsx`**

`app/layout.tsx`:
```tsx
import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'Assumable Homes',
  description: 'FHA & VA assumable mortgage listings in Arizona.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

`app/page.tsx`:
```tsx
export default function Home() {
  return <main className="p-8">Migration scaffold — Task 1.</main>;
}
```

`app/globals.css`:
```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

- [ ] **Step 9: Run dev server and verify**

```bash
npm run dev
```

Expected: server starts on http://localhost:3000, page shows "Migration scaffold — Task 1.". Kill the server.

- [ ] **Step 10: Commit**

```bash
git add package.json package-lock.json tsconfig.json next.config.mjs .gitignore app/ postcss.config.mjs tailwind.config.ts
git commit -m "Scaffold Next.js 15 + TS + Tailwind on next-rebuild"
```

---

## Task 2: Tailwind theme — design tokens, fonts, typography

**Files:**
- Create: `tailwind.config.ts`, `postcss.config.mjs`
- Modify: `app/layout.tsx`, `app/globals.css`

- [ ] **Step 1: Create `postcss.config.mjs`**

```js
export default {
  plugins: { tailwindcss: {}, autoprefixer: {} }
};
```

- [ ] **Step 2: Create `tailwind.config.ts` with design tokens**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#0F1623',
        navy: '#2B4072',
        terra: { DEFAULT: '#D35932', soft: '#FDD8CC', ink: '#631800' },
        ok: '#1E6F5C',
        cream: '#F4F3F2',
        paper: '#FFFFFF',
        line: { DEFAULT: '#E5E3E1', 2: '#D4D1CE' },
        muted: { DEFAULT: '#888', 2: '#999' }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        serif: ['var(--font-source-serif)', 'Georgia', 'serif']
      },
      boxShadow: {
        sm: '0 1px 2px rgba(15,22,35,0.04)',
        md: '0 4px 12px rgba(15,22,35,0.08)',
        lg: '0 12px 32px rgba(15,22,35,0.12)'
      },
      borderRadius: { card: '12px', pill: '999px' }
    }
  },
  plugins: []
};

export default config;
```

- [ ] **Step 3: Wire fonts in `app/layout.tsx`**

```tsx
import './globals.css';
import type { ReactNode } from 'react';
import { Inter, Source_Serif_4 } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const sourceSerif = Source_Serif_4({
  subsets: ['latin'],
  variable: '--font-source-serif',
  display: 'swap'
});

export const metadata = {
  title: 'Assumable Homes',
  description: 'FHA & VA assumable mortgage listings in Arizona.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${sourceSerif.variable}`}>
      <body className="font-sans bg-paper text-ink antialiased">{children}</body>
    </html>
  );
}
```

- [ ] **Step 4: Sanity-check `app/page.tsx` renders tokens**

```tsx
export default function Home() {
  return (
    <main className="p-8 space-y-4">
      <h1 className="font-serif text-5xl text-ink">Assumable Homes</h1>
      <p className="text-muted">Design tokens wired.</p>
      <button className="bg-terra text-white px-4 py-2 rounded-pill">Find your home</button>
    </main>
  );
}
```

- [ ] **Step 5: Verify in browser**

```bash
npm run dev
```

Expected: ink-colored serif heading, terra pill button, Inter body font. Confirm tokens visually, then kill server.

- [ ] **Step 6: Commit**

```bash
git add tailwind.config.ts postcss.config.mjs app/layout.tsx app/page.tsx
git commit -m "Wire Tailwind theme with design tokens, Inter + Source Serif 4 fonts"
```

---

## Task 3: Env + Cotality/Supabase stubs (no calls yet, just typed loaders)

**Files:**
- Create: `.env.local.example`, `lib/cotality/env.ts`, `lib/supabase/env.ts`, `lib/supabase/client.ts`

- [ ] **Step 1: Create `.env.local.example`**

```
# Cotality Property API V2 — developer.corelogic.com trial (100 calls/day cap)
COTALITY_CLIENT_ID=
COTALITY_CLIENT_SECRET=

# Mapbox — publishable token (safe to ship to client when domain-scoped)
NEXT_PUBLIC_MAPBOX_TOKEN=

# Supabase — leave blank until project is provisioned
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

- [ ] **Step 2: Create `lib/cotality/env.ts`**

```ts
import { z } from 'zod';

const schema = z.object({
  COTALITY_CLIENT_ID: z.string().min(1, 'COTALITY_CLIENT_ID is required'),
  COTALITY_CLIENT_SECRET: z.string().min(1, 'COTALITY_CLIENT_SECRET is required')
});

export function loadCotalityEnv() {
  const parsed = schema.safeParse({
    COTALITY_CLIENT_ID: process.env.COTALITY_CLIENT_ID,
    COTALITY_CLIENT_SECRET: process.env.COTALITY_CLIENT_SECRET
  });
  if (!parsed.success) {
    throw new Error(`Cotality env missing: ${parsed.error.issues.map(i => i.path.join('.')).join(', ')}`);
  }
  return parsed.data;
}
```

- [ ] **Step 3: Create `lib/supabase/env.ts`** (tolerates blanks — only enforces when called)

```ts
import { z } from 'zod';

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional()
});

export function loadSupabaseEnv() {
  return schema.parse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  });
}
```

- [ ] **Step 4: Create `lib/supabase/client.ts`** (stub, no real client yet)

```ts
import { loadSupabaseEnv } from './env';

export function getSupabaseClient() {
  const env = loadSupabaseEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    throw new Error('Supabase not configured yet — wire env after pipeline validation.');
  }
  throw new Error('Supabase client not implemented yet. See plan task post-validation.');
}
```

- [ ] **Step 5: Commit**

```bash
git add .env.local.example lib/cotality/env.ts lib/supabase/
git commit -m "Add env loaders for Cotality (required) and Supabase (stub, optional)"
```

---

## Task 4: Listings fixture as typed data module

**Files:**
- Create: `lib/listings/types.ts`, `lib/listings/data.ts`, `tests/lib/listings.data.test.ts`, `vitest.config.ts`
- Move: `listings.json` → `public/listings.json`
- Move: `jeff.jpeg` → `public/jeff.jpeg`

- [ ] **Step 1: Move static assets into `public/`**

```bash
mkdir -p public
git mv listings.json public/listings.json
git mv jeff.jpeg public/jeff.jpeg
```

- [ ] **Step 2: Create `lib/listings/types.ts`**

Match the existing `listings.json` shape exactly (see CLAUDE.md "listings.json" section):

```ts
export type LoanType = 'VA' | 'FHA' | 'Conventional';

export interface Listing {
  id: string;
  address: string;
  price: number;
  beds: number;
  baths: number;
  sqft: number;
  lat: number;
  lng: number;
  isAssumable: boolean;
  photo: string | null;
  rate: number;          // assumed-loan rate, decimal e.g. 0.0275
  marketRate: number;    // current market rate, decimal
  assumedMonthly: number;
  marketMonthly: number;
  downPayment: number;
  loanType: LoanType;
}
```

- [ ] **Step 3: Create `lib/listings/data.ts`**

```ts
import raw from '../../public/listings.json';
import type { Listing } from './types';

export const listings: readonly Listing[] = raw as Listing[];

export function findListing(id: string): Listing | undefined {
  return listings.find(l => l.id === id);
}
```

- [ ] **Step 4: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: [],
    globals: true,
    include: ['tests/**/*.test.{ts,tsx}']
  },
  resolve: { alias: { '@': '/' } }
});
```

- [ ] **Step 5: Write fixture sanity test**

`tests/lib/listings.data.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { listings, findListing } from '../../lib/listings/data';

describe('listings fixture', () => {
  it('loads 16 listings', () => {
    expect(listings.length).toBe(16);
  });
  it('every listing has a numeric rate and loanType', () => {
    for (const l of listings) {
      expect(typeof l.rate).toBe('number');
      expect(['VA', 'FHA', 'Conventional']).toContain(l.loanType);
    }
  });
  it('findListing returns the right record', () => {
    const first = listings[0];
    expect(findListing(first.id)?.address).toBe(first.address);
  });
});
```

- [ ] **Step 6: Run test, verify pass**

```bash
npm run test
```

Expected: 3 tests pass.

- [ ] **Step 7: Commit**

```bash
git add public/ lib/listings/ tests/lib/listings.data.test.ts vitest.config.ts
git commit -m "Move static assets to public/, type listings.json as Listing[]"
```

---

## Task 5: Filter logic + tests (port from app.js)

**Files:**
- Create: `lib/listings/filters.ts`, `tests/lib/listings.filters.test.ts`

Source reference: `app.js` `filterState` object + `applyFilters()` (search for `filterState` in `app.js`).

- [ ] **Step 1: Define filter state type and `applyFilters`**

`lib/listings/filters.ts`:
```ts
import type { Listing, LoanType } from './types';

export interface FilterState {
  city: string | null;          // null = all
  loanTypes: LoanType[];        // empty = all
  priceMin: number;
  priceMax: number;
  bedsMin: number;
  bathsMin: number;
  assumableOnly: boolean;       // default true (see CLAUDE.md)
}

export const defaultFilterState: FilterState = {
  city: null,
  loanTypes: [],
  priceMin: 0,
  priceMax: Number.POSITIVE_INFINITY,
  bedsMin: 0,
  bathsMin: 0,
  assumableOnly: true
};

export function applyFilters(listings: readonly Listing[], f: FilterState): Listing[] {
  return listings.filter(l => {
    if (f.assumableOnly && !l.isAssumable) return false;
    if (f.loanTypes.length > 0 && !f.loanTypes.includes(l.loanType)) return false;
    if (l.price < f.priceMin || l.price > f.priceMax) return false;
    if (l.beds < f.bedsMin) return false;
    if (l.baths < f.bathsMin) return false;
    if (f.city && !l.address.toLowerCase().includes(f.city.toLowerCase())) return false;
    return true;
  });
}
```

- [ ] **Step 2: Write tests**

`tests/lib/listings.filters.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { listings } from '../../lib/listings/data';
import { applyFilters, defaultFilterState } from '../../lib/listings/filters';

describe('applyFilters', () => {
  it('default returns only assumable listings', () => {
    const out = applyFilters(listings, defaultFilterState);
    expect(out.every(l => l.isAssumable)).toBe(true);
  });

  it('filters by loanType', () => {
    const out = applyFilters(listings, { ...defaultFilterState, loanTypes: ['VA'] });
    expect(out.every(l => l.loanType === 'VA')).toBe(true);
  });

  it('respects price ceiling', () => {
    const out = applyFilters(listings, { ...defaultFilterState, priceMax: 500_000 });
    expect(out.every(l => l.price <= 500_000)).toBe(true);
  });

  it('respects bedsMin', () => {
    const out = applyFilters(listings, { ...defaultFilterState, bedsMin: 4 });
    expect(out.every(l => l.beds >= 4)).toBe(true);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm run test
```

Expected: 4 new tests pass plus 3 existing = 7 total.

- [ ] **Step 4: Commit**

```bash
git add lib/listings/filters.ts tests/lib/listings.filters.test.ts
git commit -m "Add applyFilters + tests, default assumableOnly=true"
```

---

## Task 6: Funnel state hook + tests

**Files:**
- Create: `components/landing/funnel/useFunnel.ts`, `tests/components/landing/funnel.useFunnel.test.ts`

Source reference: `index.html` lines 668–730 (funnel state) and 896–930 (event handlers).

- [ ] **Step 1: Implement `useFunnel` hook**

`components/landing/funnel/useFunnel.ts`:
```ts
'use client';
import { useReducer, useCallback } from 'react';
import type { LoanType } from '../../../lib/listings/types';

export interface FunnelState {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  city: string | null;
  openToAnywhere: boolean;
  monthlyMax: number;       // dollars
  priceMax: number;
  bedsMin: number;
  bathsMin: number;
  loanType: LoanType | 'both';
  useCase: 'primary' | 'investment' | null;
  email: string;
}

export const initialFunnelState: FunnelState = {
  step: 1,
  city: null,
  openToAnywhere: false,
  monthlyMax: 4000,
  priceMax: 750_000,
  bedsMin: 0,
  bathsMin: 0,
  loanType: 'VA',
  useCase: null,
  email: ''
};

export type FunnelAction =
  | { type: 'next' }
  | { type: 'back' }
  | { type: 'skip' }
  | { type: 'setStep'; step: FunnelState['step'] }
  | { type: 'patch'; patch: Partial<FunnelState> };

function reducer(state: FunnelState, action: FunnelAction): FunnelState {
  switch (action.type) {
    case 'next':
    case 'skip':
      return state.step < 6 ? { ...state, step: (state.step + 1) as FunnelState['step'] } : state;
    case 'back':
      return state.step > 1 ? { ...state, step: (state.step - 1) as FunnelState['step'] } : state;
    case 'setStep':
      return { ...state, step: action.step };
    case 'patch':
      return { ...state, ...action.patch };
  }
}

export function useFunnel() {
  const [state, dispatch] = useReducer(reducer, initialFunnelState);
  const next = useCallback(() => dispatch({ type: 'next' }), []);
  const back = useCallback(() => dispatch({ type: 'back' }), []);
  const skip = useCallback(() => dispatch({ type: 'skip' }), []);
  const setStep = useCallback((step: FunnelState['step']) => dispatch({ type: 'setStep', step }), []);
  const patch = useCallback((p: Partial<FunnelState>) => dispatch({ type: 'patch', patch: p }), []);
  return { state, next, back, skip, setStep, patch };
}
```

- [ ] **Step 2: Write reducer tests**

`tests/components/landing/funnel.useFunnel.test.ts`:
```ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useFunnel } from '../../../components/landing/funnel/useFunnel';

describe('useFunnel', () => {
  it('starts on step 1', () => {
    const { result } = renderHook(() => useFunnel());
    expect(result.current.state.step).toBe(1);
  });

  it('next advances, back rewinds, clamped at edges', () => {
    const { result } = renderHook(() => useFunnel());
    act(() => result.current.next());
    expect(result.current.state.step).toBe(2);
    act(() => result.current.back());
    expect(result.current.state.step).toBe(1);
    act(() => result.current.back());
    expect(result.current.state.step).toBe(1);
  });

  it('patch merges partial state', () => {
    const { result } = renderHook(() => useFunnel());
    act(() => result.current.patch({ city: 'Phoenix', bedsMin: 3 }));
    expect(result.current.state.city).toBe('Phoenix');
    expect(result.current.state.bedsMin).toBe(3);
  });
});
```

- [ ] **Step 3: Run tests**

```bash
npm run test
```

Expected: all funnel tests pass.

- [ ] **Step 4: Commit**

```bash
git add components/landing/funnel/useFunnel.ts tests/components/landing/funnel.useFunnel.test.ts
git commit -m "Add useFunnel reducer hook + tests"
```

---

## Task 7: Nav + Footer components

**Files:**
- Create: `components/nav/Nav.tsx`, `components/landing/Footer.tsx`

Source reference: `index.html` lines 377–394 (nav), `index.html` lines 626–665 (footer).

- [ ] **Step 1: Implement `Nav.tsx`**

Port the markup from `index.html` 377–394 to JSX. Use Tailwind utility classes mapped from the existing inline styles. Mobile: hide `.nav-links` and ghost Sign-in button at `md:` breakpoint down (preserve existing ≤720px rule from CLAUDE.md → Tailwind `hidden md:flex`).

Component scaffold:
```tsx
import Link from 'next/link';

export function Nav() {
  return (
    <nav className="flex items-center justify-between px-6 md:px-10 py-4 bg-paper border-b border-line">
      <Link href="/" className="flex items-center gap-2 font-serif text-2xl text-ink">
        <span>assumable</span>
        <span className="w-2.5 h-2.5 bg-ink inline-block" />
      </Link>
      <div className="hidden md:flex gap-8 text-sm text-ink">
        <Link href="/properties">Property search</Link>
        <Link href="/#how">How it works</Link>
        <Link href="/#off-market">Off-market</Link>
      </div>
      <div className="flex items-center gap-3">
        <button className="hidden md:inline-block text-sm text-ink">Sign in</button>
        <Link
          href="/properties"
          className="bg-terra text-white text-sm px-4 py-2 rounded-pill hover:opacity-90"
        >
          Find your home
        </Link>
      </div>
    </nav>
  );
}
```

(Sign in / Get started remain static per "out of scope".)

- [ ] **Step 2: Implement `Footer.tsx`**

Port from `index.html` 626–665. Three-column on desktop, stacked on mobile (CLAUDE.md `.footer-row` rule). Include placeholder `<p>` for ARMLS / Fair Housing disclaimers — leave a `// TODO(compliance)` comment block referencing CLAUDE.md "Compliance" section (this is the only TODO comment allowed in the plan and it documents a known gap, not deferred work).

- [ ] **Step 3: Verify visually**

Wire `<Nav />` and `<Footer />` into `app/page.tsx` temporarily and run `npm run dev`. Confirm rendering matches `index.html` nav/footer.

- [ ] **Step 4: Commit**

```bash
git add components/nav/ components/landing/Footer.tsx app/page.tsx
git commit -m "Port Nav and Footer to React components"
```

---

## Task 8: Hero section

**Files:**
- Create: `components/landing/Hero.tsx`
- Modify: `app/page.tsx`

Source reference: `index.html` lines 395–441 (hero + 2x2 stats grid; the funnel card on the right is its own task).

- [ ] **Step 1: Implement `Hero.tsx`**

Two-column grid `1fr 1.05fr` with 72px gap on desktop, stack on mobile (≤980px per CLAUDE.md). Left column: h1 (68px Source Serif 4 weight 400) with `<em className="text-navy italic">2–4%</em>` rate callout, supporting copy, terra CTA. Right column: 2x2 stat grid (serif 32px numerals) above the funnel card slot.

Props:
```ts
interface HeroProps {
  funnelSlot: React.ReactNode;   // FunnelCard injected by parent
}
```

Implementation skeleton:
```tsx
export function Hero({ funnelSlot }: HeroProps) {
  return (
    <section className="hero-section px-6 md:px-10 py-12 md:py-20">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.05fr] gap-10 md:gap-[72px] items-start">
        <div>
          <h1 className="font-serif text-[38px] md:text-[68px] leading-[1.05] font-normal">
            Buy a home with a <em className="not-italic text-navy">2–4%</em> mortgage rate.
          </h1>
          {/* supporting copy + CTA — port from index.html 398–432 */}
        </div>
        <div>
          {/* 2x2 stat grid — port from index.html 432–438 */}
          {funnelSlot}
        </div>
      </div>
    </section>
  );
}
```

Use exact h1 copy and supporting copy from `index.html` lines 398–432 verbatim.

- [ ] **Step 2: Render in `app/page.tsx`** with a placeholder funnel slot

```tsx
import { Nav } from '../components/nav/Nav';
import { Footer } from '../components/landing/Footer';
import { Hero } from '../components/landing/Hero';

export default function Home() {
  return (
    <>
      <Nav />
      <Hero funnelSlot={<div className="rounded-card bg-cream p-8">Funnel card placeholder</div>} />
      <Footer />
    </>
  );
}
```

- [ ] **Step 3: Visual check**

```bash
npm run dev
```

Compare to current `index.html` hero at the same viewport sizes. Adjust spacing until parity.

- [ ] **Step 4: Commit**

```bash
git add components/landing/Hero.tsx app/page.tsx
git commit -m "Port Hero section to React"
```

---

## Task 9: Funnel card shell + 6 step components

**Files:**
- Create:
  - `components/landing/FunnelCard.tsx`
  - `components/landing/funnel/StepCity.tsx`
  - `components/landing/funnel/StepPrice.tsx`
  - `components/landing/funnel/StepBeds.tsx`
  - `components/landing/funnel/StepLoan.tsx`
  - `components/landing/funnel/StepUse.tsx`
  - `components/landing/funnel/StepResult.tsx`
- Modify: `app/page.tsx`

Source reference: `index.html` lines 722–895 (`stepCityHTML` through `stepResultHTML`). Each existing `stepXxxHTML()` becomes a step component receiving `{ state, patch }` from `useFunnel`.

- [ ] **Step 1: Implement `FunnelCard.tsx`** — outer shell, progress bar, nav buttons

```tsx
'use client';
import { useFunnel } from './funnel/useFunnel';
import { StepCity } from './funnel/StepCity';
import { StepPrice } from './funnel/StepPrice';
import { StepBeds } from './funnel/StepBeds';
import { StepLoan } from './funnel/StepLoan';
import { StepUse } from './funnel/StepUse';
import { StepResult } from './funnel/StepResult';

const stepLabels = ['City', 'Price', 'Beds/baths', 'Loan', 'Use', 'Matches'];

export function FunnelCard() {
  const funnel = useFunnel();
  const { state, next, back, skip } = funnel;

  return (
    <div className="bg-paper rounded-card shadow-md p-6 md:p-8">
      <div className="inline-block bg-terra text-white text-xs uppercase tracking-wide px-3 py-1 rounded-pill mb-6">
        Find your home
      </div>

      {state.step === 1 && <StepCity state={state} patch={funnel.patch} />}
      {state.step === 2 && <StepPrice state={state} patch={funnel.patch} />}
      {state.step === 3 && <StepBeds state={state} patch={funnel.patch} />}
      {state.step === 4 && <StepLoan state={state} patch={funnel.patch} />}
      {state.step === 5 && <StepUse state={state} patch={funnel.patch} />}
      {state.step === 6 && <StepResult state={state} patch={funnel.patch} />}

      <div className="mt-8 flex items-center gap-2">
        {stepLabels.map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-pill ${i < state.step ? 'bg-ink' : 'bg-line-2'}`}
          />
        ))}
      </div>

      <div className="mt-6 flex items-center justify-between">
        <button onClick={back} disabled={state.step === 1} className="text-sm text-muted disabled:opacity-40">
          Back
        </button>
        <div className="flex gap-3">
          <button onClick={skip} className="text-sm text-muted">Skip</button>
          <button
            onClick={next}
            className="bg-ink text-white text-sm px-5 py-2 rounded-pill"
            disabled={state.step === 6}
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Implement `StepCity.tsx`**

8 city chips in a `grid-cols-2 md:grid-cols-4` grid (matches `.fn-city-grid` per CLAUDE.md) plus "Open to anywhere in AZ" checkbox. Cities + counts from `index.html` 724–737 — derive counts from `listings` at module scope:

```tsx
'use client';
import { listings } from '../../../lib/listings/data';
import type { FunnelState } from './useFunnel';

const cities = ['Phoenix', 'Mesa', 'Chandler', 'Scottsdale', 'Gilbert', 'Tempe', 'Glendale', 'Peoria'];
const counts = Object.fromEntries(
  cities.map(c => [c, listings.filter(l => l.address.toLowerCase().includes(c.toLowerCase())).length])
);

interface Props {
  state: FunnelState;
  patch: (p: Partial<FunnelState>) => void;
}

export function StepCity({ state, patch }: Props) {
  return (
    <div className="space-y-4">
      <h3 className="font-serif text-2xl">Where do you want to live?</h3>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 fn-city-grid">
        {cities.map(c => (
          <button
            key={c}
            onClick={() => patch({ city: c })}
            className={`border rounded-card px-3 py-3 text-sm text-left ${
              state.city === c ? 'border-ink bg-cream' : 'border-line'
            }`}
          >
            <div className="font-medium">{c}</div>
            <div className="text-muted text-xs">{counts[c]} homes</div>
          </button>
        ))}
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={state.openToAnywhere}
          onChange={e => patch({ openToAnywhere: e.target.checked })}
        />
        Open to anywhere in AZ
      </label>
    </div>
  );
}
```

- [ ] **Step 3: Implement `StepPrice.tsx`**

Port from `index.html` 739–782. Two range inputs (monthly max + price max), 56px serif live value with `/mo` suffix (collapses to 36px on phone per CLAUDE.md `.step-price`), and the 8–15% down assumption callout. Wire `onChange → patch({ monthlyMax / priceMax })`.

- [ ] **Step 4: Implement `StepBeds.tsx`**

Port from `index.html` 784–805. Two pill selector rows: beds (1/2/3/4/5+) and baths (1/1.5/2/2.5/3+). Active state uses `border-ink bg-cream`.

- [ ] **Step 5: Implement `StepLoan.tsx`**

Port from `index.html` 807–832. Three cards (VA / FHA / Show both), VA default-selected. Use `.fn-stack-md` class plus `grid-cols-3 md:grid-cols-3`.

- [ ] **Step 6: Implement `StepUse.tsx`**

Port from `index.html` 834–854. Two cards (Primary / Investment-rental).

- [ ] **Step 7: Implement `StepResult.tsx`**

Port from `index.html` 856–894. Show 3 preview listing cards (use `listings.slice(0,3)` filtered to assumable), email input + "Send my matches" button. Submit handler is `console.log` for now (real backend wiring is post-validation).

```tsx
'use client';
import { listings } from '../../../lib/listings/data';
import type { FunnelState } from './useFunnel';
// ...
const preview = listings.filter(l => l.isAssumable).slice(0, 3);
// Submit: console.log({ email: state.email, ...state })
```

- [ ] **Step 8: Wire `<FunnelCard />` into `app/page.tsx` via Hero's `funnelSlot`**

```tsx
<Hero funnelSlot={<FunnelCard />} />
```

- [ ] **Step 9: Visual + functional check**

```bash
npm run dev
```

Click through all 6 steps. Back/Continue/Skip behave correctly. Compare visuals to current `index.html`.

- [ ] **Step 10: Commit**

```bash
git add components/landing/FunnelCard.tsx components/landing/funnel/Step*.tsx app/page.tsx
git commit -m "Port 6-step funnel to React components"
```

---

## Task 10: Remaining landing sections (How / Featured / Dual / Jeff / FAQ)

**Files:**
- Create:
  - `components/landing/HowItWorks.tsx`
  - `components/landing/FeaturedListings.tsx`
  - `components/landing/DualBand.tsx`
  - `components/landing/JeffSection.tsx`
  - `components/landing/Faq.tsx`
- Modify: `app/page.tsx`

- [ ] **Step 1: Implement `HowItWorks.tsx`**

Port from `index.html` 442–470. 3-col grid (desktop) → 2-col (`≤980px`) → 1-col (`≤720px`). Large terra serif step numbers (1/2/3), ink icons, hover-lift.

- [ ] **Step 2: Implement `FeaturedListings.tsx`**

Port from `index.html` 471–488 + `renderListingCard` at line 981. Pull `listings.filter(l => l.isAssumable).slice(0, 3)`. Card structure: 4:3 image placeholder, loan-type badge, rate, address, navy `assumedMonthly`. Use the same Listing type from `lib/listings/types`.

- [ ] **Step 3: Implement `DualBand.tsx`**

Port from `index.html` 489–525. Two side-by-side dark-ink sections — investor pitch (left) with ROI stats, off-market waitlist (right) with email input. Submit handler is `console.log` for now. Mobile: `.dual-grid` stacks.

- [ ] **Step 4: Implement `JeffSection.tsx`**

Port from `index.html` 566–624. Dark ink bg, `<Image src="/jeff.jpeg" />` with `object-position: top` (port `.jeff-photo` class). 64px serif headline (38px on phone), 4-up stat strip → 2x2 on phone (per CLAUDE.md `.stat-strip` rule), `.contact-pill` with `mailto:` + `tel:` links.

Use `next/image`:
```tsx
import Image from 'next/image';
<Image src="/jeff.jpeg" alt="Jeff Salazar" width={480} height={600} className="object-cover object-top rounded-card" />
```

- [ ] **Step 5: Implement `Faq.tsx`**

Port from `index.html` 526–565. Native `<details>/<summary>` accordion, 6 questions (use exact text from source).

- [ ] **Step 6: Assemble final landing page**

`app/page.tsx`:
```tsx
import { Nav } from '../components/nav/Nav';
import { Hero } from '../components/landing/Hero';
import { FunnelCard } from '../components/landing/FunnelCard';
import { HowItWorks } from '../components/landing/HowItWorks';
import { FeaturedListings } from '../components/landing/FeaturedListings';
import { DualBand } from '../components/landing/DualBand';
import { JeffSection } from '../components/landing/JeffSection';
import { Faq } from '../components/landing/Faq';
import { Footer } from '../components/landing/Footer';

export default function Home() {
  return (
    <>
      <Nav />
      <Hero funnelSlot={<FunnelCard />} />
      <HowItWorks />
      <FeaturedListings />
      <DualBand />
      <JeffSection />
      <Faq />
      <Footer />
    </>
  );
}
```

- [ ] **Step 7: Full landing page visual sweep at 1440 / 980 / 720 / 380 widths**

```bash
npm run dev
```

Compare each section against the current static site loaded via `python3 -m http.server 8000`. Adjust spacing/typography until visual parity.

- [ ] **Step 8: Commit**

```bash
git add components/landing/ app/page.tsx
git commit -m "Port remaining landing sections (How/Featured/Dual/Jeff/FAQ)"
```

---

## Task 11: Properties page — filter bar + state hook

**Files:**
- Create: `components/properties/filters/useFilters.ts`, `components/properties/FilterBar.tsx`, `components/properties/filters/ChipLocation.tsx`, `components/properties/filters/ChipLoan.tsx`, `components/properties/filters/ChipPrice.tsx`, `components/properties/filters/ChipBeds.tsx`
- Create: `app/properties/page.tsx` (skeleton)

Source reference: `properties.html` filter bar section + `app.js` `filterState`.

- [ ] **Step 1: Implement `useFilters` hook**

`components/properties/filters/useFilters.ts`:
```ts
'use client';
import { useMemo, useState, useCallback } from 'react';
import { applyFilters, defaultFilterState, type FilterState } from '../../../lib/listings/filters';
import { listings } from '../../../lib/listings/data';

export function useFilters() {
  const [filters, setFilters] = useState<FilterState>(defaultFilterState);
  const visible = useMemo(() => applyFilters(listings, filters), [filters]);
  const patch = useCallback((p: Partial<FilterState>) => setFilters(s => ({ ...s, ...p })), []);
  return { filters, visible, patch };
}
```

- [ ] **Step 2: Implement each chip component**

Each chip = a button that opens a popover with the filter UI. Pattern:

```tsx
'use client';
import { useState } from 'react';
import type { FilterState } from '../../../lib/listings/filters';

interface Props {
  state: FilterState;
  patch: (p: Partial<FilterState>) => void;
}

export function ChipLoan({ state, patch }: Props) {
  const [open, setOpen] = useState(false);
  // render pill button + dropdown panel — port styling from .filter-chip in styles.css
}
```

Style reference: `styles.css` `.filter-chip` / `.filter-chip-active`. Active state = `border-ink bg-cream`.

- [ ] **Step 3: Implement `FilterBar.tsx`**

```tsx
'use client';
import type { FilterState } from '../../lib/listings/filters';
import { ChipLocation } from './filters/ChipLocation';
import { ChipLoan } from './filters/ChipLoan';
import { ChipPrice } from './filters/ChipPrice';
import { ChipBeds } from './filters/ChipBeds';

interface Props {
  filters: FilterState;
  patch: (p: Partial<FilterState>) => void;
  resultCount: number;
  rateRange: string;
}

export function FilterBar({ filters, patch, resultCount, rateRange }: Props) {
  return (
    <div className="filter-bar sticky top-0 z-30 bg-paper border-b border-line">
      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto md:overflow-visible">
        <ChipLocation state={filters} patch={patch} />
        <ChipLoan state={filters} patch={patch} />
        <ChipPrice state={filters} patch={patch} />
        <ChipBeds state={filters} patch={patch} />
        <button
          onClick={() => patch({ assumableOnly: !filters.assumableOnly })}
          className={`px-3 py-1.5 text-sm rounded-pill border ${
            filters.assumableOnly ? 'border-ink bg-cream' : 'border-line'
          }`}
        >
          Assumable only
        </button>
      </div>
      <div className="px-4 pb-2 text-sm text-muted hidden md:block">
        {resultCount} homes · rates {rateRange}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Stand up `app/properties/page.tsx` skeleton**

```tsx
'use client';
import { Nav } from '../../components/nav/Nav';
import { FilterBar } from '../../components/properties/FilterBar';
import { useFilters } from '../../components/properties/filters/useFilters';

export default function PropertiesPage() {
  const { filters, visible, patch } = useFilters();
  const rates = visible.map(l => l.rate);
  const rateRange = rates.length
    ? `${(Math.min(...rates) * 100).toFixed(3)}–${(Math.max(...rates) * 100).toFixed(2)}%`
    : '—';
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Nav />
      <FilterBar filters={filters} patch={patch} resultCount={visible.length} rateRange={rateRange} />
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[540px_1fr]">
        <aside className="overflow-y-auto p-3 bg-cream">Sidebar placeholder</aside>
        <div className="bg-line">Map placeholder</div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Visual check**

```bash
npm run dev
```

Open `/properties`. Filter chips render. Toggling Assumable-only changes visible count.

- [ ] **Step 6: Commit**

```bash
git add components/properties/ app/properties/
git commit -m "Properties page filter bar + state hook"
```

---

## Task 12: SearchCard + Sidebar + OffMarketTeaser

**Files:**
- Create: `components/properties/SearchCard.tsx`, `components/properties/Sidebar.tsx`, `components/properties/OffMarketTeaser.tsx`
- Modify: `app/properties/page.tsx`

Source reference: `app.js` `buildSearchCard(l)`, `renderSidebar(visible)`, `buildOffMarketTeaser()`.

- [ ] **Step 1: Implement `SearchCard.tsx`**

Props:
```ts
interface Props {
  listing: Listing;
  selected: boolean;
  onSelect: (id: string) => void;
  onFavorite?: (id: string) => void;
}
```

Structure per CLAUDE.md "SearchCard structure":
- `.sc-img` aspect-ratio 4/3 placeholder or `<img>` from `listing.photo`
- VA/FHA tag badge (top-left)
- Heart button (top-right)
- Price row: serif 19px price + navy assumedMonthly
- Address / city / meta (beds · baths · sqft)
- Selected state: `border-2 border-ink shadow-md` + Tour/Details action buttons revealed

Use a stable color map for loan tags:
```ts
const loanColor = { VA: 'bg-navy text-white', FHA: 'bg-terra text-white', Conventional: 'bg-ink text-white' };
```

- [ ] **Step 2: Implement `OffMarketTeaser.tsx`**

Spans both columns of the card grid (`col-span-2`). Port copy from `app.js` `buildOffMarketTeaser`.

- [ ] **Step 3: Implement `Sidebar.tsx`**

```tsx
'use client';
import type { Listing } from '../../lib/listings/types';
import { SearchCard } from './SearchCard';
import { OffMarketTeaser } from './OffMarketTeaser';

interface Props {
  listings: readonly Listing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function Sidebar({ listings, selectedId, onSelect }: Props) {
  return (
    <aside className="overflow-y-auto p-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {listings.map((l, i) => (
          <>
            {i === 6 && <OffMarketTeaser key="omt" />}
            <SearchCard
              key={l.id}
              listing={l}
              selected={l.id === selectedId}
              onSelect={onSelect}
            />
          </>
        ))}
      </div>
    </aside>
  );
}
```

- [ ] **Step 4: Wire into `app/properties/page.tsx`**

```tsx
const [selectedId, setSelectedId] = useState<string | null>(null);
// ...
<Sidebar listings={visible} selectedId={selectedId} onSelect={setSelectedId} />
```

- [ ] **Step 5: Visual check**

Card grid renders 2-up, selecting a card shows action buttons + border highlight. Off-market teaser appears after index 6.

- [ ] **Step 6: Commit**

```bash
git add components/properties/SearchCard.tsx components/properties/Sidebar.tsx components/properties/OffMarketTeaser.tsx app/properties/page.tsx
git commit -m "Properties sidebar with SearchCard + OffMarketTeaser"
```

---

## Task 13: Mapbox integration — markers + zoom controls

**Files:**
- Create: `components/properties/PropertiesMap.tsx`
- Modify: `app/properties/page.tsx`, `.env.local.example` (already includes token)

Source reference: `app.js` map init + `renderMarkers()` + `.price-pill` styles in `styles.css`.

- [ ] **Step 1: Implement `PropertiesMap.tsx`** as client component

```tsx
'use client';
import { useEffect, useRef } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import type { Listing } from '../../lib/listings/types';

interface Props {
  listings: readonly Listing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

export function PropertiesMap({ listings, selectedId, onSelect }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<Map<string, mapboxgl.Marker>>(new Map());

  useEffect(() => {
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    if (!token || !containerRef.current) return;
    mapboxgl.accessToken = token;
    mapRef.current = new mapboxgl.Map({
      container: containerRef.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-112.074, 33.448], // Phoenix
      zoom: 10
    });
    return () => {
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  // Add/update markers when listings change
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    // Clear stale
    for (const [id, m] of markersRef.current) {
      if (!listings.find(l => l.id === id)) {
        m.remove();
        markersRef.current.delete(id);
      }
    }
    // Add new
    for (const l of listings) {
      if (markersRef.current.has(l.id)) continue;
      const el = document.createElement('button');
      el.className = 'price-pill';
      el.innerHTML = `
        <span class="price-pill-dot price-pill-dot-${l.loanType.toLowerCase()}"></span>
        $${Math.round(l.price / 1000)}K
      `;
      el.addEventListener('click', () => onSelect(l.id));
      const marker = new mapboxgl.Marker(el).setLngLat([l.lng, l.lat]).addTo(map);
      markersRef.current.set(l.id, marker);
    }
  }, [listings, onSelect]);

  // Selected styling
  useEffect(() => {
    for (const [id, marker] of markersRef.current) {
      marker.getElement().classList.toggle('selected', id === selectedId);
    }
  }, [selectedId]);

  return <div ref={containerRef} className="w-full h-full" />;
}
```

- [ ] **Step 2: Port `.price-pill` styles into `app/globals.css`**

Source: `styles.css` `.price-pill`, `.price-pill-dot`, `.price-pill-dot-va`, `.price-pill-dot-fha`, `.price-pill.selected`. Copy verbatim into `globals.css` under a `@layer components { ... }` block (Mapbox markers are DOM-rendered outside React, so utility classes alone don't work cleanly here).

- [ ] **Step 3: Wire into `app/properties/page.tsx`**

Replace map placeholder div with `<PropertiesMap listings={visible} selectedId={selectedId} onSelect={setSelectedId} />`.

- [ ] **Step 4: Add `NEXT_PUBLIC_MAPBOX_TOKEN` to `.env.local`**

User-action (manual): paste their Mapbox public token into `.env.local`. Document in the README update at Task 18.

- [ ] **Step 5: Visual + interaction check**

Map renders, markers appear at correct lat/lng, clicking a marker selects the corresponding card in the sidebar (and vice versa).

- [ ] **Step 6: Commit**

```bash
git add components/properties/PropertiesMap.tsx app/globals.css app/properties/page.tsx
git commit -m "Mapbox map with VA/FHA price-pill markers"
```

---

## Task 14: MapPopCard

**Files:**
- Create: `components/properties/MapPopCard.tsx`
- Modify: `app/properties/page.tsx`

Source reference: `app.js` `renderMapPopCard(l)`.

- [ ] **Step 1: Implement `MapPopCard.tsx`**

Floating card bottom-left of map, 300px wide. Props:
```ts
interface Props {
  listing: Listing | null;
  onClose: () => void;
  onOpenDetail: (id: string) => void;
}
```

Structure (per CLAUDE.md):
- 16:9 image
- Loan tag + rate badge
- Address
- Monthly payment
- "View details" button
- X close

When `listing === null`, render nothing.

- [ ] **Step 2: Wire into `app/properties/page.tsx`**

```tsx
const selectedListing = selectedId ? visible.find(l => l.id === selectedId) ?? null : null;
// ...
<div className="relative">
  <PropertiesMap ... />
  <div className="absolute bottom-6 left-6 w-[300px]">
    <MapPopCard
      listing={selectedListing}
      onClose={() => setSelectedId(null)}
      onOpenDetail={(id) => setDetailId(id)}
    />
  </div>
</div>
```

- [ ] **Step 3: Visual check + commit**

```bash
git add components/properties/MapPopCard.tsx app/properties/page.tsx
git commit -m "MapPopCard floating card with View details handoff"
```

---

## Task 15: DetailModal — gallery + payment calculator + tour scheduler

**Files:**
- Create: `components/properties/DetailModal.tsx`, `components/properties/LeadModal.tsx`
- Modify: `app/properties/page.tsx`

Source reference: `app.js` detail modal section. This is the biggest single component (~400 lines). Build in sub-steps within the same task; commit only at the end of the task.

- [ ] **Step 1: Scaffold component and props**

```tsx
'use client';
import { useState, useEffect } from 'react';
import type { Listing } from '../../lib/listings/types';

interface Props {
  listing: Listing | null;
  onClose: () => void;
  onContactAgent: (listingId: string) => void;
}

export function DetailModal({ listing, onClose, onContactAgent }: Props) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [downPercent, setDownPercent] = useState(10);
  const [tourDate, setTourDate] = useState<string | null>(null);
  const [tourTime, setTourTime] = useState<string | null>(null);
  const [tourConfirmed, setTourConfirmed] = useState(false);

  useEffect(() => {
    if (listing) {
      setPhotoIdx(0); setDownPercent(10);
      setTourDate(null); setTourTime(null); setTourConfirmed(false);
    }
  }, [listing?.id]);

  if (!listing) return null;
  // ...
}
```

- [ ] **Step 2: Port photo gallery**

5 faked images per `app.js` photo logic (deterministic from listing id). Arrow buttons, dot indicators, counter overlay. Fade transition via CSS `opacity-100/0` + `transition-opacity`.

- [ ] **Step 3: Port header**

Serif price, address, bed/bath/sqft pills, assumable badge + loan tag.

- [ ] **Step 4: Port About + Features + Property Details accordion**

3 rotating description templates, 8 deterministic features, 6 accordion sections (Parking / Interior / Exterior / Utilities / Location / Public Facts). Determinism keyed by `listing.id`.

- [ ] **Step 5: Port Payment Calculator**

Slider 5–20% down (`downPercent` state). Compute assumed/market monthly using `listing.assumedMonthly`/`listing.marketMonthly` scaled by down-payment ratio. Savings banner shows `(marketMonthly − assumedMonthly) * 360`. Use `listing.rate` and `listing.marketRate`.

- [ ] **Step 6: Port Tour Scheduler**

Next 7 days as pill buttons (`new Date()` + offset). 9am–6pm in 30-min slots. Confirm button → set `tourConfirmed = true` → show success state.

- [ ] **Step 7: Port Contact Agent button → opens LeadModal**

```tsx
<button onClick={() => onContactAgent(listing.id)}>Contact agent</button>
```

- [ ] **Step 8: Implement `LeadModal.tsx`**

Name / email / phone / message form. On submit:
```ts
const leads = JSON.parse(localStorage.getItem('assumableLeads') ?? '[]');
leads.push({ ...form, listingId, ts: Date.now() });
localStorage.setItem('assumableLeads', JSON.stringify(leads));
```
Then show success state, then close.

- [ ] **Step 9: Wire into `app/properties/page.tsx`**

```tsx
const [detailId, setDetailId] = useState<string | null>(null);
const [leadForListingId, setLeadForListingId] = useState<string | null>(null);
const detailListing = detailId ? listings.find(l => l.id === detailId) ?? null : null;
// ...
<DetailModal
  listing={detailListing}
  onClose={() => setDetailId(null)}
  onContactAgent={(id) => setLeadForListingId(id)}
/>
<LeadModal listingId={leadForListingId} onClose={() => setLeadForListingId(null)} />
```

- [ ] **Step 10: Full sweep — open modal, click through every interaction, verify mobile fullscreen sheet at ≤780px**

Compare exhaustively against `properties.html` current modal behavior.

- [ ] **Step 11: Commit**

```bash
git add components/properties/DetailModal.tsx components/properties/LeadModal.tsx app/properties/page.tsx
git commit -m "DetailModal with gallery, payment calculator, tour scheduler, LeadModal"
```

---

## Task 16: Cotality client + auth (no live calls yet)

**Files:**
- Create: `lib/cotality/types.ts`, `lib/cotality/auth.ts`, `lib/cotality/client.ts`
- Create: `tests/lib/cotality.auth.test.ts`, `tests/lib/cotality.client.test.ts`

Reference: CLAUDE.md "Data sources → Cotality Property API V2" + the swagger file at `/Users/knallandighal/Downloads/property-api-v2-openapi3-swagger.json`.

- [ ] **Step 1: Define minimal Cotality types**

`lib/cotality/types.ts`:
```ts
// Only the fields we actually consume from the swagger — keep narrow.
export interface PropertySearchHit {
  clip: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  fipsCode?: string;
}

export interface MortgageTransactionDetail {
  loanTypeCode?: string;
  loanTypeCodeDescription?: string;
  interestRate?: number;
  interestRateTypeCode?: string;
  amount?: number;
  recordingDate?: number;          // YYYYMMDD
  documentNumber?: string;
  lienPosition?: number;
  statusIndicator?: string;
  mortgageTypeCode?: string;
  purposeCode?: string;
}

export interface MortgageDetail {
  mortgageTransactionDetail?: MortgageTransactionDetail;
  lenderDetail?: { lenderName?: string };
}

export interface MortgageTransactionProduct {
  clip: string;
  items?: MortgageDetail[];
}
```

- [ ] **Step 2: Implement auth with in-memory token cache**

`lib/cotality/auth.ts`:
```ts
import { loadCotalityEnv } from './env';

interface TokenCache {
  accessToken: string;
  expiresAt: number;       // epoch ms
}

let cache: TokenCache | null = null;
const SAFETY_WINDOW_MS = 30_000;

export async function getCotalityToken(now: () => number = Date.now): Promise<string> {
  if (cache && cache.expiresAt - SAFETY_WINDOW_MS > now()) {
    return cache.accessToken;
  }
  const { COTALITY_CLIENT_ID, COTALITY_CLIENT_SECRET } = loadCotalityEnv();
  const basic = Buffer.from(`${COTALITY_CLIENT_ID}:${COTALITY_CLIENT_SECRET}`).toString('base64');
  const res = await fetch('https://api1.cotality.com/oauth/token?grant_type=client_credentials', {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}` }
  });
  if (!res.ok) {
    throw new Error(`Cotality OAuth failed: ${res.status} ${await res.text()}`);
  }
  const body = (await res.json()) as { access_token: string; expires_in: number };
  cache = {
    accessToken: body.access_token,
    expiresAt: now() + body.expires_in * 1000
  };
  return cache.accessToken;
}

export function _resetCotalityTokenCacheForTests() {
  cache = null;
}
```

- [ ] **Step 3: Implement client methods**

`lib/cotality/client.ts`:
```ts
import { getCotalityToken } from './auth';
import type { MortgageTransactionProduct, PropertySearchHit } from './types';

const BASE = 'https://api1.cotality.com';

async function authedGet<T>(path: string): Promise<T> {
  const token = await getCotalityToken();
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `OAuth ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Cotality GET ${path} → ${res.status}: ${await res.text()}`);
  }
  return res.json() as Promise<T>;
}

export interface PropertySearchParams {
  streetAddress: string;
  city?: string;
  state: string;
  zipCode: string;
  bestMatch?: boolean;
}

export async function searchProperty(p: PropertySearchParams): Promise<PropertySearchHit | null> {
  const q = new URLSearchParams({
    streetAddress: p.streetAddress,
    state: p.state,
    zipCode: p.zipCode,
    bestMatch: String(p.bestMatch ?? true)
  });
  if (p.city) q.set('city', p.city);
  const result = await authedGet<{ items?: PropertySearchHit[] }>(`/v2/properties/search?${q}`);
  return result.items?.[0] ?? null;
}

export function getCurrentMortgage(clip: string): Promise<MortgageTransactionProduct> {
  return authedGet<MortgageTransactionProduct>(`/v2/properties/${clip}/mortgage/current`);
}

export interface DocImageParams {
  fipsCode: string;
  recordingDate: number;     // YYYYMMDD
  documentNumber: string;
  outputType?: 'PDF' | 'TIFF';
}

export async function fetchDocumentImage(p: DocImageParams): Promise<{ contentType: string; body: ArrayBuffer }> {
  const token = await getCotalityToken();
  const q = new URLSearchParams({
    fipsCode: p.fipsCode,
    recordingDate: String(p.recordingDate),
    documentNumber: p.documentNumber,
    outputType: p.outputType ?? 'PDF'
  });
  const res = await fetch(`${BASE}/v2/properties/document-images/mortgage?${q}`, {
    headers: { Authorization: `OAuth ${token}` }
  });
  if (!res.ok) {
    throw new Error(`Cotality doc-image → ${res.status}: ${await res.text()}`);
  }
  return { contentType: res.headers.get('content-type') ?? 'application/pdf', body: await res.arrayBuffer() };
}
```

Note the `{product}` path segment — the swagger says it's a proxy identifier not transmitted to the target endpoint, so `mortgage` is the canonical value for the mortgage-recording image (verify in trial by checking the swagger's enum if available; treat as a single-value enum here).

- [ ] **Step 4: Test the auth cache with mocked fetch**

`tests/lib/cotality.auth.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { getCotalityToken, _resetCotalityTokenCacheForTests } from '../../lib/cotality/auth';

describe('getCotalityToken', () => {
  beforeEach(() => {
    _resetCotalityTokenCacheForTests();
    process.env.COTALITY_CLIENT_ID = 'id';
    process.env.COTALITY_CLIENT_SECRET = 'secret';
    vi.restoreAllMocks();
  });

  it('fetches a token then reuses cache', async () => {
    const fetchMock = vi.fn(async () =>
      new Response(JSON.stringify({ access_token: 'tok-1', expires_in: 600 }), { status: 200 })
    );
    vi.stubGlobal('fetch', fetchMock);
    const now = () => 1000;

    const t1 = await getCotalityToken(now);
    const t2 = await getCotalityToken(now);
    expect(t1).toBe('tok-1');
    expect(t2).toBe('tok-1');
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('refreshes after expiry', async () => {
    const responses = [
      new Response(JSON.stringify({ access_token: 'tok-A', expires_in: 1 }), { status: 200 }),
      new Response(JSON.stringify({ access_token: 'tok-B', expires_in: 600 }), { status: 200 })
    ];
    const fetchMock = vi.fn(async () => responses.shift()!);
    vi.stubGlobal('fetch', fetchMock);
    let t = 1000;
    const now = () => t;

    expect(await getCotalityToken(now)).toBe('tok-A');
    t += 5_000; // past expiry
    expect(await getCotalityToken(now)).toBe('tok-B');
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('throws on non-2xx', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('nope', { status: 401 })));
    await expect(getCotalityToken()).rejects.toThrow(/401/);
  });
});
```

- [ ] **Step 5: Test client methods with mocked fetch**

`tests/lib/cotality.client.test.ts`:
```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { searchProperty, getCurrentMortgage } from '../../lib/cotality/client';
import { _resetCotalityTokenCacheForTests } from '../../lib/cotality/auth';

beforeEach(() => {
  _resetCotalityTokenCacheForTests();
  process.env.COTALITY_CLIENT_ID = 'id';
  process.env.COTALITY_CLIENT_SECRET = 'secret';
  vi.restoreAllMocks();
});

describe('searchProperty', () => {
  it('returns first hit', async () => {
    const fetchMock = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 't', expires_in: 600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ items: [{ clip: 'CLIP-1', state: 'AZ' }] }), { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);

    const hit = await searchProperty({ streetAddress: '123 Main', state: 'AZ', zipCode: '85001' });
    expect(hit?.clip).toBe('CLIP-1');
    expect(fetchMock.mock.calls[1][0]).toContain('/v2/properties/search');
  });
});

describe('getCurrentMortgage', () => {
  it('returns the product payload', async () => {
    vi.stubGlobal('fetch', vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ access_token: 't', expires_in: 600 }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({
        clip: 'CLIP-1',
        items: [{ mortgageTransactionDetail: { loanTypeCode: 'FHA', interestRate: 0 } }]
      }), { status: 200 }))
    );
    const result = await getCurrentMortgage('CLIP-1');
    expect(result.items?.[0].mortgageTransactionDetail?.loanTypeCode).toBe('FHA');
  });
});
```

- [ ] **Step 6: Run tests**

```bash
npm run test
```

Expected: all Cotality tests pass alongside earlier tests.

- [ ] **Step 7: Commit**

```bash
git add lib/cotality/ tests/lib/cotality.*.test.ts
git commit -m "Cotality client (search, mortgage/current, document-image) with auth cache"
```

---

## Task 17: Cotality probe API route

**Files:**
- Create: `lib/cotality/probe.ts`, `app/api/cotality/probe/route.ts`

The probe runs the pipeline against a small test address list (≤10 addresses → ≤30 API calls per run, safe under 100/day trial cap).

- [ ] **Step 1: Implement pipeline helper**

`lib/cotality/probe.ts`:
```ts
import { searchProperty, getCurrentMortgage } from './client';
import type { MortgageTransactionDetail } from './types';

export interface ProbeAddress {
  streetAddress: string;
  city?: string;
  state: string;
  zipCode: string;
  label?: string;
}

export interface ProbeResult {
  input: ProbeAddress;
  clip: string | null;
  primary: MortgageTransactionDetail | null;
  rawMortgageCount: number;
  error?: string;
}

export async function probeAddress(addr: ProbeAddress): Promise<ProbeResult> {
  try {
    const hit = await searchProperty({
      streetAddress: addr.streetAddress,
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      bestMatch: true
    });
    if (!hit) return { input: addr, clip: null, primary: null, rawMortgageCount: 0 };

    const mortgage = await getCurrentMortgage(hit.clip);
    const items = mortgage.items ?? [];
    const primary = items.find(i =>
      i.mortgageTransactionDetail?.lienPosition === 1 &&
      i.mortgageTransactionDetail?.statusIndicator?.toLowerCase().includes('open')
    )?.mortgageTransactionDetail ?? items[0]?.mortgageTransactionDetail ?? null;

    return { input: addr, clip: hit.clip, primary, rawMortgageCount: items.length };
  } catch (err) {
    return {
      input: addr,
      clip: null,
      primary: null,
      rawMortgageCount: 0,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
```

- [ ] **Step 2: Implement route handler**

`app/api/cotality/probe/route.ts`:
```ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { probeAddress, type ProbeAddress } from '../../../../lib/cotality/probe';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const bodySchema = z.object({
  addresses: z.array(z.object({
    streetAddress: z.string().min(1),
    city: z.string().optional(),
    state: z.string().length(2),
    zipCode: z.string().min(5),
    label: z.string().optional()
  })).min(1).max(10)  // hard cap to respect 100/day trial
});

export async function POST(req: Request) {
  const json = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues }, { status: 400 });
  }

  const results = [];
  for (const addr of parsed.data.addresses as ProbeAddress[]) {
    results.push(await probeAddress(addr));
  }

  const summary = {
    total: results.length,
    withClip: results.filter(r => r.clip).length,
    withMortgage: results.filter(r => r.primary).length,
    withRate: results.filter(r => typeof r.primary?.interestRate === 'number' && r.primary.interestRate > 0).length,
    byLoanType: results.reduce<Record<string, number>>((acc, r) => {
      const code = r.primary?.loanTypeCode ?? 'unknown';
      acc[code] = (acc[code] ?? 0) + 1;
      return acc;
    }, {})
  };

  return NextResponse.json({ summary, results });
}
```

- [ ] **Step 3: Smoke-test the route shape (no live call)**

Run dev server:
```bash
npm run dev
```

In another terminal:
```bash
curl -s -X POST http://localhost:3000/api/cotality/probe \
  -H 'Content-Type: application/json' \
  -d '{"addresses":[]}' | head -c 500
```

Expected: 400 with zod issues (proves the route exists and validates). Live call requires real credentials in `.env.local`.

- [ ] **Step 4: Commit**

```bash
git add lib/cotality/probe.ts app/api/cotality/probe/route.ts
git commit -m "Cotality probe API route: pipeline + zod-validated 10-address cap"
```

---

## Task 18: Cleanup — delete static files, update README, update CLAUDE.md, deploy preview

**Files:**
- Delete: `index.html`, `properties.html`, `styles.css`, `app.js`, `project_specs.md`
- Create: `README.md`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Visual parity sweep**

Run dev server, click through both pages at 1440 / 980 / 720 / 380 viewport widths. Open the static site separately (`python3 -m http.server 8000` on a `redesign` worktree if needed) for side-by-side. List any visual mismatches and fix before deleting source files.

- [ ] **Step 2: Type + lint + tests**

```bash
npm run typecheck
npm run lint
npm run test
```

All three pass.

- [ ] **Step 3: Production build**

```bash
npm run build
```

Build succeeds with no errors.

- [ ] **Step 4: Delete static source files**

```bash
git rm index.html properties.html styles.css app.js project_specs.md
```

- [ ] **Step 5: Create `README.md`**

```markdown
# Assumable Homes

Next.js 15 + TypeScript + Tailwind app for FHA/VA assumable mortgage listings in Arizona.

## Local development

\`\`\`bash
npm install
cp .env.local.example .env.local   # then fill in tokens
npm run dev                         # http://localhost:3000
\`\`\`

## Environment

| Var | Required | Purpose |
|-----|----------|---------|
| `COTALITY_CLIENT_ID` / `COTALITY_CLIENT_SECRET` | For `/api/cotality/probe` | OAuth client-credentials grant for Cotality Property API V2 |
| `NEXT_PUBLIC_MAPBOX_TOKEN` | Yes | Mapbox GL token (domain-scoped publishable token) |
| `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` | No (stub) | Reserved for post-validation rebuild |

## Scripts

| Command | What it does |
|---------|-------------|
| `npm run dev` | Local dev server |
| `npm run build` | Production build |
| `npm run test` | Vitest unit tests |
| `npm run typecheck` | tsc --noEmit |
| `npm run lint` | next lint |

## Cotality probe

\`\`\`bash
curl -X POST http://localhost:3000/api/cotality/probe \
  -H 'Content-Type: application/json' \
  -d '{
    "addresses": [
      {"streetAddress":"123 Example St","state":"AZ","zipCode":"85001","label":"known-FHA-1"}
    ]
  }'
\`\`\`

⚠️ Trial cap: 100 Cotality calls/day. Each probe address ≈ 2–3 calls. Route hard-caps at 10 addresses per request.

See `CLAUDE.md` for architectural context.
```

- [ ] **Step 6: Update CLAUDE.md**

Add a new section at the top under "Project status" describing the `next-rebuild` branch state, and mark the relevant items under "Open decisions / next tasks" as done. Do not rewrite the design-system or responsive sections — they still describe the visual intent the React components are implementing.

- [ ] **Step 7: Final commit**

```bash
git add -A
git commit -m "Remove static HTML/CSS/JS, add README, update CLAUDE.md"
```

- [ ] **Step 8: Push branch (do not merge to main without user approval)**

```bash
git push -u origin next-rebuild
```

Open the Vercel preview URL that GitHub posts on the PR (or `vercel.com` dashboard) and click through both pages on the preview deploy. Confirm Mapbox token is set in Vercel project env vars (`NEXT_PUBLIC_MAPBOX_TOKEN`).

---

## Self-Review Notes (post-write)

**Spec coverage:**
- ✅ Next.js 15 + TS + Tailwind scaffold (Tasks 1–2)
- ✅ Mapbox swap (Task 13)
- ✅ Both pages ported with feature parity (Tasks 7–15)
- ✅ Funnel + filter logic as components with tests (Tasks 5–6, 9, 11)
- ✅ `.env.local` setup + Supabase client stub (Task 3)
- ✅ Cotality probe as `/api/cotality/probe` (Tasks 16–17)
- ✅ Branch `next-rebuild` off `redesign` (Task 1)
- ✅ Static files removed at end (Task 18)
- ✅ Compliance TODO documented (Task 7) — pre-launch must-do still tracked

**Out of scope items confirmed absent:**
- No ARMLS sync, no Supabase queries, no real lead webhooks, no auth rebuild, no hamburger menu — all noted in pre-flight.

**Known follow-ups (not in this plan):**
- Compliance footer (ARMLS / Fair Housing / broker attribution / data timestamp) — flagged as `TODO(compliance)` in Task 7
- Live Cotality validation run (user-driven, gates real backend work — see CLAUDE.md "Current blocker")
- Migrate listings off `listings.json` once Cotality + ARMLS are wired
