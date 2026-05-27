import raw from '../../public/listings.json';
import type { Listing, RawListing } from './types';

function parsePercent(s: string): number {
  return parseFloat(s.replace('%', '')) / 100;
}

function parseMoney(s: string): number {
  return parseInt(s.replace(/[$,]/g, ''), 10);
}

function normalize(r: RawListing): Listing {
  return {
    ...r,
    rate: parsePercent(r.rate),
    marketRate: parsePercent(r.marketRate),
    assumedMonthly: parseMoney(r.assumedMonthly),
    marketMonthly: parseMoney(r.marketMonthly),
    downPayment: parseMoney(r.downPayment)
  };
}

export const listings: readonly Listing[] = (raw as RawListing[]).map(normalize);

export function findListing(id: string): Listing | undefined {
  return listings.find(l => l.id === id);
}
