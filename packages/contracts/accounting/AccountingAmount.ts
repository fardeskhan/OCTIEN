export interface AccountingCurrency {
  currencyCode: string;
  precision: number;
  minorUnit: string;
  roundingMode: 'HALF_EVEN' | 'HALF_UP' | 'UP' | 'DOWN';
}

export interface AccountingAmount {
  // Monetary values MUST be serialized as fixed-precision strings to prevent float rounding
  transactionAmount: string;
  transactionCurrency: AccountingCurrency;

  baseAmount: string;
  baseCurrency: AccountingCurrency;

  reportingAmount?: string;
  reportingCurrency?: AccountingCurrency;

  exchangeRateId?: string;
  exchangeRate?: string;
  exchangeRateSource?: string;

  roundingDifference?: string;
}
