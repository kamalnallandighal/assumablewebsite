// Only the fields we actually consume from the swagger — keep narrow.
export interface PropertySearchHit {
  clip: string;
  streetAddress?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  fipsCode?: string;
}

export interface MortgageTransactionDetail {
  loanTypeCode?: string;
  loanTypeCodeDescription?: string;
  interestRate?: number;
  interestRateTypeCode?: string;
  amount?: number;
  recordingDate?: number;          // YYYYMMDD
  documentNumber?: string;
  lienPosition?: number;
  statusIndicator?: string;
  mortgageTypeCode?: string;
  purposeCode?: string;
}

export interface MortgageDetail {
  mortgageTransactionDetail?: MortgageTransactionDetail;
  lenderDetail?: { lenderName?: string };
}

export interface MortgageTransactionProduct {
  clip: string;
  items?: MortgageDetail[];
}

// --- Enriched liens (the gold field set — see CLAUDE.md) ---

// Confidence ranks Cotality returns are 1–5 integers (5 = Excellent, NULL = not enriched).
export type CotalityConfidence = 1 | 2 | 3 | 4 | 5;

export interface EnrichedLienMortgageTransaction {
  enrichedInterestRate?: number;
  enrichedInterestRateConfidenceRank?: number;
  enrichedInterestRateTypeCode?: 'FIX' | 'ADJ' | 'BAL' | null;
  enrichedInterestRateTypeCodeConfidenceRank?: number;
  enrichedLoanTypeCode?: 'FHA' | 'VA' | 'CNV' | 'PP' | 'SBA' | 'EMP' | null;
  enrichedLoanTypeCodeConfidenceRank?: number;
  enrichedTerm?: number;
  enrichedTermCode?: 'Y' | 'M' | 'D' | null;
  enrichedMortgageLienPosition?: number;
  enrichedLTV?: number;
  amount?: number;
  mortgageDate?: number;          // YYYYMMDD
  maturityDate?: number;          // YYYYMMDD
}

export interface EnrichedLienRecordedDocument {
  recordingDate?: number;
  documentNumber?: string;
}

export interface EnrichedLienLender {
  companyName?: string;
}

export interface EnrichedLienOpenLien {
  mortgageTransactionDetails?: EnrichedLienMortgageTransaction;
  recordedDocumentDetails?: EnrichedLienRecordedDocument;
  originationLenderDetails?: EnrichedLienLender;
  currentLenderDetails?: EnrichedLienLender;
}

export interface EnrichedLienEquityAndLtv {
  purchaseRecordingDate?: number;
  purchaseAmount?: number;
  totalNumberOfOpenMortgageLiens?: number;
  totalAmountOfOpenMortgageLiens?: number;
  estimatedEquity?: number;
  estimatedCombinedLTV?: number | null;
  purchaseCombinedLTV?: number;
}

export interface EnrichedLienEstimated {
  unpaidPrincipalBalance?: number;
  upbConfidenceRank?: number;
  presentLTV?: number;            // integer percent
  presentLTVConfidenceRank?: number;
  ltv?: number;                   // at origination
  ltvConfidenceRank?: number;
  upbAndPLTVRunDate?: number;     // YYYYMMDD
}

export interface CountyMortgageCoverageSummary {
  firstMortgageDate?: number;
  lastMortgageDate?: number;
  standardizedCounty?: string;
  standardizedState?: string;
}

export interface EnrichedLienData {
  clip: string;
  countyMortgageCoverageSummary?: CountyMortgageCoverageSummary;
  openLienEquityAndLTV?: EnrichedLienEquityAndLtv;
  enriched?: EnrichedLienEstimated;
  openLiens?: EnrichedLienOpenLien[];
}

export interface EnrichedLienResponse {
  data?: EnrichedLienData;
}
