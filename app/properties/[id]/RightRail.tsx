'use client';
import { useState } from 'react';
import type { Listing } from '../../../lib/listings/types';
import { formatMoney } from '../../../lib/format';

interface Props {
  listing: Listing;
}

const DAYS = ['Fri', 'Sat', 'Sun', 'Mon', 'Tue'];
const TIMES = ['10:00am', '11:30am', '1:00pm', '2:30pm', '4:00pm', '5:30pm'];

function CheckIcon({ size = 14 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={size}
      height={size}
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={20}
      height={20}
    >
      <path d="M12 2v20M17 6H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" />
    </svg>
  );
}

export function RightRail({ listing }: Props) {
  const [dayIdx, setDayIdx] = useState<number>(1);
  const [timeIdx, setTimeIdx] = useState<number>(2);
  const [virtual, setVirtual] = useState(false);
  const [tourRequested, setTourRequested] = useState(false);
  const [downPercent, setDownPercent] = useState(11);

  const downAmount = Math.round((listing.price * downPercent) / 100);
  const scaledMonthly = Math.round(listing.assumedMonthly * (downPercent / 10));

  return (
    <div className="sticky top-[92px] flex flex-col gap-4">
      {/* Tour card or tour-requested */}
      {!tourRequested ? (
        <div className="bg-paper border border-line rounded-2xl p-7 shadow-md">
          <div className="font-serif font-normal text-[26px] tracking-[-.02em]">Tour this home</div>
          <div className="text-[13px] text-muted-2 mt-1.5">
            In person or virtual. No signup needed.
          </div>

          {/* Day picker */}
          <div className="grid grid-cols-5 gap-1.5 mt-5">
            {DAYS.map((d, i) => {
              const active = dayIdx === i;
              return (
                <button
                  key={d}
                  onClick={() => setDayIdx(i)}
                  className={`py-2.5 rounded-[10px] flex flex-col items-center font-medium border ${
                    active
                      ? 'bg-ink text-paper border-ink'
                      : 'bg-paper text-ink border-line-2 hover:border-ink'
                  }`}
                >
                  <span className="text-[10px] opacity-70">{d}</span>
                  <span className="text-base">{25 + i}</span>
                </button>
              );
            })}
          </div>

          {/* Time picker */}
          <div className="grid grid-cols-3 gap-1.5 mt-3">
            {TIMES.map((t, i) => {
              const active = timeIdx === i;
              return (
                <button
                  key={t}
                  onClick={() => setTimeIdx(i)}
                  className={`py-2 rounded-[10px] text-[13px] font-medium border ${
                    active
                      ? 'bg-ink text-paper border-ink'
                      : 'bg-paper text-ink border-line-2 hover:border-ink'
                  }`}
                >
                  {t}
                </button>
              );
            })}
          </div>

          {/* Virtual toggle */}
          <div className="mt-4 flex items-center justify-between px-3.5 py-2.5 bg-cream rounded-md text-[13px]">
            <span>Prefer virtual tour?</span>
            <button
              onClick={() => setVirtual((v) => !v)}
              aria-pressed={virtual}
              className={`w-9 h-5 rounded-pill relative transition-colors ${
                virtual ? 'bg-ink' : 'bg-line-2'
              }`}
            >
              <span
                className={`absolute top-0.5 w-4 h-4 rounded-full bg-paper transition-all ${
                  virtual ? 'left-[18px]' : 'left-0.5'
                }`}
              />
            </button>
          </div>

          <button
            onClick={() => setTourRequested(true)}
            className="w-full mt-4 py-3.5 px-6 rounded-pill bg-ink text-paper text-[15px] font-semibold hover:bg-ink-2"
          >
            Book a tour — {DAYS[dayIdx]} {25 + dayIdx} @ {TIMES[timeIdx]}
          </button>
          <div className="text-[11px] text-muted text-center mt-2.5">
            Free · No commitment · Typical reply in 15 min
          </div>
        </div>
      ) : (
        <div className="bg-paper border border-line rounded-2xl p-7 shadow-md">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-ok text-paper grid place-items-center">
              <CheckIcon size={14} />
            </div>
            <div className="font-serif text-[22px] tracking-[-.02em]">Tour requested</div>
          </div>
          <div className="text-[13px] text-muted-2 mt-2.5">
            <strong className="text-ink">
              {DAYS[dayIdx]}, April {25 + dayIdx} at {TIMES[timeIdx]}
            </strong>
            <br />
            {virtual ? 'Virtual tour' : `In-person at ${listing.address.split(',')[0]}`}
          </div>
          <div className="mt-5 p-4 bg-cream rounded-[14px]">
            <div className="text-[13px] font-semibold mb-2.5">
              Where should we send confirmation?
            </div>
            <input
              type="email"
              placeholder="Email"
              className="w-full border border-line-2 rounded-pill px-5 py-3.5 text-sm focus:outline-none focus:border-ink mb-2"
            />
            <input
              type="tel"
              placeholder="Phone (for tour-day texts)"
              className="w-full border border-line-2 rounded-pill px-5 py-3.5 text-sm focus:outline-none focus:border-ink"
            />
            <button className="w-full mt-2.5 py-3.5 px-6 rounded-pill bg-ink text-paper text-[15px] font-semibold hover:bg-ink-2">
              Confirm tour
            </button>
          </div>
          <button
            onClick={() => setTourRequested(false)}
            className="mt-3 text-[11px] text-muted-2 underline underline-offset-2"
          >
            Pick a different time
          </button>
          <div className="text-[11px] text-muted text-center mt-3">
            We'll only use your contact for this tour.
          </div>
        </div>
      )}

      {/* Investor CTA */}
      <div className="bg-terra-soft border border-terra rounded-2xl p-6">
        <div className="flex gap-3">
          <div className="w-11 h-11 rounded-md bg-terra text-paper grid place-items-center shrink-0">
            <DollarIcon />
          </div>
          <div>
            <div className="font-serif font-normal text-[20px] tracking-[-.02em] text-terra-ink">
              Investor?
            </div>
            <div className="text-[13px] text-terra-ink/80 mt-1 leading-[1.5]">
              {listing.loanType === 'VA'
                ? 'This VA loan can be assumed and rented. Talk to Jeff about the ROI math.'
                : 'FHA is primary-residence only. But Jeff has VA assumables in the same area.'}
            </div>
          </div>
        </div>
        <button className="w-full mt-4 py-3 px-5 rounded-pill bg-terra text-paper text-sm font-medium hover:bg-[#B9472A]">
          Discuss ROI with an agent
        </button>
      </div>

      {/* Agent strip */}
      <div className="bg-paper border border-line rounded-lg p-4 flex items-center gap-3">
        <div
          className="w-10 h-10 rounded-full shrink-0"
          style={{
            backgroundImage: 'repeating-linear-gradient(45deg, #b8aca3 0 2px, #c9bfb7 2px 4px)'
          }}
        />
        <div className="flex-1 min-w-0">
          <div className="text-[13px] font-semibold">Jeff Salazar</div>
          <div className="text-[11px] text-muted-2">Active now · (602) 332-3860</div>
        </div>
        <button className="px-3.5 py-2 rounded-pill border border-line-2 text-[13px] font-medium hover:border-ink">
          Chat
        </button>
      </div>

      {/* Payment calculator */}
      <div className="bg-cream rounded-lg p-5">
        <div className="text-[13px] font-semibold">Payment calculator</div>
        <div className="mt-3.5 text-xs text-muted-2">
          Down payment
          <div className="flex justify-between mt-1">
            <span className="text-[13px] text-ink font-medium">
              {formatMoney(downAmount)} ({downPercent}%)
            </span>
          </div>
          <input
            type="range"
            min={5}
            max={35}
            step={1}
            value={downPercent}
            onChange={(e) => setDownPercent(Number(e.target.value))}
            className="w-full mt-2 accent-ink"
          />
        </div>
        <div className="flex justify-between mt-4 text-sm">
          <span className="text-muted-2">Your payment</span>
          <span className="font-semibold text-navy">{formatMoney(scaledMonthly)}/mo</span>
        </div>
      </div>
    </div>
  );
}
