import type { ReactNode } from 'react';

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
      className="px-6 md:px-14 py-16 md:py-[88px] bg-gradient-to-b from-cream to-paper"
    >
      <div className="grid grid-cols-1 md:grid-cols-[1fr_1.05fr] gap-10 md:gap-[72px] items-center max-w-[1280px] mx-auto">
        {/* LEFT — value prop + stats + skip link */}
        <div>
          <div className="eyebrow mb-5">Arizona · 331 assumable listings</div>

          <h1 className="font-serif font-normal text-[38px] md:text-[56px] lg:text-[68px] leading-[1.02] tracking-[-.02em] text-ink">
            Shop Arizona homes
            <br />
            with <span className="text-terra">2–4%</span> assumable mortgages.
          </h1>

          <p className="text-muted-2 text-base md:text-[17px] leading-[1.55] mt-5 md:mt-[22px] max-w-[500px]">
            Every VA, FHA and USDA listing in the Valley with a takeover-ready loan — on-market
            and off. Save $1,500+ a month versus today&apos;s rates.
          </p>

          {/* 2x2 social-proof stats grid */}
          <div className="mt-10 grid grid-cols-2 gap-6 max-w-[460px]">
            {STATS.map(([num, label]) => (
              <div key={label}>
                <div className="font-serif text-[28px] md:text-[32px] font-normal tracking-[-.02em] text-ink">
                  {num}
                </div>
                <div className="text-xs text-muted-2 mt-0.5">{label}</div>
              </div>
            ))}
          </div>

          <div className="mt-8">
            <a
              href="/properties"
              className="text-sm text-muted-2 underline underline-offset-4 hover:text-ink"
            >
              Or skip and browse the map →
            </a>
          </div>
        </div>

        {/* RIGHT — slot supplied by parent (was funnel, now slideshow) */}
        <div>{rightSlot}</div>
      </div>
    </section>
  );
}
