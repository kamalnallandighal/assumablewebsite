'use client';
import { useState } from 'react';
import { listings } from '../../../lib/listings/data';
import { formatMoney } from '../../../lib/format';
import type { FunnelState } from './useFunnel';

interface Props {
  state: FunnelState;
  patch: (p: Partial<FunnelState>) => void;
}

const previews = listings.filter((l) => l.isAssumable).slice(0, 3);

export function StepResult({ state, patch }: Props) {
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Real backend wiring lands post-validation per the migration plan
    console.log('funnel.submit', { ...state });
    setSubmitted(true);
  };

  return (
    <div>
      <div className="mb-1 text-xs uppercase tracking-wider font-semibold text-muted-2">
        Step 6 of 6
      </div>
      <h2 className="font-serif text-3xl md:text-4xl text-ink leading-tight">
        Here&apos;s what fits.
      </h2>
      <p className="mt-2 text-sm text-muted-2">
        23 homes match your preferences. Jump into the full list, or have Jeff send the best 3
        to your inbox.
      </p>

      <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-3">
        {previews.map((l) => {
          const tagClass =
            l.loanType === 'VA'
              ? 'bg-navy text-white'
              : l.loanType === 'FHA'
              ? 'bg-terra text-white'
              : 'bg-line text-muted-2';
          return (
            <div
              key={l.id}
              className="rounded-card border border-line overflow-hidden bg-paper"
            >
              <div className="aspect-[4/3] bg-cream overflow-hidden">
                {l.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={l.photo}
                    alt={l.address}
                    className="w-full h-full object-cover"
                  />
                ) : null}
              </div>
              <div className="p-3">
                {l.loanType && (
                  <span
                    className={`inline-block text-[10px] font-semibold uppercase tracking-wider rounded-pill px-2 py-0.5 ${tagClass}`}
                  >
                    {l.loanType}
                  </span>
                )}
                <div className="mt-2 text-[13px] font-semibold text-ink truncate">
                  {l.address}
                </div>
                <div className="mt-1 text-xs text-muted-2">
                  {l.beds} bd · {l.baths} ba · {l.sqft.toLocaleString()} sqft
                </div>
                <div className="mt-1 text-xs font-medium text-navy">
                  {formatMoney(l.assumedMonthly)}/mo
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <form
        onSubmit={handleSubmit}
        className="mt-5 rounded-card bg-cream p-5 flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <div className="text-sm font-semibold text-ink">
            Want Jeff to hand-pick 3 that fit you?
          </div>
          <div className="mt-1 text-xs text-muted-2">
            He&apos;ll send them by email + set up a tour if you want one.
          </div>
        </div>
        <div className="flex gap-2 shrink-0">
          <input
            type="email"
            required
            value={state.email}
            onChange={(e) => patch({ email: e.target.value })}
            placeholder="you@email.com"
            className="min-w-[200px] rounded-pill border border-line bg-paper px-4 py-2 text-sm text-ink placeholder:text-muted focus:outline-none focus:border-ink"
          />
          <button
            type="submit"
            disabled={submitted}
            className="bg-navy text-white text-sm font-medium px-4 py-2 rounded-pill disabled:opacity-60"
          >
            {submitted ? 'Sent' : 'Send my matches'}
          </button>
        </div>
      </form>
    </div>
  );
}
