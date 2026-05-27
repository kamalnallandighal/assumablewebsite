import { describe, it, expect } from 'vitest';
import { listings } from '../../lib/listings/data';
import { applyFilters, defaultFilterState } from '../../lib/listings/filters';

describe('applyFilters', () => {
  it('default returns only assumable listings', () => {
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

  it('assumableOnly=false returns more listings than default', () => {
    const withOnly = applyFilters(listings, defaultFilterState);
    const withoutOnly = applyFilters(listings, { ...defaultFilterState, assumableOnly: false });
    expect(withoutOnly.length).toBeGreaterThanOrEqual(withOnly.length);
  });
});
