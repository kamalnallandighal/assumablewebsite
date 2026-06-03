import { describe, it, expect } from 'vitest';
import { listings } from '../../lib/listings/data';
import { applyFilters, defaultFilterState, isInBbox, type Bbox } from '../../lib/listings/filters';

describe('applyFilters', () => {
  it('always returns only assumable listings (hardcoded)', () => {
    const out = applyFilters(listings, defaultFilterState);
    expect(out.length).toBeGreaterThan(0);
    expect(out.every(l => l.isAssumable)).toBe(true);
  });

  it('filters by loanType VA', () => {
    const out = applyFilters(listings, { ...defaultFilterState, loanTypes: ['VA'] });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every(l => l.loanType === 'VA')).toBe(true);
  });

  it('filters by loanType FHA', () => {
    const out = applyFilters(listings, { ...defaultFilterState, loanTypes: ['FHA'] });
    expect(out.every(l => l.loanType === 'FHA')).toBe(true);
  });

  it('respects price ceiling', () => {
    const out = applyFilters(listings, { ...defaultFilterState, priceMax: 500_000 });
    expect(out.every(l => l.price <= 500_000)).toBe(true);
  });

  it('respects bedsMin', () => {
    const out = applyFilters(listings, { ...defaultFilterState, bedsMin: 4 });
    expect(out.every(l => l.beds >= 4)).toBe(true);
  });

  it('respects bathsMin (half-bath fractional)', () => {
    const out = applyFilters(listings, { ...defaultFilterState, bathsMin: 2.5 });
    expect(out.every(l => l.baths >= 2.5)).toBe(true);
  });

  it('filters by city substring (case-insensitive)', () => {
    const out = applyFilters(listings, { ...defaultFilterState, city: 'phoenix' });
    expect(out.length).toBeGreaterThan(0);
    expect(out.every(l => l.address.toLowerCase().includes('phoenix'))).toBe(true);
  });

  it('respects sqftMin / sqftMax', () => {
    const out = applyFilters(listings, { ...defaultFilterState, sqftMin: 1500, sqftMax: 2200 });
    expect(out.every(l => l.sqft >= 1500 && l.sqft <= 2200)).toBe(true);
  });

  it('respects rateMax (decimal)', () => {
    const out = applyFilters(listings, { ...defaultFilterState, rateMax: 0.03 });
    expect(out.every(l => l.rate <= 0.03)).toBe(true);
  });
});

describe('isInBbox', () => {
  // Maricopa County rough bounds: [-113.0, 32.9, -111.5, 33.9]
  const maricopa: Bbox = [-113.0, 32.9, -111.5, 33.9];

  it('returns true for point inside', () => {
    expect(isInBbox({ lat: 33.45, lng: -112.07 }, maricopa)).toBe(true);
  });

  it('returns false for point outside (north)', () => {
    expect(isInBbox({ lat: 34.5, lng: -112.07 }, maricopa)).toBe(false);
  });

  it('returns false for point outside (east)', () => {
    expect(isInBbox({ lat: 33.45, lng: -110.0 }, maricopa)).toBe(false);
  });

  it('treats edges as inside (inclusive)', () => {
    expect(isInBbox({ lat: 32.9, lng: -113.0 }, maricopa)).toBe(true);
    expect(isInBbox({ lat: 33.9, lng: -111.5 }, maricopa)).toBe(true);
  });
});
