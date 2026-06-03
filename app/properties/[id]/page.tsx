import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { findListing } from '../../../lib/listings/data';
import { formatMoney, formatRate } from '../../../lib/format';
import { Nav } from '../../../components/nav/Nav';
import {
  galleryFor,
  descriptionFor,
  featuresFor,
  propertyDetailsFor
} from '../../../lib/listings/fake-details';
import { RightRail } from './RightRail';

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id } = await params;
  const l = findListing(id);
  if (!l) return { title: 'Property not found · Assumable Homes' };
  const desc = `${formatMoney(l.price)} · ${l.beds} bd / ${l.baths} ba · ${l.sqft.toLocaleString()} sqft${
    l.loanType ? ` · ${l.loanType} assumable at ${formatRate(l.rate)}` : ''
  }`;
  return {
    title: `${l.address} · Assumable Homes`,
    description: desc,
    openGraph: {
      title: l.address,
      description: desc,
      images: l.photo ? [{ url: l.photo }] : undefined,
      type: 'website'
    },
    alternates: { canonical: `/properties/${l.id}` }
  };
}

function tagClass(t: string | null): string {
  if (t === 'VA') return 'tag tag-va';
  if (t === 'FHA') return 'tag tag-fha';
  return 'tag tag-dim';
}

function splitAddress(full: string): { street: string; cityRegion: string } {
  const idx = full.indexOf(',');
  if (idx === -1) return { street: full, cityRegion: '' };
  return {
    street: full.slice(0, idx).trim(),
    cityRegion: full.slice(idx + 1).trim()
  };
}

