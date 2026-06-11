'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Listing } from '../../lib/listings/types';
import { formatMoney, formatRate } from '../../lib/format';

interface Props {
  listings: readonly Listing[];
}

// Per-slide choreography (ms):
//   0 ──────────── house crossfades in (HOUSE_FADE)
//   1000 ───────── chip fades in + starts its hover drift (CHIP_IN_DELAY)
//   5300 ───────── chip fades back out (CHIP_OUT_AT) — gone by ~5.9s
//   6000 ───────── advance → house crossfades to the next home (SLIDE_DURATION)
const SLIDE_DURATION = 6000;
const HOUSE_FADE = 1000;
const CHIP_IN_DELAY = 1000;
const CHIP_OUT_AT = 5300;

export function HeroSlideshow({ listings }: Props) {
  const [current, setCurrent] = useState(0);
  const [paused, setPaused] = useState(false);
  const [chipShown, setChipShown] = useState(false);

  // Auto-advance — per-slide timeout so timing resets cleanly and pause holds.
  useEffect(() => {
    if (paused || listings.length <= 1) return;
    const id = setTimeout(
      () => setCurrent((c) => (c + 1) % listings.length),
      SLIDE_DURATION
    );
    return () => clearTimeout(id);
  }, [current, paused, listings.length]);

  // Chip fade-in: each new slide hides the chip, then reveals it once the
  // house has settled (house fade + a 0.5s breath).
  useEffect(() => {
    setChipShown(false);
    const id = setTimeout(() => setChipShown(true), CHIP_IN_DELAY);
    return () => clearTimeout(id);
  }, [current]);

  // Chip fade-out before the slide advances — but hold it visible while the
  // user is hovering (auto-advance is paused, so the chip should linger).
  useEffect(() => {
    if (paused) return;
    const id = setTimeout(() => setChipShown(false), CHIP_OUT_AT);
    return () => clearTimeout(id);
  }, [current, paused]);

  if (listings.length === 0) return null;

  const next = () => setCurrent((c) => (c + 1) % listings.length);
  const prev = () => setCurrent((c) => (c - 1 + listings.length) % listings.length);

  const active = listings[current];

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
            className={`absolute inset-0 transition-opacity ease-in-out ${
              isActive ? 'opacity-100' : 'opacity-0 pointer-events-none'
            }`}
            style={{ transitionDuration: `${HOUSE_FADE}ms` }}
            aria-hidden={!isActive}
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${listings.length}: ${street}`}
          >
            {l.photo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={l.photo}
                alt={l.address}
                className="editorial-img absolute inset-0 w-full h-full object-cover"
                loading={i === 0 ? 'eager' : 'lazy'}
              />
            ) : (
              <div className="absolute inset-0 skeleton-img">no photo</div>
            )}

            {/* Clean 2-stop gradient: dark at the base, transparent up top */}
            <div className="absolute inset-x-0 bottom-0 h-[58%] bg-gradient-to-t from-ink/85 to-transparent pointer-events-none" />

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

      {/* Rate chip — choreographed in/out, gently hovering, points at the
          house. Lives outside the slide loop so it animates independently of
          the house crossfade. */}
      {active?.loanType && (
        <div className="absolute top-6 left-1/2 -translate-x-1/2 z-10 pointer-events-none">
          <div
            className="transition-opacity ease-out"
            style={{
              opacity: chipShown ? 1 : 0,
              transitionDuration: '600ms',
              animation: 'chip-float 4.5s ease-in-out infinite'
            }}
          >
            <div
              className="relative bg-paper rounded-2xl px-7 py-4 border border-line text-center"
              style={{ boxShadow: '0 8px 20px rgba(15,22,35,.18)' }}
            >
              <div className="text-[11px] font-bold tracking-[.16em] text-ink uppercase">
                {active.loanType} Assumable
              </div>
              <div className="font-serif font-bold text-[48px] leading-none mt-1.5 tracking-[-.02em] text-gold">
                {formatRate(active.rate)}
              </div>
              {/* Downward pointer — speech-bubble tail aimed at the house */}
              <div
                className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0"
                style={{
                  borderLeft: '11px solid transparent',
                  borderRight: '11px solid transparent',
                  borderTop: '13px solid #FFFFFF'
                }}
              />
            </div>
          </div>
        </div>
      )}

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
