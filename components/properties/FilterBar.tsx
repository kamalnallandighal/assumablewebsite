'use client';
import type { FilterState } from '../../lib/listings/filters';
import { ChipLocation } from './filters/ChipLocation';
import { ChipLoan } from './filters/ChipLoan';
import { ChipPrice } from './filters/ChipPrice';
import { ChipBeds } from './filters/ChipBeds';

interface Props {
  filters: FilterState;
  patch: (p: Partial<FilterState>) => void;
  resultCount: number;
  rateRange: string;
}

export function FilterBar({ filters, patch, resultCount, rateRange }: Props) {
  return (
    <div className="sticky top-0 z-30 bg-paper border-b border-line">
      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto md:overflow-visible">
        <ChipLocation state={filters} patch={patch} />
        <ChipLoan state={filters} patch={patch} />
        <ChipPrice state={filters} patch={patch} />
        <ChipBeds state={filters} patch={patch} />
        <button
          onClick={() => patch({ assumableOnly: !filters.assumableOnly })}
          className={`shrink-0 px-3 py-1.5 text-sm rounded-pill border ${
            filters.assumableOnly ? 'border-ink bg-cream' : 'border-line'
          }`}
        >
          Assumable only
        </button>
      </div>
      <div className="px-4 pb-2 text-sm text-muted hidden md:block">
        {resultCount} homes · rates {rateRange}
      </div>
    </div>
  );
}
