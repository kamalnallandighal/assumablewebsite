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
