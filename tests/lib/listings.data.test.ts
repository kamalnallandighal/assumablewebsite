import { describe, it, expect } from 'vitest';
import { listings, findListing } from '../../lib/listings/data';

describe('listings fixture', () => {
  it('loads 16 listings', () => {
    expect(listings.length).toBe(16);
  });
  it('every listing has a string rate and valid loanType', () => {
    // rate/marketRate are stored as percent strings in listings.json
    // (e.g. "2.99%"). loanType is null for non-assumable listings.
    for (const l of listings) {
      expect(typeof l.rate).toBe('string');
      expect([null, 'VA', 'FHA', 'Conventional']).toContain(l.loanType);
    }
  });
  it('findListing returns the right record', () => {
    const first = listings[0];
    expect(findListing(first.id)?.address).toBe(first.address);
  });
});
