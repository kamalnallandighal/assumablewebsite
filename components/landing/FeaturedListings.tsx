import Link from 'next/link';
import { fetchAllListings } from '../../lib/listings/repository';
import { formatMoney, formatRate } from '../../lib/format';
import { Reveal } from '../ui/Reveal';
import type { Listing } from '../../lib/listings/types';

function RateTag({ l }: { l: Listing }) {
  const tone = l.loanType === 'VA' ? 'bg-navy text-white' : 'bg-terra text-white';
  return (
    <span
      className={`inline-block text-[11px] font-semibold uppercase tracking-[0.08em] px-2.5 py-1 rounded-pill ${tone}`}
    >
      {l.loanType} · {formatRate(l.rate)}
    </span>
  );
}

export async function FeaturedListings() {
  const listings = await fetchAllListings();
  const featured = listings
    .filter((l) => l.isAssumable && l.loanType)
    .slice()
    .sort((a, b) => a.rate - b.rate)
    .slice(0, 3);

  const [lead, ...rest] = featured;
  if (!lead) return null;

  const leadStreet = lead.address.split(',')[0];
  const leadCity = lead.address.split(',').slice(1).join(',').trim();

  return (
    <section id="featured" className="px-6 md:px-10 py-16 md:py-24 bg-cream">
      <div className="max-w-[1280px] mx-auto">
        <Reveal className="featured-head flex flex-col md:flex-row md:items-end md:justify-between gap-4 mb-10">
          <div>
            <div className="eyebrow">Properties We Represent</div>
            <h2 className="font-serif font-normal text-[30px] md:text-[42px] tracking-[-.02em] text-ink mt-4">
              The lowest-rate homes in Phoenix
            </h2>
          </div>
          <Link
            href="/properties"
            className="group text-sm font-medium text-ink inline-flex items-center gap-1.5"
          >
            View all properties
            <span className="text-gold transition-transform group-hover:translate-x-1">→</span>
          </Link>
        </Reveal>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {/* Lead — large editorial feature */}
          <Reveal className="h-full" delay={120}>
            <Link
              href="/properties"
              className="group block h-full bg-paper border border-line rounded-card overflow-hidden hover:border-gold/60 transition-colors"
            >
              <div className="relative aspect-[16/10] bg-line-2 overflow-hidden">
                {lead.photo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={lead.photo}
                    alt={leadStreet}
                    loading="lazy"
                    className="editorial-img w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                  />
                )}
                <div className="absolute top-4 left-4">
                  <RateTag l={lead} />
                </div>
              </div>
              <div className="p-6 md:p-7">
                <div className="font-serif text-[30px] text-ink leading-none">
                  {formatMoney(lead.price)}
                </div>
                <div className="mt-2 text-[15px] text-ink">{leadStreet}</div>
                <div className="text-sm text-muted-2">{leadCity}</div>
                <div className="mt-3 text-xs text-muted-2 flex gap-3">
                  <span>{lead.beds} bd</span>
                  <span>{lead.baths} ba</span>
                  <span>{lead.sqft.toLocaleString()} sqft</span>
                </div>
                <div className="mt-4 text-sm">
                  <strong className="text-navy">{formatMoney(lead.assumedMonthly)}/mo</strong>
                  <span className="text-muted-2"> at {formatRate(lead.rate)}</span>
                </div>
              </div>
            </Link>
          </Reveal>

          {/* Two stacked, horizontal cards */}
          <div className="grid grid-rows-1 sm:grid-rows-2 gap-5">
            {rest.map((l, i) => {
              const street = l.address.split(',')[0];
              const city = l.address.split(',').slice(1).join(',').trim();
              return (
                <Reveal key={l.id} delay={220 + i * 110} className="h-full">
                  <Link
                    href="/properties"
                    className="group flex h-full bg-paper border border-line rounded-card overflow-hidden hover:border-gold/60 transition-colors"
                  >
                    <div className="relative w-[44%] shrink-0 bg-line-2 overflow-hidden">
                      {l.photo && (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={l.photo}
                          alt={street}
                          loading="lazy"
                          className="editorial-img absolute inset-0 w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
                        />
                      )}
                      <div className="absolute top-3 left-3">
                        <RateTag l={l} />
                      </div>
                    </div>
                    <div className="p-5 flex-1 min-w-0 flex flex-col justify-center">
                      <div className="font-serif text-[22px] text-ink leading-none">
                        {formatMoney(l.price)}
                      </div>
                      <div className="mt-1.5 text-sm text-ink truncate">{street}</div>
                      <div className="text-xs text-muted-2 truncate">{city}</div>
                      <div className="mt-2.5 text-sm">
                        <strong className="text-navy">{formatMoney(l.assumedMonthly)}/mo</strong>
                        <span className="text-muted-2"> at {formatRate(l.rate)}</span>
                      </div>
                    </div>
                  </Link>
                </Reveal>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
