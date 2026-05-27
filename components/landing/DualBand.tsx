'use client';

import { useState, type FormEvent } from 'react';

export function DualBand() {
  const [email, setEmail] = useState('');

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    console.log('offmarket.submit', email);
    setEmail('');
  }

  return (
    <section id="off-market" className="px-6 md:px-10 py-16 md:py-24 bg-paper">
      <div className="max-w-[1280px] mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Investor */}
          <div className="bg-terra-soft border border-terra rounded-[24px] p-10 flex flex-col">
            <div className="text-xs uppercase tracking-widest text-terra-ink">
              For investors
            </div>
            <h3 className="font-serif font-normal text-[28px] md:text-[34px] tracking-tight text-terra-ink mt-3 leading-[1.1]">
              VA assumables cash-flow from day one.
            </h3>
            <p className="text-sm text-terra-ink/80 leading-[1.6] mt-4 flex-1">
              Sub-3% rates locked for 25+ years on properties you can rent out. Jeff
              walks through the ROI math on any listing.
            </p>
            <a
              href="mailto:jeff@assumablehomesaz.com?subject=Investor%20Inquiry"
              className="mt-6 self-start inline-flex items-center gap-2 bg-terra text-white text-sm px-5 py-3 rounded-pill hover:opacity-90"
            >
              See investor inventory
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M5 12h14M13 5l7 7-7 7" />
              </svg>
            </a>
          </div>
          {/* Off-market */}
          <div className="bg-ink text-paper rounded-[24px] p-10 flex flex-col">
            <div className="text-xs uppercase tracking-widest text-terra">
              Off-market
            </div>
            <h3 className="font-serif font-normal text-[28px] md:text-[34px] tracking-tight text-white mt-3 leading-[1.1]">
              47 homes not on Zillow.
            </h3>
            <p className="text-sm text-white/65 leading-[1.6] mt-4 flex-1">
              Pocket listings and pre-MLS inventory from Jeff&apos;s title-company network.
              Email-only, updates every 3 days.
            </p>
            <form
              onSubmit={onSubmit}
              className="mt-6 flex gap-2 max-w-[400px]"
              id="offmarket-form"
            >
              <input
                type="email"
                required
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 bg-white/5 border border-white/15 text-white placeholder-white/40 rounded-pill px-4 py-2.5 text-sm outline-none focus:border-white/40"
              />
              <button
                type="submit"
                className="bg-terra text-white text-sm px-5 py-2.5 rounded-pill hover:opacity-90"
              >
                Unlock
              </button>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}
