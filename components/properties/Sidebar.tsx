'use client';
import { Fragment } from 'react';
import type { Listing } from '../../lib/listings/types';
import { SearchCard } from './SearchCard';
import { OffMarketTeaser } from './OffMarketTeaser';

interface Props {
  listings: readonly Listing[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  onOpenDetail?: (id: string) => void;
}

export function Sidebar({ listings, selectedId, onSelect, onOpenDetail }: Props) {
  return (
    <aside className="overflow-y-auto p-3 bg-cream">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {listings.map((l, i) => (
          <Fragment key={l.id}>
            {i === 6 && <OffMarketTeaser key="omt" />}
            <SearchCard
              listing={l}
              selected={l.id === selectedId}
              onSelect={onSelect}
              onOpenDetail={onOpenDetail}
            />
          </Fragment>
        ))}
      </div>
    </aside>
  );
}
