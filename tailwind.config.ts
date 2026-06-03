import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: '#0F1623', 2: '#1B2236' },
        navy: { DEFAULT: '#2B4072', deep: '#1A2855' },
        terra: { DEFAULT: '#D35932', soft: '#FDD8CC', ink: '#631800' },
        ok: '#1E6F5C',
        cream: { DEFAULT: '#F4F3F2', 2: '#EBE6E2' },
        paper: '#FFFFFF',
        line: { DEFAULT: '#E5E3E1', 2: '#D4D1CE' },
        muted: { DEFAULT: '#868686', 2: '#5E5E5E' }
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'sans-serif'],
        serif: ['var(--font-source-serif)', 'Georgia', 'serif']
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
        card: '12px',
        pill: '999px'
      }
    }
  },
  plugins: []
};

export default config;
