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

// --- Property Detail (composite endpoint) ---
// One call returns building specs (beds/baths/sqft/year), lot size, and
// last-market-sale history. Narrow to just the fields we consume.

export interface AllBuildingsSummary {
  bedroomsCount?: number;
  bathroomsCount?: number;
  fullBathroomsCount?: number;
  halfBathroomsCount?: number;
  livingAreaSquareFeet?: number;
  totalAreaSquareFeet?: number;
}

export interface BuildingItem {
  constructionDetails?: {
    yearBuilt?: number;
    effectiveYearBuilt?: number;
  };
  structureClassification?: {
    propertyTypeCode?: string; // 'SFR', 'CONDO', 'TWNHS', etc.
  };
}

export interface BuildingData {
  allBuildingsSummary?: AllBuildingsSummary;
  Buildings?: BuildingItem[];
}

export interface SiteLocationLot {
  lotSizeSquareFeet?: number;
  lotSizeAcres?: number;
}

export interface SiteLocationData {
  lot?: SiteLocationLot;
}

export interface OwnershipTransferTransaction {
  saleAmount?: number;
  saleDateDerived?: number;          // YYYYMMDD
  saleRecordingDateDerived?: number;
  isCashPurchase?: boolean;
  saleTypeCode?: string;
}

export interface OwnershipTransferItem {
  transactionDetails?: OwnershipTransferTransaction;
}

export interface OwnershipTransfersBlock {
  items?: OwnershipTransferItem[];
}

export interface PropertyDetailData {
  buildings?: { data?: BuildingData };
  siteLocation?: { data?: SiteLocationData };
  lastMarketSale?: OwnershipTransfersBlock;
  mostRecentOwnerTransfer?: OwnershipTransfersBlock;
}

export interface PropertyDetailResponse {
  buildings?: { data?: BuildingData };
  siteLocation?: { data?: SiteLocationData };
  lastMarketSale?: OwnershipTransfersBlock;
  mostRecentOwnerTransfer?: OwnershipTransfersBlock;
  // Top-level wrapper varies by tenant; cover both shapes.
  data?: PropertyDetailData;
}
