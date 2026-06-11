import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      // Steward Homes brand palette (March 2026 brief). Token NAMES are kept so
      // the existing layout/classNames are untouched — only the VALUES change.
      //   Sage-Gray Green #3D5A4F  primary: logo, headlines, numbers, CTAs, bands
      //   Natural Linen   #F5F1E8  section backgrounds / negative space
      //   Warm Gold       #B8860B  restrained accent (key figures, dividers, hover)
      //   Slate           #4A5568  body + secondary text (never pure black)
      //   Border Gray     #DDDDDD  hairline structure
      colors: {
        // headlines, big serif numbers, and the dark "bands" (Jeff / off-market)
        ink: { DEFAULT: '#3D5A4F', 2: '#2F4A40' },
        // secondary financial figures (monthly payment, VA tag) → slate
        navy: { DEFAULT: '#4A5568', deep: '#3A4456' },
        // primary / CTA / brand accents → sage green
        terra: { DEFAULT: '#3D5A4F', soft: '#E6EBE4', ink: '#2B4339' },
        // restrained warm-gold accent — use sparingly
        gold: { DEFAULT: '#B8860B', soft: '#EFE4C4' },
        ok: '#3D5A4F',
        cream: { DEFAULT: '#F5F1E8', 2: '#ECE4D5' },
        paper: '#FFFFFF',
        line: { DEFAULT: '#DDDDDD', 2: '#CFC8BA' },
        muted: { DEFAULT: '#6B7280', 2: '#4A5568' }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        // "serif" token drives all display type. Steward's primary face is
        // Playfair Display (headlines + wordmark). Body stays Inter (`sans`).
        serif: ['var(--font-playfair)', 'Georgia', 'serif']
      },
      boxShadow: {
        xs: '0 1px 0 rgba(16,22,35,.04), 0 1px 2px rgba(16,22,35,.04)',
        sm: '0 2px 4px rgba(16,22,35,.05), 0 6px 14px rgba(16,22,35,.04)',
        md: '0 8px 18px rgba(16,22,35,.08), 0 3px 6px rgba(16,22,35,.04)',
        lg: '0 18px 38px rgba(16,22,35,.10), 0 6px 12px rgba(16,22,35,.05)',
        modal: '0 30px 80px rgba(0,0,0,.35)'
      },
      borderRadius: {
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '20px',
        '2xl': '24px',
        card: '10px',
        // Steward UI is rectangular with "slightly rounded corners at most" —
        // the old pill shape reads consumer-app, not private-advisory.
        pill: '4px'
      }
    }
  },
  plugins: []
};

export default config;
