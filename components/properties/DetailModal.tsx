'use client';
import { useState, useEffect, useMemo } from 'react';
import type { Listing } from '../../lib/listings/types';
import { formatMoney, formatRate } from '../../lib/format';
import {
  galleryFor,
  descriptionFor,
  featuresFor,
  propertyDetailsFor
} from '../../lib/listings/fake-details';

interface Props {
  listing: Listing | null;
  onClose: () => void;
  onContactAgent: (listingId: string) => void;
}

const loanBadgeClass: Record<string, string> = {
  VA: 'bg-navy text-white',
  FHA: 'bg-terra text-white',
  Conventional: 'bg-ink text-white'
};

// Payment calc note: we use the canonical listing.assumedMonthly (assumes 10% down)
// and linearly scale by downPercent/10, matching the original static-site UX.
function scaledMonthly(canonical: number, downPercent: number): number {
  return Math.round(canonical * (downPercent / 10));
}

function formatDateLabel(d: Date): string {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${days[d.getDay()]} · ${months[d.getMonth()]} ${d.getDate()}`;
}

function formatTimeLabel(slot: number): string {
  // slot is half-hour index from 9:00 (slot 0) through 18:00 (slot 18)
  const totalMinutes = 9 * 60 + slot * 30;
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const period = hour24 >= 12 ? 'pm' : 'am';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return `${hour12}:${minute.toString().padStart(2, '0')}${period}`;
}

export function DetailModal({ listing, onClose, onContactAgent }: Props) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [downPercent, setDownPercent] = useState(10);
  const [tourDate, setTourDate] = useState<string | null>(null);
  const [tourTime, setTourTime] = useState<string | null>(null);
  const [tourConfirmed, setTourConfirmed] = useState(false);
  const [openSections, setOpenSections] = useState<Set<string>>(
    new Set(['Interior'])
  );

  useEffect(() => {
    if (listing) {
      setPhotoIdx(0);
      setDownPercent(10);
      setTourDate(null);
      setTourTime(null);
      setTourConfirmed(false);
      setOpenSections(new Set(['Interior']));
    }
  }, [listing?.id]);

  // Escape key closes
  useEffect(() => {
    if (!listing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [listing, onClose]);

  // Lock body scroll while open
  useEffect(() => {
    if (!listing) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [listing]);

  const tourDates = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return { iso: d.toISOString().slice(0, 10), label: formatDateLabel(d) };
    });
  }, []);

  const timeSlots = useMemo(
    () => Array.from({ length: 19 }, (_, i) => formatTimeLabel(i)),
    []
  );

  if (!listing) return null;

  const photos = galleryFor(listing);
  const description = descriptionFor(listing);
  const features = featuresFor(listing);
  const sections = propertyDetailsFor(listing);

  const assumedM = scaledMonthly(listing.assumedMonthly, downPercent);
  const marketM = scaledMonthly(listing.marketMonthly, downPercent);
  const downAmount = Math.round((listing.price * downPercent) / 100);
  const totalSavings = Math.max(0, (marketM - assumedM) * 360);

  const toggleSection = (title: string) => {
    setOpenSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-ink/60 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-paper w-full inset-0 fixed rounded-none max-h-screen overflow-y-auto md:static md:rounded-card md:my-8 md:mx-auto md:max-w-3xl md:max-h-[calc(100vh-4rem)] md:shadow-lg"
        role="dialog"
        aria-modal="true"
      >
        {/* Topbar */}
        <div className="sticky top-0 z-10 flex items-center justify-between bg-paper border-b border-line px-4 py-3">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-ink text-2xl leading-none w-9 h-9 flex items-center justify-center hover:bg-cream rounded-full"
          >
            ×
          </button>
          <div className="hidden md:flex items-center gap-2">
            <button
              type="button"
              aria-label="Share"
              className="text-sm text-ink border border-line rounded-pill px-3 py-1.5 hover:bg-cream"
            >
              Share
            </button>
            <button
              type="button"
              aria-label="Save"
              className="text-sm text-ink border border-line rounded-pill px-3 py-1.5 hover:bg-cream"
            >
              Save
            </button>
          </div>
        </div>

        {/* Gallery */}
        <div className="relative aspect-video bg-line">
          {photos.map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              key={src}
              src={src}
              alt={`${listing.address} photo ${i + 1}`}
              className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-300 ${
                i === photoIdx ? 'opacity-100' : 'opacity-0'
              }`}
            />
          ))}
          <button
            type="button"
            aria-label="Previous photo"
            onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-paper/90 text-ink flex items-center justify-center hover:bg-paper"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="Next photo"
            onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-paper/90 text-ink flex items-center justify-center hover:bg-paper"
          >
            ›
          </button>
          <div className="absolute top-3 right-3 bg-ink/70 text-white text-xs px-2 py-1 rounded-pill">
            {photoIdx + 1} / {photos.length}
          </div>
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
            {photos.map((_, i) => (
              <button
                key={i}
                type="button"
                aria-label={`Photo ${i + 1}`}
                onClick={() => setPhotoIdx(i)}
                className={`w-2 h-2 rounded-full ${
                  i === photoIdx ? 'bg-paper' : 'bg-paper/50'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Header */}
        <div className="px-5 py-5 border-b border-line">
          <div className="font-serif text-3xl text-ink">{formatMoney(listing.price)}</div>
          <div className="text-sm text-ink mt-1">{listing.address}</div>
          <div className="flex flex-wrap gap-2 mt-3">
            <span className="text-xs text-ink border border-line rounded-pill px-2.5 py-1">
              {listing.beds} bd
            </span>
            <span className="text-xs text-ink border border-line rounded-pill px-2.5 py-1">
              {listing.baths} ba
            </span>
            <span className="text-xs text-ink border border-line rounded-pill px-2.5 py-1">
              {listing.sqft.toLocaleString()} sqft
            </span>
            {listing.isAssumable && (
              <span className="text-xs bg-ok text-white rounded-pill px-2.5 py-1">
                Assumable {formatRate(listing.rate)}
              </span>
            )}
            {listing.loanType && (
              <span
                className={`text-xs rounded-pill px-2.5 py-1 ${
                  loanBadgeClass[listing.loanType] ?? 'bg-ink text-white'
                }`}
              >
                {listing.loanType}
              </span>
            )}
          </div>
        </div>

        {/* About */}
        <section className="px-5 py-5 border-b border-line">
          <h3 className="font-serif text-xl text-ink mb-2">About this home</h3>
          <p className="text-sm text-ink/80 leading-relaxed">{description}</p>
        </section>

        {/* Features */}
        <section className="px-5 py-5 border-b border-line">
          <h3 className="font-serif text-xl text-ink mb-3">Features</h3>
          <ul className="grid grid-cols-2 md:grid-cols-4 gap-y-2 gap-x-3">
            {features.map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-ink/80">
                <span className="w-1.5 h-1.5 rounded-full bg-terra" />
                {f}
              </li>
            ))}
          </ul>
        </section>

        {/* Payment Calculator */}
        <section className="px-5 py-5 border-b border-line">
          <h3 className="font-serif text-xl text-ink mb-3">Payment calculator</h3>
          <div className="flex items-baseline justify-between mb-2">
            <label htmlFor="down-slider" className="text-sm text-ink">
              Down payment
            </label>
            <div className="text-sm text-ink">
              <span className="font-serif text-base">{downPercent}%</span>{' '}
              <span className="text-muted">· {formatMoney(downAmount)}</span>
            </div>
          </div>
          <input
            id="down-slider"
            type="range"
            min={5}
            max={20}
            step={1}
            value={downPercent}
            onChange={(e) => setDownPercent(parseInt(e.target.value, 10))}
            className="w-full accent-terra"
          />
          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="bg-cream rounded-card p-3">
              <div className="text-xs text-muted">Assumed ({formatRate(listing.rate)})</div>
              <div className="font-serif text-2xl text-ink">
                {formatMoney(assumedM)}
                <span className="text-sm text-muted font-sans">/mo</span>
              </div>
            </div>
            <div className="bg-cream rounded-card p-3">
              <div className="text-xs text-muted">Market ({formatRate(listing.marketRate)})</div>
              <div className="font-serif text-2xl text-ink">
                {formatMoney(marketM)}
                <span className="text-sm text-muted font-sans">/mo</span>
              </div>
            </div>
          </div>
          {totalSavings > 0 && (
            <div className="mt-3 bg-terra-soft text-terra-ink rounded-card px-3 py-2.5 text-sm">
              Save <strong>{formatMoney(totalSavings)}</strong> over the life of the loan
            </div>
          )}
        </section>

        {/* Tour Scheduler */}
        <section className="px-5 py-5 border-b border-line">
          <h3 className="font-serif text-xl text-ink mb-3">Schedule a tour</h3>
          {tourConfirmed ? (
            <div className="bg-cream rounded-card p-4 text-sm text-ink">
              Tour requested for{' '}
              <strong>
                {tourDates.find((d) => d.iso === tourDate)?.label ?? tourDate}
              </strong>{' '}
              at <strong>{tourTime}</strong>. Jeff will confirm shortly.
            </div>
          ) : (
            <>
              <div className="text-xs text-muted mb-2">Pick a day</div>
              <div className="flex flex-wrap gap-2 mb-4">
                {tourDates.map((d) => (
                  <button
                    key={d.iso}
                    type="button"
                    onClick={() => {
                      setTourDate(d.iso);
                      setTourTime(null);
                    }}
                    className={`text-xs rounded-pill px-3 py-1.5 border transition-colors ${
                      tourDate === d.iso
                        ? 'bg-ink text-white border-ink'
                        : 'bg-paper text-ink border-line hover:border-ink'
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
              {tourDate && (
                <>
                  <div className="text-xs text-muted mb-2">Pick a time</div>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {timeSlots.map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => setTourTime(t)}
                        className={`text-xs rounded-pill px-3 py-1.5 border transition-colors ${
                          tourTime === t
                            ? 'bg-ink text-white border-ink'
                            : 'bg-paper text-ink border-line hover:border-ink'
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </>
              )}
              <button
                type="button"
                disabled={!tourDate || !tourTime}
                onClick={() => setTourConfirmed(true)}
                className="w-full bg-ink text-white text-sm py-2.5 rounded-pill disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Confirm tour
              </button>
            </>
          )}
        </section>

        {/* Property Details accordion */}
        <section className="px-5 py-5 border-b border-line">
          <h3 className="font-serif text-xl text-ink mb-3">Property details</h3>
          <div className="space-y-2">
            {sections.map((section) => {
              const isOpen = openSections.has(section.title);
              return (
                <div key={section.title} className="border border-line rounded-card">
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title)}
                    aria-expanded={isOpen}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left text-sm text-ink"
                  >
                    <span className="font-medium">{section.title}</span>
                    <span className="text-muted">{isOpen ? '−' : '+'}</span>
                  </button>
                  {isOpen && (
                    <div className="px-3 pb-3 space-y-1.5">
                      {section.rows.map(([label, value]) => (
                        <div
                          key={label}
                          className="flex justify-between text-sm border-b border-line/60 last:border-0 py-1"
                        >
                          <span className="text-muted">{label}</span>
                          <span className="text-ink">{value}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Contact agent */}
        <section className="px-5 py-5">
          <button
            type="button"
            onClick={() => onContactAgent(listing.id)}
            className="w-full bg-terra text-white text-sm py-3 rounded-pill hover:bg-terra/90"
          >
            Contact agent
          </button>
        </section>
      </div>
    </div>
  );
}
