import raw from '../../public/listings.json';
import type { Listing } from './types';

export const listings: readonly Listing[] = raw as Listing[];

export function findListing(id: string): Listing | undefined {
  return listings.find(l => l.id === id);
}
