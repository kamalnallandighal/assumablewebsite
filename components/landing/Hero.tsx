import Link from 'next/link';
import type { ReactNode } from 'react';

interface HeroProps {
  funnelSlot: ReactNode;
}

export function Hero({ funnelSlot }: HeroProps) {
  return (
    <section id="hero" className="px-6 md:px-10 py-12 md:py-20 bg-paper">
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.05fr] gap-10 md:gap-[72px] items-start max-w-[1280px] mx-auto">
        <div className="space-y-6">
          <div className="text-xs uppercase tracking-widest text-muted">
            Arizona · 331 assumable listings
          </div>
          <h1 className="font-serif text-[38px] md:text-[52px] lg:text-[68px] leading-[1.05] font-normal text-ink">
            Shop Arizona homes
            <br />
            with <em className="not-italic text-navy">2–4%</em> assumable mortgages.
          </h1>
          <p className="text-muted text-base md:text-lg max-w-[500px] leading-[1.55]">
            Every VA, FHA and USDA listing in the Valley with a takeover-ready loan — on-market and off. Save $1,500+ a month versus today&apos;s rates.
          </p>
          <Link
            href="/properties"
            className="inline-block bg-terra text-white text-sm md:text-base px-6 py-3 rounded-pill hover:opacity-90"
          >
            Or skip and browse the map →
          </Link>
        </div>
        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-6">
            <div>
              <div className="font-serif text-[32px] leading-tight text-ink">2.625%</div>
              <div className="text-muted text-sm">Lowest rate available today</div>
            </div>
            <div>
              <div className="font-serif text-[32px] leading-tight text-ink">$1,512</div>
              <div className="text-muted text-sm">Avg monthly savings</div>
            </div>
            <div>
              <div className="font-serif text-[32px] leading-tight text-ink">331</div>
              <div className="text-muted text-sm">Assumable homes in AZ</div>
            </div>
            <div>
              <div className="font-serif text-[32px] leading-tight text-ink">45 days</div>
              <div className="text-muted text-sm">Typical close</div>
            </div>
          </div>
          {funnelSlot}
        </div>
      </div>
    </section>
  );
}
