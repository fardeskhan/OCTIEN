export enum InventoryFinancialIntentType {
  INVENTORY_RECEIPT = 'INVENTORY_RECEIPT',
  INVENTORY_DISPATCH = 'INVENTORY_DISPATCH',
  INVENTORY_ADJUSTMENT = 'INVENTORY_ADJUSTMENT',
  INVENTORY_TRANSFER = 'INVENTORY_TRANSFER'
}

export class InventoryFinancialIntent {
  constructor(
    public readonly intentId: string,
    public readonly tenantId: string,
    public readonly intentType: InventoryFinancialIntentType,
    public readonly transactionId: string,
    public readonly totalCost: string, // Decimal string
    public readonly timestamp: string
  ) {}
}
