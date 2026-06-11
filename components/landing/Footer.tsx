import Link from 'next/link';
import { Wordmark } from '../ui/Wordmark';

const NAV = [
  ['Properties', '/properties'],
  ['How It Works', '/#how'],
  ['Off-Market', '/#off-market'],
  ['Our Advisors', '/#agent']
] as const;

// Equal Housing Opportunity mark — simple line house with an equals sign,
// in the brand's "clean line icons only" spirit.
function EhoMark() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M3 11l9-7 9 7" />
      <path d="M5 10v9h14v-9" />
      <path d="M9.5 13.5h5M9.5 16h5" />
    </svg>
  );
}

export function Footer() {
  return (
    <footer className="bg-ink text-white/70">
      <div className="max-w-[1160px] mx-auto px-6 md:px-10 pt-16 pb-10">
        <div className="grid grid-cols-1 md:grid-cols-[1.4fr_1fr_1fr] gap-10 md:gap-16">
          {/* Brand */}
          <div>
            <Link href="/" className="inline-flex text-white" aria-label="Steward Homes — home">
              <Wordmark size={22} />
            </Link>
            <p className="mt-5 text-[14px] leading-[1.7] text-white/60 max-w-[300px]">
              A private advisory network for assumable homes across greater Phoenix —
              representing the rare listings whose low-rate financing transfers with the keys.
            </p>
          </div>

          {/* Explore */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
              Explore
            </div>
            <ul className="mt-4 space-y-2.5 text-[14px]">
              {NAV.map(([label, href]) => (
                <li key={label}>
                  <Link href={href} className="text-white/70 hover:text-white transition-colors">
                    {label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Connect */}
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/45">
              An Invitation to Connect
            </div>
            <ul className="mt-4 space-y-2.5 text-[14px] text-white/70">
              <li>Jeff Salazar, Designated Broker</li>
              <li>
                <a href="tel:+16023323860" className="hover:text-white transition-colors">
                  (602) 332-3860
                </a>
              </li>
              <li>
                <a href="mailto:jeff@stewardhomes.com" className="hover:text-white transition-colors">
                  jeff@stewardhomes.com
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Gold hairline */}
        <div className="mt-12 mb-7 h-px bg-gold/40" />

        {/* Compliance — ARMLS / Fair Housing / broker attribution / timestamp */}
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-6 text-[12px] leading-[1.6] text-white/45">
          <div className="max-w-[640px] space-y-2">
            <p>
              All information should be verified by the recipient and none is guaranteed as
              accurate by ARMLS.
            </p>
            <p>
              Steward Homes is a licensed Arizona real estate brokerage · Jeff Salazar,
              Designated Broker · AZ Lic. #SA000000 {/* TODO: real license # */}. Listing
              data refreshed within the last 12 hours.
            </p>
          </div>
          <div className="flex items-center gap-3 shrink-0 text-white/55">
            <EhoMark />
            <span className="uppercase tracking-[0.1em] text-[11px]">
              Equal Housing
              <br />
              Opportunity
            </span>
          </div>
        </div>

        <div className="mt-8 text-[12px] text-white/35">
          © 2026 Steward Homes. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
