'use client';
import { Fragment, useEffect, useRef, type ReactNode } from 'react';
import type { Listing } from '../../lib/listings/types';
import { SearchCard } from './SearchCard';
import { OffMarketTeaser } from './OffMarketTeaser';

interface Props {
  listings: readonly Listing[];
  selectedId: string | null;
  hoveredId?: string | null;
  onOpen: (id: string) => void;
  onHover?: (id: string | null) => void;
  emptyHint?: string | null;
  header?: ReactNode;
}

export function Sidebar({
  listings,
  selectedId,
  hoveredId,
  onOpen,
  onHover,
  emptyHint,
  header
}: Props) {
  const asideRef = useRef<HTMLElement>(null);

  // When hover comes from the map, bring the matching card into view.
  // block:'nearest' is a no-op if already visible, so hovering within the list
  // doesn't trigger a scroll.
  useEffect(() => {
    if (!hoveredId || !asideRef.current) return;
    const el = asideRef.current.querySelector<HTMLElement>(`[data-id="${hoveredId}"]`);
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [hoveredId]);

  return (
    <aside ref={asideRef} className="h-full overflow-y-auto p-3 bg-cream">
      {header}
      {emptyHint && (
        <div className="text-sm text-muted px-2 py-2 mb-2">{emptyHint}</div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {listings.map((l, i) => (
          <Fragment key={l.id}>
            {i === 6 && <OffMarketTeaser key="omt" />}
            <SearchCard
              listing={l}
              selected={l.id === selectedId}
              hovered={l.id === hoveredId}
              onOpen={onOpen}
              onHover={onHover}
            />
          </Fragment>
        ))}
      </div>
    </aside>
  );
}
