'use client';
import type { FilterState } from '../../lib/listings/filters';
import type { GeocoderResult } from './Geocoder';
import { Geocoder } from './Geocoder';
import { ChipLocation } from './filters/ChipLocation';
import { ChipLoan } from './filters/ChipLoan';
import { ChipPrice } from './filters/ChipPrice';
import { ChipBeds } from './filters/ChipBeds';
import { ChipSqft } from './filters/ChipSqft';
import { ChipRate } from './filters/ChipRate';
import { ChipSavings } from './filters/ChipSavings';
import { ChipDown } from './filters/ChipDown';

interface Props {
  filters: FilterState;
  patch: (p: Partial<FilterState>) => void;
  lock: boolean;
  onToggleLock: () => void;
  mapboxToken?: string;
  onGeocode?: (r: GeocoderResult) => void;
}

export function FilterBar({
  filters,
  patch,
  lock,
  onToggleLock,
  mapboxToken,
  onGeocode
}: Props) {
  return (
    <div className="sticky top-0 z-30 bg-paper border-b border-line">
      {mapboxToken && onGeocode && (
        <div className="px-4 pt-3">
          <Geocoder token={mapboxToken} onSelect={onGeocode} />
        </div>
      )}
      <div className="flex items-center gap-2 px-4 py-3 overflow-x-auto md:overflow-visible">
        <ChipLocation state={filters} patch={patch} />
        <ChipLoan state={filters} patch={patch} />
        <ChipPrice state={filters} patch={patch} />
        <ChipBeds state={filters} patch={patch} />
        <ChipSqft state={filters} patch={patch} />
        <ChipRate state={filters} patch={patch} />
        <ChipSavings state={filters} patch={patch} />
        <ChipDown state={filters} patch={patch} />
        <button
          onClick={onToggleLock}
          aria-pressed={lock}
          title={lock ? 'Map pan will not change results' : 'Pan map to update results'}
          className={`shrink-0 px-3 py-1.5 text-sm rounded-pill border ${
            lock ? 'border-ink bg-ink text-paper' : 'border-line'
          }`}
        >
          {lock ? '🔒 Results locked' : 'Lock results'}
        </button>
      </div>
    </div>
  );
}
