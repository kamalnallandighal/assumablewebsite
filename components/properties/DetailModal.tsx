'use client';
import { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
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
  // Optional pagination through the visible list (powers "2 of 8" + arrows).
  index?: number;
  total?: number;
  onPrev?: () => void;
  onNext?: () => void;
}

function loanTagClass(t: Listing['loanType']): string {
  if (t === 'VA') return 'tag tag-va';
  if (t === 'FHA') return 'tag tag-fha';
  return 'tag tag-dim';
}

function splitAddress(full: string): { street: string; cityRegion: string } {
  const idx = full.indexOf(',');
  if (idx === -1) return { street: full, cityRegion: '' };
  return {
    street: full.slice(0, idx).trim(),
    cityRegion: full.slice(idx + 1).trim()
  };
}

// Linear scale of the canonical 10%-down monthly figure. Matches prior calc.
function scaledMonthly(canonical: number, downPercent: number): number {
  return Math.round(canonical * (downPercent / 10));
}

function formatDayLabel(d: Date): { day: string; numeral: string } {
  const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return { day: days[d.getDay()], numeral: String(d.getDate()) };
}

function formatTimeLabel(slot: number): string {
  // slot is half-hour index from 9:00 (slot 0) through 18:00.
  const totalMinutes = 9 * 60 + slot * 30;
  const hour24 = Math.floor(totalMinutes / 60);
  const minute = totalMinutes % 60;
  const period = hour24 >= 12 ? 'pm' : 'am';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  return minute === 0 ? `${hour12}${period}` : `${hour12}:${minute.toString().padStart(2, '0')}${period}`;
}

const TIME_SLOT_INDICES = [2, 5, 8, 11, 14, 17]; // 10am, 11:30, 1pm, 2:30, 4pm, 5:30

