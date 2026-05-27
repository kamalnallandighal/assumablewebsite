'use client';
import { useState } from 'react';
import { Nav } from '../../components/nav/Nav';
import { FilterBar } from '../../components/properties/FilterBar';
import { Sidebar } from '../../components/properties/Sidebar';
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
        <div className="bg-line flex items-center justify-center text-muted text-sm">
          Map placeholder (Task 13)
        </div>
      </div>
    </div>
  );
}
