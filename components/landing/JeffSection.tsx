const STATS = [
  { num: '80+', lbl: 'Assumptions closed' },
  { num: '12 yrs', lbl: 'Licensed in Arizona' },
  { num: '4.9★', lbl: 'Client rating, 140 reviews' },
  { num: '$0', lbl: 'Extra cost to work with Jeff' }
];

export function JeffSection() {
  return (
    <section id="agent" className="px-6 md:px-10 py-16 md:py-24 bg-ink text-paper">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center">
          {/* Left: photo */}
          <div className="order-1 lg:order-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/jeff.jpeg"
              alt="Jeff Salazar"
              className="w-full h-[320px] md:h-[460px] lg:h-[560px] object-cover object-top rounded-card"
            />
          </div>
          {/* Right: content */}
          <div className="order-2 lg:order-2">
            <div className="text-xs uppercase tracking-widest text-terra">
              Assumption Division
            </div>
            <h2 className="font-serif font-normal text-[38px] md:text-[64px] leading-[1.05] tracking-tight text-white mt-3">
              Jeff Salazar is a certified{' '}
              <em className="not-italic text-terra">assumption expert</em>.
            </h2>
            <p className="text-[15px] md:text-[17px] leading-[1.65] text-white/70 mt-6 max-w-[620px]">
              Jeff has completed{' '}
              <strong className="text-white">advanced training in loan assumptions</strong> —
              an area most agents overlook. He knows the detailed steps, the lender
              requirements, and how to guide buyers and sellers smoothly through the
              process. With Jeff, you&apos;re not just getting a realtor — you&apos;re getting
              a partner who turns a complex process into a straightforward opportunity.
            </p>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-10 border-t border-white/10 pt-8">
              {STATS.map((s) => (
                <div key={s.lbl}>
                  <div className="font-serif text-[28px] md:text-[32px] text-white leading-tight">
                    {s.num}
                  </div>
                  <div className="text-xs text-white/55 mt-1">{s.lbl}</div>
                </div>
              ))}
            </div>

            <div className="mt-10 inline-flex items-center gap-3 bg-white/5 border border-white/10 rounded-pill px-4 py-2">
              <span className="text-xs uppercase tracking-widest text-white/60">
                Contact Jeff
              </span>
              <a
                href="mailto:jeff@assumablehomesaz.com"
                aria-label="Email Jeff"
                className="w-9 h-9 rounded-full bg-terra text-white flex items-center justify-center hover:opacity-90"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="m3 7 9 6 9-6" />
                </svg>
              </a>
              <a
                href="tel:+16023323860"
                aria-label="Call Jeff"
                className="w-9 h-9 rounded-full bg-terra text-white flex items-center justify-center hover:opacity-90"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1A19.5 19.5 0 013.1 9.8 19.8 19.8 0 010 1.2 2 2 0 012 0h3a2 2 0 012 1.7c.1 1 .3 1.9.6 2.8a2 2 0 01-.4 2.1L5.9 7.9a16 16 0 006.3 6.3l1.3-1.3a2 2 0 012.1-.5c.9.3 1.8.5 2.8.6a2 2 0 011.7 2z" />
                </svg>
              </a>
            </div>
            <div className="text-xs text-white/50 mt-3">
              (602) 332-3860 · jeff@assumablehomesaz.com
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
