import type { ProbeAddress } from './probe';

// One residential address per major Phoenix-area city. These are plausible
// addresses meant to exercise the Cotality pipeline end-to-end; they may not
// have assumable loans. SWAP IN known FHA/VA addresses from Jeff's network
// once you have them — the structure stays the same.
//
// Budget per run: 8 addresses × ~2 calls each = ~16 of your 100/day trial cap.
export const probeDefaults: ProbeAddress[] = [
  { label: 'phoenix',   streetAddress: '1820 N Central Ave',  city: 'Phoenix',    state: 'AZ', zipCode: '85004' },
  { label: 'mesa',      streetAddress: '643 W Baseline Rd',   city: 'Mesa',       state: 'AZ', zipCode: '85210' },
  { label: 'chandler',  streetAddress: '100 N Arizona Ave',   city: 'Chandler',   state: 'AZ', zipCode: '85225' },
  { label: 'scottsdale',streetAddress: '7350 E Stetson Dr',   city: 'Scottsdale', state: 'AZ', zipCode: '85251' },
  { label: 'gilbert',   streetAddress: '50 E Civic Center Dr',city: 'Gilbert',    state: 'AZ', zipCode: '85296' },
  { label: 'tempe',     streetAddress: '500 E University Dr', city: 'Tempe',      state: 'AZ', zipCode: '85281' },
  { label: 'glendale',  streetAddress: '5850 W Glendale Ave', city: 'Glendale',   state: 'AZ', zipCode: '85301' },
  { label: 'peoria',    streetAddress: '8475 W Peoria Ave',   city: 'Peoria',     state: 'AZ', zipCode: '85345' }
];
