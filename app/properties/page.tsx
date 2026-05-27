'use client';
import { useState } from 'react';
import { Nav } from '../../components/nav/Nav';
import { FilterBar } from '../../components/properties/FilterBar';
import { Sidebar } from '../../components/properties/Sidebar';
import { PropertiesMap } from '../../components/properties/PropertiesMap';
import { MapPopCard } from '../../components/properties/MapPopCard';
import { useFilters } from '../../components/properties/filters/useFilters';
import { formatRate } from '../../lib/format';

export default function PropertiesPage() {
  const { filters, visible, patch } = useFilters();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const rates = visible.map((l) => l.rate);
  const rateRange =
    rates.length
      ? `${formatRate(Math.min(...rates))}–${formatRate(Math.max(...rates))}`
      : '—';

  const selectedListing = selectedId ? visible.find((l) => l.id === selectedId) ?? null : null;
  const onOpenDetail = (id: string) => {
    console.log('open detail', id);
  };

  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Nav />
      <FilterBar
        filters={filters}
        patch={patch}
        resultCount={visible.length}
        rateRange={rateRange}
      />
      <div className="flex-1 grid grid-cols-1 md:grid-cols-[540px_1fr] min-h-0">
        <Sidebar listings={visible} selectedId={selectedId} onSelect={setSelectedId} />
        <div className="relative">
          <PropertiesMap
            listings={visible}
            selectedId={selectedId}
            onSelect={setSelectedId}
          />
          <div className="absolute bottom-6 left-6 w-[300px] max-w-[calc(100vw-3rem)] pointer-events-auto">
            <MapPopCard
              listing={selectedListing}
              onClose={() => setSelectedId(null)}
              onOpenDetail={onOpenDetail}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
