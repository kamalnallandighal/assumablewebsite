import { FunnelCard } from './FunnelCard';
import { Reveal } from '../ui/Reveal';

// Moved out of the hero. Now lives below HowItWorks as the primary
// engagement CTA once the user understands the assumption story.
export function FunnelSection() {
  return (
    <section id="find-your-home" className="px-6 md:px-14 py-20 bg-cream">
      <div className="max-w-[1160px] mx-auto grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-10 md:gap-[72px] items-center">
        <Reveal>
          <div className="eyebrow">Get started</div>
          <h2 className="font-serif font-normal text-[40px] md:text-[52px] leading-[1.05] tracking-[-.02em] text-ink mt-3">
            Find your dream home.
          </h2>
          <p className="text-muted-2 text-base md:text-[17px] leading-[1.55] mt-5 max-w-[480px]">
            Six quick questions about budget, area, and use — we hand you back a pre-filtered
            list of homes whose assumable loan matches what you actually need.
          </p>
          <p className="text-muted-2 text-sm mt-4">
            Every step is optional. Takes about 90 seconds.
          </p>
        </Reveal>
        <Reveal delay={160} y={32}>
          <FunnelCard />
        </Reveal>
      </div>
    </section>
  );
}