export function DetailModal({
  listing,
  onClose,
  onContactAgent,
  index,
  total,
  onPrev,
  onNext
}: Props) {
  const [photoIdx, setPhotoIdx] = useState(0);
  const [downPercent, setDownPercent] = useState(11);
  const [tourDayIdx, setTourDayIdx] = useState<number | null>(1); // Default Sat selected per design
  const [tourSlot, setTourSlot] = useState<number | null>(8); // Default 1pm
  const [tourConfirmed, setTourConfirmed] = useState(false);

  useEffect(() => {
    if (listing) {
      setPhotoIdx(0);
      setDownPercent(11);
      setTourDayIdx(1);
      setTourSlot(8);
      setTourConfirmed(false);
    }
  }, [listing?.id]);

  useEffect(() => {
    if (!listing) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext) onNext();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [listing, onClose, onPrev, onNext]);

  useEffect(() => {
    if (!listing) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [listing]);

  const tourDays = useMemo(() => {
    const today = new Date();
    return Array.from({ length: 5 }, (_, i) => {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      return formatDayLabel(d);
    });
  }, [listing?.id]);

  if (!listing) return null;

  const photos = galleryFor(listing);
  const description = descriptionFor(listing);
  const features = featuresFor(listing);
  const sections = propertyDetailsFor(listing);
  const factRows = sections.flatMap((s) => s.rows).slice(0, 8);

  const { street, cityRegion } = splitAddress(listing.address);
  const downAmount = Math.round((listing.price * downPercent) / 100);
  const scaledM = scaledMonthly(listing.assumedMonthly, downPercent);
  const cashToClose = downAmount + 3200;

  const selectedTime = tourSlot !== null ? formatTimeLabel(tourSlot) : null;
  const selectedDay = tourDayIdx !== null ? tourDays[tourDayIdx] : null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-ink/55 backdrop-blur-[2px] pt-[60px] pb-10 px-4"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full md:w-[min(1120px,calc(100%-80px))] bg-paper rounded-xl shadow-modal overflow-hidden flex flex-col"
        style={{ maxHeight: 'calc(100vh - 120px)' }}
      >
        {/* Top bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-line bg-paper shrink-0">
          <div className="flex items-center gap-2.5">
            <button
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-ink border border-line-2 rounded-pill hover:border-ink"
            >
              ← Back to map
            </button>
            {typeof index === 'number' && typeof total === 'number' && total > 0 && (
              <>
                <span className="text-xs text-muted-2">
                  {index + 1} of {total}
                </span>
                <div className="flex gap-1">
                  <button
                    onClick={onPrev}
                    disabled={!onPrev}
                    aria-label="Previous listing"
                    className="w-[26px] h-[26px] border border-line-2 bg-paper rounded-md text-xs leading-none disabled:opacity-40 hover:border-ink"
                  >
                    ‹
                  </button>
                  <button
                    onClick={onNext}
                    disabled={!onNext}
                    aria-label="Next listing"
                    className="w-[26px] h-[26px] border border-line-2 bg-paper rounded-md text-xs leading-none disabled:opacity-40 hover:border-ink"
                  >
                    ›
                  </button>
                </div>
              </>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                const url = `${window.location.origin}/properties/${listing.id}`;
                if (navigator.share) {
                  navigator.share({ title: listing.address, url }).catch(() => {});
                } else {
                  navigator.clipboard?.writeText(url);
                }
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-ink border border-line-2 rounded-pill hover:border-ink"
            >
              <ShareIcon /> Share
            </button>
            <button
              className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-2 text-[13px] font-medium text-ink border border-line-2 rounded-pill hover:border-ink"
              aria-label="Save listing"
            >
              <HeartIcon /> Save
            </button>
            <button
              onClick={onClose}
              aria-label="Close"
              className="w-8 h-8 border border-line-2 bg-paper rounded-md text-lg leading-none hover:border-ink"
            >
              ×
            </button>
          </div>
        </div>

        {/* Body — scroll */}
        <div className="overflow-y-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-[1.5fr_1fr]">
            {/* LEFT — gallery + content */}
            <div className="p-7">
              {/* Gallery 2fr/1fr */}
              <div className="grid grid-cols-1 md:grid-cols-[2fr_1fr] gap-1.5 rounded-[14px] overflow-hidden">
                <GalleryTile src={photos[photoIdx % photos.length]} label="front" height={320} />
                <div className="grid gap-1.5">
                  <GalleryTile src={photos[1 % photos.length]} label="kitchen" height={157} />
                  <GalleryTile src={photos[2 % photos.length]} label="backyard" height={157} />
                </div>
              </div>
              {photos.length > 1 && (
                <div className="mt-3 flex items-center gap-2">
                  <button
                    onClick={() => setPhotoIdx((i) => (i - 1 + photos.length) % photos.length)}
                    className="px-2 py-1 text-xs rounded-pill border border-line-2 hover:border-ink"
                  >
                    ‹
                  </button>
                  <span className="text-xs text-muted">
                    {(photoIdx % photos.length) + 1} / {photos.length}
                  </span>
                  <button
                    onClick={() => setPhotoIdx((i) => (i + 1) % photos.length)}
                    className="px-2 py-1 text-xs rounded-pill border border-line-2 hover:border-ink"
                  >
                    ›
                  </button>
                </div>
              )}

              {/* Tags */}
              <div className="flex gap-2 mt-5">
                {listing.loanType && (
                  <span className={loanTagClass(listing.loanType)}>
                    {listing.loanType} · {formatRate(listing.rate)}
                  </span>
                )}
                <span className="tag tag-ok">Assumable</span>
              </div>

              {/* Address */}
              <h2 className="font-serif font-normal mt-2.5 mb-1.5 leading-[1.05] tracking-[-.02em] text-[38px] text-ink">
                {street}
              </h2>
              <div className="text-sm text-muted-2">{cityRegion}</div>
              <div className="flex gap-5 mt-3.5 text-[13px]">
                <span>
                  <strong>{listing.beds}</strong> bd
                </span>
                <span>
                  <strong>{listing.baths}</strong> ba
                </span>
                <span>
                  <strong>{listing.sqft.toLocaleString()}</strong> sqft
                </span>
              </div>

              {/* Assumable advantage block */}
              <div className="mt-6 p-5 bg-cream rounded-lg">
                <div className="eyebrow mb-3" style={{ fontSize: 10 }}>
                  Assumable advantage
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <div className="text-[11px] text-muted-2">Monthly</div>
                    <div className="font-serif font-normal text-[28px] tracking-[-.02em] mt-1 text-navy">
                      {formatMoney(listing.assumedMonthly)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-2">Rate</div>
                    <div className="font-serif font-normal text-[28px] tracking-[-.02em] mt-1">
                      {formatRate(listing.rate)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[11px] text-muted-2">Equity needed</div>
                    <div className="font-serif font-normal text-[28px] tracking-[-.02em] mt-1">
                      {formatMoney(listing.downPayment)}
                    </div>
                    <div className="text-[11px] text-muted-2 mt-0.5">Down payment</div>
                  </div>
                </div>
              </div>

              {/* Description */}
              <p className="text-sm text-ink leading-[1.7] mt-6 max-w-[560px]">{description}</p>

              {/* Facts & features */}
              <div className="mt-6">
                <div className="eyebrow mb-3" style={{ fontSize: 10 }}>
                  Facts &amp; features
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
                  {factRows.map(([k, v]) => (
                    <div
                      key={k}
                      className="flex justify-between py-2.5 border-b border-line text-xs"
                    >
                      <span className="text-muted-2">{k}</span>
                      <span className="text-ink font-medium text-right">{v}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-3.5 grid grid-cols-2 md:grid-cols-4 gap-1.5">
                  {features.map((f) => (
                    <div
                      key={f}
                      className="px-2.5 py-2.5 bg-paper border border-line rounded-md text-[11px] text-ink flex items-center gap-1.5"
                    >
                      <CheckIcon /> <span className="truncate">{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link
                href={`/properties/${listing.id}`}
                className="inline-block mt-4 text-[13px] text-ink underline underline-offset-2"
              >
                View full property page →
              </Link>
            </div>

            {/* RIGHT — booking rail */}
            <div className="bg-cream p-7 border-t md:border-t-0 md:border-l border-line">
              {!tourConfirmed ? (
                <>
                  <div className="font-serif font-normal text-[22px] tracking-[-.02em]">
                    Tour this home
                  </div>
                  <div className="text-xs text-muted-2 mt-1">
                    In person or virtual · No signup needed
                  </div>

                  {/* Day picker */}
                  <div className="grid grid-cols-5 gap-1.5 mt-4">
                    {tourDays.map((d, i) => {
                      const active = tourDayIdx === i;
                      return (
                        <button
                          key={i}
                          onClick={() => setTourDayIdx(i)}
                          className={`py-2.5 rounded-[9px] flex flex-col items-center font-medium border ${
                            active
                              ? 'bg-ink text-paper border-ink'
                              : 'bg-paper text-ink border-line-2 hover:border-ink'
                          }`}
                        >
                          <span className="text-[9px] opacity-70">{d.day}</span>
                          <span className="text-sm">{d.numeral}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Time picker */}
                  <div className="grid grid-cols-3 gap-1.5 mt-2.5">
                    {TIME_SLOT_INDICES.map((slot) => {
                      const active = tourSlot === slot;
                      return (
                        <button
                          key={slot}
                          onClick={() => setTourSlot(slot)}
                          className={`py-2 rounded-[9px] text-xs font-medium border ${
                            active
                              ? 'bg-ink text-paper border-ink'
                              : 'bg-paper text-ink border-line-2 hover:border-ink'
                          }`}
                        >
                          {formatTimeLabel(slot)}
                        </button>
                      );
                    })}
                  </div>

                  <button
                    onClick={() => setTourConfirmed(true)}
                    disabled={tourDayIdx === null || tourSlot === null}
                    className="w-full mt-4 py-3.5 px-6 rounded-pill bg-ink text-paper text-[15px] font-semibold disabled:opacity-50 hover:bg-ink-2"
                  >
                    Book {selectedDay?.day} {selectedDay?.numeral}{' '}
                    {selectedTime ? `@ ${selectedTime}` : ''}
                  </button>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-ok text-paper grid place-items-center">
                      <CheckIcon />
                    </div>
                    <div className="font-serif text-[22px] tracking-[-.02em]">Tour requested</div>
                  </div>
                  <div className="text-[13px] text-muted-2 mt-2.5">
                    <strong className="text-ink">
                      {selectedDay?.day} {selectedDay?.numeral}
                      {selectedTime ? ` at ${selectedTime}` : ''}
                    </strong>
                    <br />
                    In-person at {street}
                  </div>
                  <div className="mt-5 p-4 bg-paper rounded-[14px]">
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
                    <button
                      onClick={() => onContactAgent(listing.id)}
                      className="w-full mt-2.5 py-3.5 px-6 rounded-pill bg-ink text-paper text-[15px] font-semibold hover:bg-ink-2"
                    >
                      Confirm tour
                    </button>
                  </div>
                  <button
                    onClick={() => setTourConfirmed(false)}
                    className="mt-3 text-xs text-muted-2 underline underline-offset-2"
                  >
                    Pick a different time
                  </button>
                </>
              )}

              {/* Investor callout */}
              <div className="mt-4 p-3.5 bg-terra-soft rounded-[10px] border border-terra">
                <div className="text-xs font-semibold text-terra-ink">Investor?</div>
                <div className="text-[11px] text-terra-ink/80 mt-1 leading-[1.5]">
                  {listing.loanType === 'VA'
                    ? 'VA loan — rentable. Get ROI breakdown.'
                    : 'FHA is primary-residence only. Ask about VA in this area.'}
                </div>
                <button className="w-full mt-2.5 py-2 px-3.5 rounded-pill bg-terra text-paper text-[13px] font-medium hover:bg-[#B9472A]">
                  Discuss ROI
                </button>
              </div>

              {/* Agent strip */}
              <div className="mt-3.5 p-3 bg-paper rounded-[10px] flex gap-2.5 items-center">
                <div
                  className="w-8 h-8 rounded-full shrink-0"
                  style={{
                    backgroundImage:
                      'repeating-linear-gradient(45deg, #b8aca3 0 2px, #c9bfb7 2px 4px)'
                  }}
                />
                <div className="flex-1 text-[11px] min-w-0">
                  <div className="font-semibold">Jeff Salazar</div>
                  <div className="text-muted-2">(602) 332-3860</div>
                </div>
                <button
                  onClick={() => onContactAgent(listing.id)}
                  className="px-3.5 py-2 rounded-pill border border-line-2 text-[11px] font-medium hover:border-ink"
                >
                  Chat
                </button>
              </div>

              {/* Estimate your payment */}
              <div className="mt-5 bg-paper rounded-md p-4 border border-line">
                <div className="font-serif font-normal text-[18px] tracking-[-.02em]">
                  Estimate your payment
                </div>
                <div className="text-[11px] text-muted-2 mt-1">
                  Adjust your down payment to see monthly
                </div>
                <div className="mt-4">
                  <div className="flex justify-between items-baseline text-[11px]">
                    <span className="text-muted-2">Down payment</span>
                    <span className="text-ink font-semibold">
                      {downPercent}% · {formatMoney(downAmount)}
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
                  <div className="flex justify-between mt-1.5 text-[10px] text-muted">
                    <span>5%</span>
                    <span>20%</span>
                    <span>35%</span>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-dashed border-line-2 grid grid-cols-2 gap-2.5">
                  <div>
                    <div className="text-[10px] text-muted-2 uppercase tracking-[.08em]">
                      Monthly P&amp;I
                    </div>
                    <div className="font-serif font-normal text-[26px] tracking-[-.02em] text-navy mt-1">
                      {formatMoney(scaledM)}
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-muted-2 uppercase tracking-[.08em]">
                      Cash to close
                    </div>
                    <div className="font-serif font-normal text-[26px] tracking-[-.02em] mt-1">
                      {formatMoney(cashToClose)}
                    </div>
                  </div>
                </div>
                <div className="text-[10px] text-muted mt-2.5 leading-[1.5]">
                  Includes est. $3,200 closing. Taxes + insurance not included.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function GalleryTile({
  src,
  label,
  height
}: {
  src: string | undefined;
  label: string;
  height: number;
}) {
  if (!src) {
    return (
      <div className="skeleton-img" style={{ height }}>
        {label}
      </div>
    );
  }
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} alt={label} className="w-full object-cover" style={{ height }} />
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={11}
      height={11}
      className="text-ok shrink-0"
    >
      <path d="m5 13 4 4L19 7" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={13}
      height={13}
    >
      <circle cx={18} cy={5} r={3} />
      <circle cx={6} cy={12} r={3} />
      <circle cx={18} cy={19} r={3} />
      <path d="m8.6 13.5 6.8 4M15.4 6.5l-6.8 4" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
      width={13}
      height={13}
    >
      <path d="M20.8 5.6a5.5 5.5 0 00-7.8 0L12 6.6l-1-1a5.5 5.5 0 00-7.8 7.8L12 22l8.8-8.6a5.5 5.5 0 000-7.8z" />
    </svg>
  );
}
