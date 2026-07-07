export enum AssetFinancialIntentType {
  ASSET_CAPITALIZATION = 'ASSET_CAPITALIZATION',
  DEPRECIATION_EXPENSE = 'DEPRECIATION_EXPENSE',
  ASSET_DISPOSAL = 'ASSET_DISPOSAL',
  IMPAIRMENT_LOSS = 'IMPAIRMENT_LOSS',
  ASSET_TRANSFER = 'ASSET_TRANSFER'
}

export class AssetFinancialIntent {
  constructor(
    public readonly intentId: string,
    public readonly tenantId: string,
    public readonly intentType: AssetFinancialIntentType,
    public readonly assetId: string,
    public readonly assetClassId: string,
    public readonly financialAmount: string, // Decimal string
    public readonly timestamp: string
  ) {}
}
