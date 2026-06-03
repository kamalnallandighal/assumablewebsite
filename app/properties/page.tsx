'use client';
import { Suspense, useCallback, useRef, useState } from 'react';
import { useQueryState, parseAsString, parseAsStringEnum } from 'nuqs';
import { Nav } from '../../components/nav/Nav';
import { FilterBar } from '../../components/properties/FilterBar';
import { Sidebar } from '../../components/properties/Sidebar';
import { PropertiesMap, type PropertiesMapHandle } from '../../components/properties/PropertiesMap';
import { DetailModal } from '../../components/properties/DetailModal';
import { LeadModal } from '../../components/properties/LeadModal';
import { useFilters } from '../../components/properties/filters/useFilters';
import { useViewport } from '../../components/properties/filters/useViewport';
import { useSort, applySort } from '../../components/properties/filters/useSort';
import { SidebarHeader } from '../../components/properties/SidebarHeader';
import { findListing, listings as allListings } from '../../lib/listings/data';
import { formatRate } from '../../lib/format';
import type { Bbox } from '../../lib/listings/filters';
import type { GeocoderResult } from '../../components/properties/Geocoder';

export default function PropertiesPage() {
  return (
    <Suspense fallback={<div className="h-screen" />}>
      <PropertiesPageBody />
    </Suspense>
  );
}

function PropertiesPageBody() {
  const { bbox, lock, setBbox, setLock } = useViewport();
  const { sort, setSort } = useSort();
  // Pass bbox into filters only when NOT locked. While locked, the visible list
  // freezes at the bbox last committed before lock — that's the URL bbox.
  const { filters, visible: filteredVisible, chipFiltered, patch } = useFilters(bbox);
  const visible = applySort(filteredVisible, sort);
  const [selectedId, setSelectedId] = useQueryState('id', parseAsString);
  const [detailId, setDetailId] = useQueryState('detail', parseAsString);
  const [mobileView, setMobileView] = useQueryState(
    'view',
    parseAsStringEnum<'list' | 'map'>(['list', 'map']).withDefault('list')
  );
  const [leadForListingId, setLeadForListingId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [pendingBbox, setPendingBbox] = useState<Bbox | null>(null);
  const mapHandleRef = useRef<PropertiesMapHandle | null>(null);
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const onGeocode = useCallback((r: GeocoderResult) => {
    if (r.bbox) mapHandleRef.current?.flyToBbox(r.bbox);
    else mapHandleRef.current?.flyTo(r.center, 14);
  }, []);

  // Card click or marker click: highlight + open the detail modal in one shot.
  const open = useCallback(
    (id: string) => {
      setSelectedId(id);
      setDetailId(id);
    },
    [setSelectedId, setDetailId]
  );

  const rates = visible.map((l) => l.rate);
  const rateRange =
    rates.length
      ? `${formatRate(Math.min(...rates))}–${formatRate(Math.max(...rates))}`
      : '—';

  const detailListing = detailId ? findListing(detailId) ?? null : null;
  const detailIndex = detailId ? visible.findIndex((l) => l.id === detailId) : -1;
  const goToDetail = useCallback(
    (delta: number) => {
      if (detailIndex < 0) return;
      const next = (detailIndex + delta + visible.length) % visible.length;
      const nextListing = visible[next];
      if (nextListing) {
        setSelectedId(nextListing.id);
        setDetailId(nextListing.id);
      }
    },
    [detailIndex, visible, setSelectedId, setDetailId]
  );

  // Map → URL bbox. Skip when locked: bbox in URL stays put, list stays put,
  // map free to roam. "Search this area" pill below surfaces the pending bounds.
  const onBoundsChange = useCallback(
    (b: Bbox) => {
      if (!lock) setBbox(b);
      else setPendingBbox(b);
    },
    [lock, setBbox]
  );
  const acceptPendingBbox = useCallback(() => {
    if (pendingBbox) {
      setBbox(pendingBbox);
      setPendingBbox(null);
    }
  }, [pendingBbox, setBbox]);

  const hiddenByBbox = chipFiltered.length - visible.length;

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Nav />
      <FilterBar
        filters={filters}
        patch={patch}
        lock={lock}
        onToggleLock={() => setLock(!lock)}
        mapboxToken={mapboxToken}
        onGeocode={onGeocode}
      />
      <div className="flex-1 min-h-0 overflow-hidden flex flex-col md:grid md:grid-cols-[1fr_540px] md:grid-rows-1">
        {/* Map pane — left on desktop */}
        <div
          className={`relative min-h-0 overflow-hidden ${mobileView === 'map' ? 'flex-1' : 'hidden'} md:block`}
        >
          <PropertiesMap
            ref={mapHandleRef}
            listings={visible}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onSelect={open}
            onHover={setHoveredId}
            initialBbox={bbox}
            fitListings={chipFiltered.length > 0 ? chipFiltered : allListings}
            onBoundsChange={onBoundsChange}
          />
          {lock && pendingBbox && (
            <button
              onClick={acceptPendingBbox}
              className="absolute top-4 left-1/2 -translate-x-1/2 z-20 px-4 py-2 bg-ink text-paper text-sm font-medium rounded-pill shadow-md hover:bg-ink/90"
            >
              Search this area
            </button>
          )}
        </div>

        {/* Sidebar pane — right on desktop */}
        <div
          className={`min-h-0 overflow-hidden ${mobileView === 'list' ? 'flex-1' : 'hidden'} md:block`}
        >
          <Sidebar
            listings={visible}
            selectedId={selectedId}
            hoveredId={hoveredId}
            onOpen={open}
            onHover={setHoveredId}
            header={
              <SidebarHeader
                count={visible.length}
                rateRange={rateRange}
                sort={sort}
                onSortChange={setSort}
              />
            }
            emptyHint={
              visible.length === 0 && chipFiltered.length > 0
                ? 'No assumable homes in this map area. Zoom out or pan.'
                : visible.length === 0
                  ? 'No homes match these filters. Try widening price or loan type.'
                  : hiddenByBbox > 0
                    ? `${hiddenByBbox} more match outside the map.`
                    : null
            }
          />
        </div>
      </div>

      {/* Mobile map/list toggle */}
      <div className="md:hidden fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-ink text-paper rounded-pill shadow-lg flex p-1">
        <button
          onClick={() => setMobileView('list')}
          className={`px-4 py-1.5 text-sm rounded-pill ${mobileView === 'list' ? 'bg-paper text-ink' : 'text-paper'}`}
          aria-pressed={mobileView === 'list'}
        >
          List
        </button>
        <button
          onClick={() => setMobileView('map')}
          className={`px-4 py-1.5 text-sm rounded-pill ${mobileView === 'map' ? 'bg-paper text-ink' : 'text-paper'}`}
          aria-pressed={mobileView === 'map'}
        >
          Map
        </button>
      </div>

      <DetailModal
        listing={detailListing}
        onClose={() => setDetailId(null)}
        onContactAgent={(id) => setLeadForListingId(id)}
        index={detailIndex >= 0 ? detailIndex : undefined}
        total={detailIndex >= 0 ? visible.length : undefined}
        onPrev={detailIndex >= 0 && visible.length > 1 ? () => goToDetail(-1) : undefined}
        onNext={detailIndex >= 0 && visible.length > 1 ? () => goToDetail(1) : undefined}
      />
      <LeadModal
        listingId={leadForListingId}
        onClose={() => setLeadForListingId(null)}
      />
    </div>
  );
}
