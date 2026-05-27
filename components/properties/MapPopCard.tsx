'use client';
import type { Listing } from '../../lib/listings/types';
import { formatMoney, formatRate } from '../../lib/format';

interface Props {
  listing: Listing | null;
  onClose: () => void;
  onOpenDetail: (id: string) => void;
}

const loanBadgeClass: Record<string, string> = {
  VA: 'bg-navy text-white',
  FHA: 'bg-terra text-white',
  Conventional: 'bg-ink text-white'
};

export function MapPopCard({ listing, onClose, onOpenDetail }: Props) {
  if (!listing) return null;
  return (
    <div className="bg-paper rounded-card shadow-lg border border-line overflow-hidden">
      <div className="relative aspect-video bg-line">
        {listing.photo && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.photo} alt={listing.address} className="w-full h-full object-cover" />
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2 right-2 w-7 h-7 rounded-full bg-paper/90 text-ink flex items-center justify-center text-base"
        >
          ×
        </button>
        <div className="absolute top-2 left-2 flex gap-2">
          {listing.loanType && (
            <span className={`text-xs px-2 py-0.5 rounded-pill ${loanBadgeClass[listing.loanType] ?? 'bg-ink text-white'}`}>
              {listing.loanType}
            </span>
          )}
          <span className="text-xs px-2 py-0.5 rounded-pill bg-ok text-white">
            {formatRate(listing.rate)}
          </span>
        </div>
      </div>
      <div className="p-3 space-y-1">
        <div className="font-serif text-lg text-ink">{formatMoney(listing.price)}</div>
        <div className="text-sm text-ink line-clamp-1">{listing.address}</div>
        <div className="text-xs text-muted">
          {listing.beds} bd · {listing.baths} ba · {listing.sqft.toLocaleString()} sqft
        </div>
        <div className="text-sm text-navy">{formatMoney(listing.assumedMonthly)}/mo</div>
        <button
          type="button"
          onClick={() => onOpenDetail(listing.id)}
          className="mt-2 w-full bg-ink text-white text-sm py-2 rounded-pill"
        >
          View details
        </button>
      </div>
    </div>
  );
}
