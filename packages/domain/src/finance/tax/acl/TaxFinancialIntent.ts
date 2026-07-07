export enum TaxFinancialIntentType {
  OUTPUT_TAX = 'OUTPUT_TAX',
  INPUT_TAX = 'INPUT_TAX',
  TAX_ADJUSTMENT = 'TAX_ADJUSTMENT',
  TAX_REVERSAL = 'TAX_REVERSAL'
}

export class TaxFinancialIntent {
  constructor(
    public readonly intentId: string,
    public readonly tenantId: string,
    public readonly intentType: TaxFinancialIntentType,
    public readonly sourceDocumentId: string,
    public readonly totalTaxAmount: string, // Decimal string
    public readonly timestamp: string
  ) {}
}
