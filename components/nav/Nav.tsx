import Link from 'next/link';
import { Wordmark } from '../ui/Wordmark';

// Slow gold underline grows from the left on hover — heritage, not bouncy.
const navLink =
  'relative tracking-[0.02em] after:absolute after:left-0 after:-bottom-1 after:h-px after:w-0 after:bg-gold after:transition-all after:duration-300 hover:after:w-full';

export function Nav() {
  return (
    <nav className="flex items-center justify-between px-6 md:px-10 py-4 bg-paper border-b border-line">
      <Link href="/" className="flex items-center text-ink" aria-label="Steward Homes — home">
        <Wordmark />
      </Link>
      <div className="hidden md:flex gap-9 text-sm font-medium text-ink">
        <Link href="/properties" className={navLink}>Properties</Link>
        <Link href="/#how" className={navLink}>How It Works</Link>
        <Link href="/#off-market" className={navLink}>Off-Market</Link>
        <Link href="/#agent" className={navLink}>Our Advisors</Link>
      </div>
      <Link
        href="/properties"
        className="bg-terra text-white text-sm font-medium tracking-[0.03em] px-5 py-2.5 rounded-pill hover:bg-ink-2 transition-colors"
      >
        Work With Us
      </Link>
    </nav>
  );
}
