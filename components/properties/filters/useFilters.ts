'use client';
import { useMemo, useState, useCallback } from 'react';
import { applyFilters, defaultFilterState, type FilterState } from '../../../lib/listings/filters';
import { listings } from '../../../lib/listings/data';

export function useFilters() {
  const [filters, setFilters] = useState<FilterState>(defaultFilterState);
  const visible = useMemo(() => applyFilters(listings, filters), [filters]);
  const patch = useCallback(
    (p: Partial<FilterState>) => setFilters((s) => ({ ...s, ...p })),
    []
  );
  return { filters, visible, patch };
}