function GalleryTile({
  src,
  label,
  height,
  ratio,
  className = ''
}: {
  src: string | undefined;
  label: string;
  height?: number;
  ratio?: string;
  className?: string;
}) {
  const style: React.CSSProperties = { height, aspectRatio: ratio };
  if (!src) {
    return (
      <div className={`skeleton-img ${className}`} style={style}>
        {label}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={label} className={`w-full object-cover ${className}`} style={style} />
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={14}
      height={14}
      className="inline-block text-ok align-[-2px] mr-2"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      width={16}
      height={16}
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function MiniStat({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="text-xs text-muted-2 font-medium">{label}</div>
      <div className="text-2xl font-semibold text-ink mt-1">{value}</div>
      <div className="text-xs text-muted mt-0.5">{sub}</div>
    </div>
  );
}

export default async function PropertyDetailPage({ params }: PageProps) {
  const { id } = await params;
  const l = findListing(id);
  if (!l) notFound();

  const { street, cityRegion } = splitAddress(l.address);
  const photos = galleryFor(l);
  const description = descriptionFor(l);
  const features = featuresFor(l);
  const sections = propertyDetailsFor(l);
  const facts = sections.flatMap((s) => s.rows).slice(0, 6);

  const monthlySavings = Math.max(0, l.marketMonthly - l.assumedMonthly);
  const remaining = Math.max(0, l.price - l.downPayment);
  const remainingShort =
    remaining >= 1_000_000
      ? `$${(remaining / 1_000_000).toFixed(2)}M`
      : `$${Math.round(remaining / 1000)}K`;
  const thirtyYearSavings = monthlySavings * 12 * 26;
  const thirtyYearShort =
    thirtyYearSavings >= 1_000_000
      ? `$${(thirtyYearSavings / 1_000_000).toFixed(2)}M`
      : `$${Math.round(thirtyYearSavings / 1000)}K`;

  const faqs: Array<[string, string]> = [
    [
      `Can I assume this ${l.loanType ?? ''} loan?`,
      `Yes, as long as you meet the lender's credit (620+) and DTI requirements. ${
        l.loanType === 'VA'
          ? 'You do NOT need to be a veteran to assume a VA loan — this is a common misconception.'
          : 'FHA assumptions require you to use the home as your primary residence.'
      }`
    ],
    [
      'How much cash do I actually need?',
      `You need to cover the seller's equity of ${formatMoney(
        l.downPayment
      )}. If you don't have that in cash, we can help structure secondary financing to cover the gap.`
    ],
    [
      'Can investors assume this one?',
      l.loanType === 'VA'
        ? 'Yes — VA assumptions can be used for investment properties. You can rent this home out.'
        : "No — FHA loans require owner-occupancy. If you're an investor, ask us about our VA inventory."
    ],
    [
      'How long does this take?',
      'Typically 45 days. The lender underwriting is 2–3 weeks, and the rest is standard closing.'
    ]
  ];

  return (
    <div className="bg-paper w-full min-h-screen">
      <Nav />

      {/* Breadcrumb + share */}
      <div className="px-10 py-4 flex justify-between items-center border-b border-line">
        <div className="text-[13px] text-muted-2">
          <Link href="/properties" className="text-muted-2 hover:text-ink">
            Properties
          </Link>
          {' / '}
          <span className="text-ink">{street}</span>
        </div>
        <div className="flex gap-2">
          <button className="px-3.5 py-2 text-[13px] font-medium text-ink border border-line-2 rounded-pill hover:border-ink">
            Share
          </button>
          <button className="px-3.5 py-2 text-[13px] font-medium text-ink border border-line-2 rounded-pill hover:border-ink">
            Save
          </button>
        </div>
      </div>

      {/* Gallery */}
      <div className="px-10 pt-5">
        <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr_1fr] gap-1.5 rounded-xl overflow-hidden">
          <GalleryTile src={photos[0]} label="front elevation" ratio="4 / 3" />
          <div className="grid gap-1.5">
            <GalleryTile src={photos[1]} label="living room" height={218} />
            <GalleryTile src={photos[2]} label="kitchen" height={218} />
          </div>
          <div className="grid gap-1.5 relative">
            <GalleryTile src={photos[3]} label="primary bed" height={218} />
            <div className="relative">
              <GalleryTile src={photos[4]} label="backyard" height={218} />
              <button className="absolute bottom-3.5 right-3.5 bg-paper/95 text-ink border border-line rounded-pill px-4 py-2 text-[13px] font-medium hover:border-ink">
                See all {photos.length} photos
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main grid: content + sticky rail */}
      <div className="px-10 pt-8 pb-20 grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-14 max-w-[1400px] mx-auto">
        {/* LEFT — content */}
        <div>
          {/* Title block */}
          <div className="flex gap-2 mb-3.5 flex-wrap">
            {l.loanType && (
              <span
                className={tagClass(l.loanType)}
                style={{ fontSize: 12, padding: '6px 12px' }}
              >
                {l.loanType} ASSUMABLE
              </span>
            )}
            <span className="tag tag-ok" style={{ fontSize: 12, padding: '6px 12px' }}>
              Rate: {formatRate(l.rate)}
            </span>
            <span className="tag tag-dim" style={{ fontSize: 12, padding: '6px 12px' }}>
              Listed 4 days ago
            </span>
          </div>
          <h1 className="font-serif font-normal text-[56px] tracking-[-.02em] m-0 leading-[1.05] text-ink">
            {street}
          </h1>
          <div className="text-base text-muted-2 mt-1.5">{cityRegion}</div>
          <div className="flex gap-7 mt-5 text-[15px] text-ink flex-wrap">
            <span>
              <strong>{l.beds}</strong> beds
            </span>
            <span>
              <strong>{l.baths}</strong> baths
            </span>
            <span>
              <strong>{l.sqft.toLocaleString()}</strong> sqft
            </span>
            <span className="text-muted-2">Single family · Built 1998</span>
          </div>

          {/* THE ASSUMABLE ADVANTAGE */}
          <section className="mt-10 p-8 bg-cream rounded-2xl">
            <div className="eyebrow mb-4">The assumable advantage</div>
            <div className="grid grid-cols-1 md:grid-cols-[1.1fr_1fr_1fr] gap-8 items-stretch">
              <div>
                <div className="text-xs text-muted-2 font-medium">Monthly payment</div>
                <div className="flex items-baseline gap-4 mt-2.5 flex-wrap">
                  <div className="font-serif font-normal text-[52px] tracking-[-.02em] text-navy leading-none">
                    {formatMoney(l.assumedMonthly)}
                  </div>
                  <div
                    className="font-serif text-2xl text-muted line-through"
                    style={{ textDecorationColor: '#D35932' }}
                  >
                    {formatMoney(l.marketMonthly)}
                  </div>
                </div>
                {monthlySavings > 0 && (
                  <div className="text-[13px] text-ok mt-2.5 font-medium">
                    Save {formatMoney(monthlySavings)}/mo vs. a new loan today
                  </div>
                )}
              </div>
              <div>
                <div className="text-xs text-muted-2 font-medium">Interest rate</div>
                <div className="font-serif font-normal text-[52px] tracking-[-.02em] text-ink leading-none mt-2.5">
                  {formatRate(l.rate)}
                </div>
                <div className="text-[13px] text-muted-2 mt-2.5">
                  vs. {formatRate(l.marketRate)} market today
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-2 font-medium">Remaining balance</div>
                <div className="font-serif font-normal text-[52px] tracking-[-.02em] text-ink leading-none mt-2.5">
                  {remainingShort}
                </div>
                <div className="text-[13px] text-muted-2 mt-2.5">26 years left on term</div>
              </div>
            </div>

            <div className="mt-6 pt-6 border-t border-line grid grid-cols-1 md:grid-cols-3 gap-8">
              <MiniStat
                label="Seller's equity (what you pay)"
                value={formatMoney(l.downPayment)}
                sub="Cash or secondary financing"
              />
              <MiniStat
                label="Est. closing costs"
                value="$3,200"
                sub="No new appraisal required"
              />
              <MiniStat
                label="30-year savings"
                value={thirtyYearShort}
                sub="Over remaining loan term"
              />
            </div>
          </section>

          {/* About */}
          <section className="mt-12">
            <h2 className="font-serif font-normal text-[32px] tracking-[-.02em] m-0">
              About this home
            </h2>
            <p className="text-[15px] leading-[1.7] text-muted-2 mt-4 max-w-[660px]">
              {description}
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-6">
              {features.map((f) => (
                <div
                  key={f}
                  className="px-4 py-3.5 bg-paper border border-line rounded-md text-[13px] text-ink"
                >
                  <CheckIcon />
                  {f}
                </div>
              ))}
            </div>
          </section>

          {/* How assumption works */}
          <section className="mt-14">
            <h2 className="font-serif font-normal text-[32px] tracking-[-.02em] m-0">
              How assumption works for this home
            </h2>
            <div className="mt-5 flex flex-col">
              {faqs.map(([q, a], i) => (
                <details
                  key={i}
                  open={i === 0}
                  className={`${i === 0 ? 'border-t' : ''} border-b border-line py-[18px] group`}
                >
                  <summary className="list-none cursor-pointer flex justify-between items-center text-base font-medium">
                    {q}
                    <span className="text-muted-2 group-open:rotate-45 transition-transform">
                      <PlusIcon />
                    </span>
                  </summary>
                  <p className="mt-3 text-sm leading-[1.65] text-muted-2 max-w-[640px]">{a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Property details */}
          <section className="mt-14">
            <h2 className="font-serif font-normal text-[32px] tracking-[-.02em] m-0">
              Property details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-3 mt-6">
              {facts.map(([k, v]) => (
                <div
                  key={k}
                  className="flex justify-between py-3 border-b border-line text-[13px]"
                >
                  <span className="text-muted-2">{k}</span>
                  <span className="text-ink font-medium text-right">{v}</span>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* RIGHT — sticky rail */}
        <div>
          <RightRail listing={l} />
        </div>
      </div>
    </div>
  );
}
