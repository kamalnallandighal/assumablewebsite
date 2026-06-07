'use client';
import type { Listing } from '../../lib/listings/types';
import { formatMoney } from '../../lib/format';

interface Props {
  listing: Listing;
  selected: boolean;
  hovered?: boolean;
  onOpen: (id: string) => void;
  onHover?: (id: string | null) => void;
  onFavorite?: (id: string) => void;
  favorited?: boolean;
}

const loanBadgeClass: Record<string, string> = {
  VA: 'bg-navy text-white',
  FHA: 'bg-terra text-white',
  Conventional: 'bg-ink text-white'
};

export function SearchCard({ listing, selected, hovered, onOpen, onHover, onFavorite, favorited }: Props) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onOpen(listing.id)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onOpen(listing.id);
        }
      }}
      onMouseEnter={() => onHover?.(listing.id)}
      onMouseLeave={() => onHover?.(null)}
      className={`group text-left bg-paper rounded-card overflow-hidden border transition-shadow cursor-pointer ${
        selected
          ? 'border-2 border-ink shadow-md'
          : hovered
            ? 'border border-ink shadow-md'
            : 'border border-line hover:shadow-sm'
      }`}
      data-id={listing.id}
    >
      <div className="relative aspect-[4/3] bg-line">
        {listing.photo ? (
          // External picsum URLs — use plain <img> (no remote-pattern config needed)
          // eslint-disable-next-line @next/next/no-img-element
          <img src={listing.photo} alt={listing.address} className="w-full h-full object-cover" />
        ) : null}
        {listing.loanType && (
          <span className={`absolute top-2 left-2 text-xs px-2 py-1 rounded-pill ${loanBadgeClass[listing.loanType] ?? 'bg-ink text-white'}`}>
            {listing.loanType}
          </span>
        )}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onFavorite?.(listing.id);
          }}
          aria-label={favorited ? 'Remove from favorites' : 'Save listing'}
          className="absolute top-2 right-2 w-8 h-8 rounded-full bg-paper/90 flex items-center justify-center text-ink hover:bg-paper"
        >
          {favorited ? '♥' : '♡'}
        </button>
      </div>
      <div className="p-3 space-y-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-serif text-[19px] text-ink">{formatMoney(listing.price)}</span>
          <span className="text-sm text-navy">{formatMoney(listing.assumedMonthly)}/mo</span>
        </div>
        <div className="text-sm text-ink line-clamp-1">{listing.address}</div>
        <div className="text-xs text-muted">
          {listing.beds} bd · {listing.baths} ba · {listing.sqft.toLocaleString()} sqft
        </div>
      </div>
    </div>
  );
}
