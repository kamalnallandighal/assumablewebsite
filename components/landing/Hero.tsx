import type { ReactNode } from 'react';
import { Reveal } from '../ui/Reveal';

interface HeroProps {
  rightSlot: ReactNode;
}

const STATS: Array<[string, string]> = [
  ['2.625%', 'Lowest rate available today'],
  ['$1,512', 'Avg monthly savings'],
  ['331', 'Assumable homes in AZ'],
  ['45 days', 'Typical close']
];

export function Hero({ rightSlot }: HeroProps) {
  return (
    <section
      id="hero"
      className="px-6 md:px-14 pt-8 md:pt-10 pb-16 md:pb-20 bg-gradient-to-b from-cream to-paper"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.05fr] gap-10 md:gap-[72px] items-center max-w-[1280px] mx-auto">
        {/* LEFT — value prop + stats + skip link, staggered on load */}
        <div>
          <Reveal delay={0}>
            <div className="eyebrow mb-5">Arizona · 331 assumable listings</div>
          </Reveal>

          <Reveal delay={90}>
            <h1 className="font-serif font-bold text-[40px] md:text-[58px] lg:text-[72px] leading-[1.0] tracking-[-.035em] text-ink">
              Shop Arizona homes
              <br />
              with <span className="text-gold">2–4%</span> assumable mortgages.
            </h1>
          </Reveal>

          <Reveal delay={200}>
            <p className="text-muted-2 text-base md:text-[17px] leading-[1.55] mt-5 md:mt-[22px] max-w-[500px]">
              Every VA, FHA and USDA listing in the Valley with a takeover-ready loan — on-market
              and off. Save $1,500+ a month versus today&apos;s rates.
            </p>
          </Reveal>

          {/* Editorial "ledger" — gold top rule, hairline dividers, tracked
              caps labels. Reads like a private-bank fact sheet, not KPI tiles. */}
          <div className="mt-10 pt-6 border-t border-gold/50 max-w-[560px]">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-y-6">
              {STATS.map(([num, label], i) => (
                <Reveal
                  key={label}
                  delay={300 + i * 80}
                  className={i > 0 ? 'md:pl-5 md:border-l md:border-line' : ''}
                >
                  <div className="font-serif text-[26px] md:text-[30px] font-normal tracking-[-.02em] text-ink leading-none">
                    {num}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.1em] text-muted mt-2">
                    {label}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>

          <Reveal delay={640}>
            <div className="mt-8">
              <a
                href="/properties"
                className="text-sm text-muted-2 underline underline-offset-4 hover:text-ink"
              >
                Or skip and browse the map →
              </a>
            </div>
          </Reveal>
        </div>

        {/* RIGHT — slideshow eases in alongside the headline */}
        <Reveal delay={250} y={32}>
          {rightSlot}
        </Reveal>
      </div>
    </section>
  );
}
