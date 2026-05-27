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
