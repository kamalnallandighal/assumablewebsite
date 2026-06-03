'use client';
import { useMemo, useCallback } from 'react';
import {
  useQueryStates,
  parseAsString,
  parseAsInteger,
  parseAsFloat,
  parseAsArrayOf,
  parseAsStringEnum
} from 'nuqs';
import {
  applyFilters,
  defaultFilterState,
  isInBbox,
  type Bbox,
  type FilterState
} from '../../../lib/listings/filters';
import { listings } from '../../../lib/listings/data';
import type { LoanType } from '../../../lib/listings/types';

// URL parsers. Defaults match `defaultFilterState`. nuqs strips params equal to
// their default value, so the URL stays clean when filters are unset.
const parsers = {
  city: parseAsString,
  loanTypes: parseAsArrayOf(
    parseAsStringEnum<LoanType>(['VA', 'FHA', 'Conventional'])
  ).withDefault([]),
  priceMin: parseAsInteger.withDefault(0),
  priceMax: parseAsInteger,                       // null = no cap
  bedsMin: parseAsInteger.withDefault(0),
  bathsMin: parseAsFloat.withDefault(0),
  sqftMin: parseAsInteger.withDefault(0),
  sqftMax: parseAsInteger,
  rateMax: parseAsFloat,                          // decimal, e.g. 0.05
  savingsMin: parseAsInteger.withDefault(0),
  downMax: parseAsInteger
};

export function useFilters(bbox?: Bbox | null) {
  const [raw, setRaw] = useQueryStates(parsers, {
    history: 'replace',
    clearOnDefault: true
  });

  const filters: FilterState = useMemo(
    () => ({
      city: raw.city,
      loanTypes: raw.loanTypes,
      priceMin: raw.priceMin,
      priceMax: raw.priceMax,
      bedsMin: raw.bedsMin,
      bathsMin: raw.bathsMin,
      sqftMin: raw.sqftMin,
      sqftMax: raw.sqftMax,
      rateMax: raw.rateMax,
      savingsMin: raw.savingsMin,
      downMax: raw.downMax
    }),
    [raw]
  );

  // Two-stage: chip filters first (cheap, drives the empty-state message),
  // then bbox intersection on what survives. The chip-filtered count is what
  // the count badge would show if the user "removed the boundary".
  const chipFiltered = useMemo(() => applyFilters(listings, filters), [filters]);
  const visible = useMemo(
    () => (bbox ? chipFiltered.filter((l) => isInBbox(l, bbox)) : chipFiltered),
    [chipFiltered, bbox]
  );

  const patch = useCallback(
    (p: Partial<FilterState>) => {
      // nuqs accepts partial updates; pass through unchanged.
      setRaw(p);
    },
    [setRaw]
  );

  const reset = useCallback(() => {
    setRaw(defaultFilterState);
  }, [setRaw]);

  return { filters, visible, chipFiltered, patch, reset };
}
