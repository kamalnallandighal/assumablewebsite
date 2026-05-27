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
