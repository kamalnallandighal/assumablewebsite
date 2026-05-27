import { describe, it, expect } from 'vitest';
import { listings, findListing } from '../../lib/listings/data';

describe('listings fixture', () => {
  it('loads 16 listings', () => {
    expect(listings.length).toBe(16);
  });

  it('normalizes rate and money fields to numbers', () => {
    for (const l of listings) {
      expect(typeof l.rate).toBe('number');
      expect(typeof l.marketRate).toBe('number');
      expect(typeof l.assumedMonthly).toBe('number');
      expect(typeof l.marketMonthly).toBe('number');
      expect(typeof l.downPayment).toBe('number');
    }
  });

  it('parses "2.99%" → 0.0299', () => {
    const phx1 = findListing('1');
    expect(phx1?.rate).toBeCloseTo(0.0299, 4);
    expect(phx1?.marketRate).toBeCloseTo(0.0637, 4);
  });

  it('parses "$1,621" → 1621', () => {
    const phx1 = findListing('1');
    expect(phx1?.assumedMonthly).toBe(1621);
    expect(phx1?.marketMonthly).toBe(2399);
    expect(phx1?.downPayment).toBe(42000);
  });

  it('every listing has a valid loanType or null', () => {
    for (const l of listings) {
      expect([null, 'VA', 'FHA', 'Conventional']).toContain(l.loanType);
    }
  });

  it('findListing returns the right record', () => {
    const first = listings[0];
    expect(findListing(first.id)?.address).toBe(first.address);
  });
});
