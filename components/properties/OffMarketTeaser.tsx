'use client';

export function OffMarketTeaser() {
  return (
    <div className="col-span-1 md:col-span-2 bg-ink text-paper rounded-card p-5">
      <div className="text-xs uppercase tracking-wider text-paper/60 mb-2">Off-market</div>
      <div className="font-serif text-xl mb-2">47 more homes match your filters</div>
      <p className="text-sm text-paper/80 mb-3">
        Pocket listings and pre-MLS inventory. Get them emailed to you.
      </p>
      <a
        href="/#off-market"
        className="inline-block bg-terra text-white text-sm px-4 py-2 rounded-pill"
      >
        Unlock off-market list
      </a>
    </div>
  );
}
