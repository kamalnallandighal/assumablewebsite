import { searchProperty, getCurrentMortgage } from './client';
import type { MortgageTransactionDetail } from './types';

export interface ProbeAddress {
  streetAddress: string;
  city?: string;
  state: string;
  zipCode: string;
  label?: string;
}

export interface ProbeResult {
  input: ProbeAddress;
  clip: string | null;
  primary: MortgageTransactionDetail | null;
  rawMortgageCount: number;
  error?: string;
}

export async function probeAddress(addr: ProbeAddress): Promise<ProbeResult> {
  try {
    const hit = await searchProperty({
      streetAddress: addr.streetAddress,
      city: addr.city,
      state: addr.state,
      zipCode: addr.zipCode,
      bestMatch: true
    });
    if (!hit) return { input: addr, clip: null, primary: null, rawMortgageCount: 0 };

    const mortgage = await getCurrentMortgage(hit.clip);
    const items = mortgage.items ?? [];
    const primary = items.find(i =>
      i.mortgageTransactionDetail?.lienPosition === 1 &&
      i.mortgageTransactionDetail?.statusIndicator?.toLowerCase().includes('open')
    )?.mortgageTransactionDetail ?? items[0]?.mortgageTransactionDetail ?? null;

    return { input: addr, clip: hit.clip, primary, rawMortgageCount: items.length };
  } catch (err) {
    return {
      input: addr,
      clip: null,
      primary: null,
      rawMortgageCount: 0,
      error: err instanceof Error ? err.message : String(err)
    };
  }
}
