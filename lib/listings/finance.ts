/**
 * Mortgage math shared between the seed script and the runtime mapper.
 * Kept dependency-free so it works in both browser and Node.
 */

// Until we wire Freddie Mac PMMS this is the constant we compare against.
// Source: current Freddie Mac 30-yr fixed average (June 2026, rough). Update
// when we plug in the live feed.
export const MARKET_RATE_PERCENT = 6.85;

/** Standard amortization: principal × (r(1+r)^n) / ((1+r)^n − 1) */
export function monthlyPayment(
  principal: number,
  annualRatePercent: number,
  years: number
): number {
  const r = annualRatePercent / 100 / 12;
  const n = years * 12;
  if (n <= 0) return 0;
  if (r === 0) return Math.round(principal / n);
  const payment = (principal * (r * Math.pow(1 + r, n))) / (Math.pow(1 + r, n) - 1);
  return Math.round(payment);
}

/** Years remaining given a maturity ISO date, or null if invalid/absent. */
export function yearsUntil(maturityIsoDate: string | null | undefined): number | null {
  if (!maturityIsoDate) return null;
  const t = new Date(maturityIsoDate).getTime();
  if (Number.isNaN(t)) return null;
  const years = (t - Date.now()) / (365.25 * 24 * 3600 * 1000);
  return Math.max(0, years);
}
