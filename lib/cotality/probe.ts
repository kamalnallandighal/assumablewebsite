import { searchProperty, getEnrichedLiens } from './client';
import type { EnrichedLienOpenLien, EnrichedLienResponse } from './types';

export interface ProbeAddress {
  streetAddress: string;
  city?: string;
  state: string;
  zipCode: string;
  label?: string;
}

export type Badge = 'verified' | 'plain' | 'contact-agent' | null;

export interface ProbeResult {
  input: ProbeAddress;
  clip: string | null;

  // Loan classification
  loanType: 'FHA' | 'VA' | 'CNV' | 'PP' | 'SBA' | 'EMP' | null;
  loanTypeConfidence: number | null;

  // Rate
  interestRate: number | null;          // decimal percent, e.g. 2.8
  interestRateConfidence: number | null;
  interestRateType: 'FIX' | 'ADJ' | 'BAL' | null;
  interestRateTypeConfidence: number | null;

  // Money
  unpaidBalance: number | null;
  unpaidBalanceConfidence: number | null;
  presentLTV: number | null;
  estimatedEquity: number | null;

  // Loan details
  originationAmount: number | null;
  term: number | null;                  // years (when termCode === 'Y')
  maturityDate: number | null;          // YYYYMMDD

  // Servicer
  servicer: string | null;

  // Compliance / freshness
  openLienCount: number | null;
  calcRunDate: number | null;           // upbAndPLTVRunDate

  // Derived badge for UI
  badge: Badge;

  error?: string;
}

// Pick the primary lien — position 1, or the first if positions aren't set.
function pickPrimary(liens: EnrichedLienOpenLien[]): EnrichedLienOpenLien | null {
  if (liens.length === 0) return null;
  const byPosition = liens.find(
    (l) => l.mortgageTransactionDetails?.enrichedMortgageLienPosition === 1
  );
  return byPosition ?? liens[0];
}

// min over defined values; returns null if every value is nullish.
function minDefined(...vals: Array<number | null | undefined>): number | null {
  let m: number | null = null;
  for (const v of vals) {
    if (typeof v === 'number') m = m === null ? v : Math.min(m, v);
  }
  return m;
}

export function deriveBadge(
  loanTypeConf: number | null,
  rateConf: number | null,
  rateTypeConf: number | null
): Badge {
  const worst = minDefined(loanTypeConf, rateConf, rateTypeConf);
  if (worst === null) return null;
  if (worst >= 4) return 'verified';
  if (worst === 3) return 'plain';
  return 'contact-agent';
}

function normalize(addr: ProbeAddress, clip: string, body: EnrichedLienResponse): ProbeResult {
  const data = body.data;
  const liens = data?.openLiens ?? [];
  const primary = pickPrimary(liens);
  const tx = primary?.mortgageTransactionDetails ?? null;
  const enriched = data?.enriched ?? null;
  const equity = data?.openLienEquityAndLTV ?? null;

  const loanType = (tx?.enrichedLoanTypeCode ?? null) as ProbeResult['loanType'];
  const loanTypeConf = tx?.enrichedLoanTypeCodeConfidenceRank ?? null;
  const interestRate = tx?.enrichedInterestRate ?? null;
  const interestRateConf = tx?.enrichedInterestRateConfidenceRank ?? null;
  const interestRateType = (tx?.enrichedInterestRateTypeCode ?? null) as ProbeResult['interestRateType'];
  const interestRateTypeConf = tx?.enrichedInterestRateTypeCodeConfidenceRank ?? null;

  const termYears = tx?.enrichedTermCode === 'Y' ? tx?.enrichedTerm ?? null : null;
  const servicer =
    primary?.currentLenderDetails?.companyName ??
    primary?.originationLenderDetails?.companyName ??
    null;

  return {
    input: addr,
    clip,
    loanType,
    loanTypeConfidence: loanTypeConf,
    interestRate,
    interestRateConfidence: interestRateConf,
    interestRateType,
    interestRateTypeConfidence: interestRateTypeConf,
    unpaidBalance: enriched?.unpaidPrincipalBalance ?? null,
    unpaidBalanceConfidence: enriched?.upbConfidenceRank ?? null,
    presentLTV: enriched?.presentLTV ?? null,
    estimatedEquity: equity?.estimatedEquity ?? null,
    originationAmount: tx?.amount ?? null,
    term: termYears,
    maturityDate: tx?.maturityDate ?? null,
    servicer,
    openLienCount: equity?.totalNumberOfOpenMortgageLiens ?? null,
    calcRunDate: enriched?.upbAndPLTVRunDate ?? null,
    badge: deriveBadge(loanTypeConf, interestRateConf, interestRateTypeConf)
  };
}

function emptyResult(addr: ProbeAddress, clip: string | null, error?: string): ProbeResult {
  return {
    input: addr,
    clip,
    loanType: null,
    loanTypeConfidence: null,
    interestRate: null,
    interestRateConfidence: null,
    interestRateType: null,
    interestRateTypeConfidence: null,
    unpaidBalance: null,
    unpaidBalanceConfidence: null,
    presentLTV: null,
    estimatedEquity: null,
    originationAmount: null,
    term: null,
    maturityDate: null,
    servicer: null,
    openLienCount: null,
    calcRunDate: null,
    badge: null,
    error
  };
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
    if (!hit) return emptyResult(addr, null);

    const body = await getEnrichedLiens(hit.clip);
    return normalize(addr, hit.clip, body);
  } catch (err) {
    return emptyResult(addr, null, err instanceof Error ? err.message : String(err));
  }
}
