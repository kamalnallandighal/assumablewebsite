import Link from 'next/link';

export function Nav() {
  return (
    <nav className="flex items-center justify-between px-6 md:px-10 py-4 bg-paper border-b border-line">
      <Link href="/" className="flex items-center gap-2 font-serif text-2xl text-ink">
        <span className="w-2.5 h-2.5 bg-ink inline-block" />
        <span>Assumable</span>
      </Link>
      <div className="hidden md:flex gap-8 text-sm text-ink">
        <Link href="/properties">Property search</Link>
        <Link href="/#how">How it works</Link>
        <Link href="/#off-market">Off-market</Link>
        <Link href="/#agent">Agent</Link>
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
