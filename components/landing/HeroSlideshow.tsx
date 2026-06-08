'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Listing } from '../../lib/listings/types';
import { formatMoney, formatRate } from '../../lib/format';

interface Props {
  listings: readonly Listing[];
}

const AUTO_ADVANCE_MS = 4000;

export function HeroSlideshow({ listings }: Props) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || listings.length <= 1) return;
    const id = setInterval(() => {
      setCurrent((c) => (c + 1) % listings.length);
    }, AUTO_ADVANCE_MS);
    return () => clearInterval(id);
  }, [paused, listings.length]);

  if (listings.length === 0) return null;

  const next = () => setCurrent((c) => (c + 1) % listings.length);
  const prev = () => setCurrent((c) => (c - 1 + listings.length) % listings.length);

  const padded = (n: number) => String(n).padStart(2, '0');

  return (
    <div
      className="group relative aspect-square rounded-[24px] overflow-hidden bg-ink border-[1.5px] border-terra"
      style={{ boxShadow: '0 24px 48px rgba(15, 22, 35, 0.18)' }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured assumable homes"
    >
      {listings.map((l, i) => {
        const street = l.address.split(',')[0] ?? l.address;
        const city = l.address.split(',').slice(1).join(',').trim();
        const isActive = i === current;
        return (
          <div
            key={l.id}
            className={`absolute inset-0 transition-opacity duration-700 ease-out ${
              isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            aria-hidden={!isActive}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${listings.length}: ${street}`}
          >
            {l.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={l.photo}
                alt={l.address}
                className="absolute inset-0 w-full h-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            ) : (
              <div className="absolute inset-0 skeleton-img">no photo</div>
            )}

            {/* Clean 2-stop gradient: dark at the base, transparent up top */}
            <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-ink/85 to-transparent pointer-events-none" />

            {/* Editorial counter — top-left, sits on the photo */}
            <div className="absolute top-5 left-5 text-white text-[11px] font-medium tracking-[.16em] uppercase tabular-nums">
              {padded(i + 1)} <span className="text-white/55">/</span> {padded(listings.length)}
            </div>

            {/* Rate badge — top-right, layered cream tile */}
            {l.loanType && (
              <div
                className="absolute top-5 right-5 bg-paper rounded-xl px-3.5 py-2 border border-line"
                style={{ boxShadow: '0 4px 12px rgba(15,22,35,.12)' }}
              >
                <div className="text-[9px] font-bold tracking-[.16em] text-terra uppercase">
                  {l.loanType} Assumable
                </div>
                <div className="font-serif text-[22px] leading-none mt-1 tracking-[-.02em] text-ink">
                  {formatRate(l.rate)}
                </div>
              </div>
            )}

            {/* Bottom content overlay */}
            <div className="absolute inset-x-0 bottom-0 p-7 text-white">
              <div className="font-serif text-[28px] leading-[1.1] tracking-[-.01em]">
                {street}
              </div>
              {city && (
                <div className="text-[13px] text-white/70 mt-1">{city}</div>
              )}

              <div className="mt-5 flex items-end justify-between gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-[.16em] text-white/55">
                    Asking
                  </div>
                  <div className="font-serif text-[28px] mt-0.5 leading-none tracking-[-.02em]">
                    {formatMoney(l.price)}
                  </div>
                </div>
                <Link
                  href={`/properties/${l.id}`}
                  className="bg-paper text-ink text-[13px] font-medium px-4 py-2.5 rounded-pill hover:bg-cream whitespace-nowrap transition-colors"
                >
                  View home →
                </Link>
              </div>
            </div>
          </div>
        );
      })}

      {/* Thin terra progress bar — fills as the auto-advance counts down.
          Key on `current` restarts the animation when slide changes. Pauses
          via inline-style animation-play-state when user is hovering. */}
      <div className="absolute top-0 inset-x-0 h-[2px] bg-white/15 z-20 pointer-events-none">
        <div
          key={`progress-${current}`}
          className="h-full bg-terra origin-left"
          style={{
            animation: `slide-progress ${AUTO_ADVANCE_MS}ms linear forwards`,
            animationPlayState: paused ? 'paused' : 'running'
          }}
        />
      </div>

      {/* Side arrows — appear on hover, refined */}
      <button
        type="button"
        onClick={prev}
        aria-label="Previous home"
        className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-paper/95 text-ink text-lg leading-none flex items-center justify-center shadow-md hover:bg-paper hover:text-terra opacity-0 group-hover:opacity-100 transition-all"
      >
        ‹
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Next home"
        className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-paper/95 text-ink text-lg leading-none flex items-center justify-center shadow-md hover:bg-paper hover:text-terra opacity-0 group-hover:opacity-100 transition-all"
      >
        ›
      </button>
    </div>
  );
}
