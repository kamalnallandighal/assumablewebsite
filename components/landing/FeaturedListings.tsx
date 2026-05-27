import Link from 'next/link';
import { listings } from '../../lib/listings/data';
import { formatMoney, formatRate } from '../../lib/format';

export function FeaturedListings() {
  const featured = listings
    .filter((l) => l.isAssumable && l.loanType)
    .slice()
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 3);

  return (
    <section id="featured" className="px-6 md:px-10 py-16 md:py-24 bg-cream">
      <div className="max-w-[1280px] mx-auto">
        <div className="featured-head flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-8">
          <div>
            <div className="text-xs uppercase tracking-widest text-muted">
              Best deals this week
            </div>
            <h2 className="font-serif font-normal text-[30px] md:text-[40px] tracking-tight text-ink mt-2">
              Lowest-rate listings in Phoenix
            </h2>
          </div>
          <Link href="/properties" className="text-sm text-ink underline-offset-4 hover:underline">
            See all 331 →
          </Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {featured.map((l) => {
            const [street, ...rest] = l.address.split(',');
            const city = rest.join(',').trim();
            const tagClass =
              l.loanType === 'VA'
                ? 'bg-navy text-white'
                : 'bg-terra text-white';
            return (
              <Link
                key={l.id}
                href="/properties"
                className="block bg-paper border border-line rounded-card overflow-hidden hover:-translate-y-1 transition-transform"
              >
                <div className="relative aspect-[4/3] bg-line-2">
                  {l.photo && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={l.photo}
                      alt={street}
                      loading="lazy"
                      className="w-full h-full object-cover"
                    />
                  )}
                  <div className="absolute top-3 left-3">
                    <span className={`inline-block text-xs font-medium px-2.5 py-1 rounded-pill ${tagClass}`}>
                      {l.loanType} · {formatRate(l.rate)}
                    </span>
                  </div>
                </div>
                <div className="p-5">
                  <div className="font-serif text-[22px] text-ink leading-tight">
                    {formatMoney(l.price)}
                  </div>
                  <div className="mt-1 text-sm text-ink">{street}</div>
                  <div className="text-xs text-muted-2">{city}</div>
                  <div className="mt-2 text-xs text-muted-2 flex gap-3">
                    <span>{l.beds} bd</span>
                    <span>{l.baths} ba</span>
                    <span>{l.sqft.toLocaleString()} sqft</span>
                  </div>
                  <div className="mt-3 text-sm">
                    <strong className="text-navy">
                      {formatMoney(l.assumedMonthly)}/mo
                    </strong>
                    <span className="text-muted-2"> at {formatRate(l.rate)}</span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
