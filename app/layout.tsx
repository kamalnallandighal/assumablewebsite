import './globals.css';
import type { ReactNode } from 'react';
import { Inter, Playfair_Display } from 'next/font/google';
import { Providers } from './providers';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter', display: 'swap' });
const playfair = Playfair_Display({
  subsets: ['latin'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap'
});

export const metadata = {
  title: 'Steward Homes — Assumable Mortgages in Arizona',
  description: 'FHA & VA assumable mortgage listings in Arizona.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="font-sans bg-paper text-ink antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
