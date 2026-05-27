import type { Listing } from './types';

// Deterministic pseudo-random by listing id, so the same listing always
// shows the same fake details across renders. Not cryptographic.
function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

export function galleryFor(listing: Listing): string[] {
  return Array.from(
    { length: 5 },
    (_, i) => `https://picsum.photos/seed/${listing.id}-${i}/800/500`
  );
}

const descTemplates: Array<(l: Listing) => string> = [
  (l) =>
    `Sun-drenched ${l.beds}-bedroom retreat steps from ${
      l.address.split(',').slice(-2)[0]?.trim() ?? 'the Valley'
    }'s best dining. Open-plan living, sleek kitchen, and a backyard built for Arizona evenings.`,
  (l) =>
    `Move-in ready and surprisingly spacious at ${l.sqft.toLocaleString()} sqft. ${l.beds} bedrooms, ${l.baths} baths, an oversized lot, and the kind of light that makes you forget the phone.`,
  (l) =>
    `Quiet street, low HOA, and a layout that just works. ${l.beds} bd / ${l.baths} ba over ${l.sqft.toLocaleString()} sqft, plus the assumable ${
      l.loanType ?? ''
    } loan that makes the monthly almost feel fair.`.trim()
];

export function descriptionFor(listing: Listing): string {
  return descTemplates[hashId(listing.id) % descTemplates.length](listing);
}

const featurePool = [
  'Solar-ready roof',
  'Two-car garage',
  'Smart thermostat',
  'Quartz counters',
  'Stainless appliances',
  'Walk-in closet',
  'Tile flooring',
  'New HVAC (2023)',
  'Fenced backyard',
  'Covered patio',
  'Tankless water heater',
  'EV outlet',
  'Energy-efficient windows',
  'Open floor plan',
  'Pre-wired for fiber',
  'Tile shower'
];

export function featuresFor(listing: Listing): string[] {
  const seed = hashId(listing.id);
  const out: string[] = [];
  for (let i = 0; i < 8; i++) {
    out.push(featurePool[(seed + i * 7) % featurePool.length]);
  }
  return Array.from(new Set(out)).slice(0, 8);
}

export interface DetailSection {
  title: string;
  rows: Array<[string, string]>;
}

export function propertyDetailsFor(listing: Listing): DetailSection[] {
  const seed = hashId(listing.id);
  const yearBuilt = 1980 + (seed % 40); // 1980–2019
  const lastSold = Math.round(listing.price * 0.78);
  return [
    {
      title: 'Parking',
      rows: [
        ['Garage', '2-car attached'],
        ['Driveway', 'Concrete, 4 spaces']
      ]
    },
    {
      title: 'Interior',
      rows: [
        ['Bedrooms', String(listing.beds)],
        ['Bathrooms', String(listing.baths)],
        ['Square feet', listing.sqft.toLocaleString()]
      ]
    },
    {
      title: 'Exterior',
      rows: [
        ['Lot size', '8,250 sqft'],
        ['Stories', '1'],
        ['Roof', 'Tile']
      ]
    },
    {
      title: 'Utilities',
      rows: [
        ['Cooling', 'Central A/C'],
        ['Heating', 'Forced air'],
        ['Sewer', 'Public']
      ]
    },
    {
      title: 'Location',
      rows: [
        ['Subdivision', 'Encanto Village'],
        ['School district', 'Phoenix Union HS']
      ]
    },
    {
      title: 'Public Facts',
      rows: [
        ['Year built', String(yearBuilt)],
        ['Property type', 'Single Family'],
        ['Last sold', `$${lastSold.toLocaleString('en-US')}`]
      ]
    }
  ];
}
