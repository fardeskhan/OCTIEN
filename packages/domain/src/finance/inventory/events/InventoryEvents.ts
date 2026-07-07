export interface InventoryEvent {
  eventId: string;
  eventName: string;
  version: string;
  timestamp: string;
  tenantId: string;
}

export class InventoryTransactionPosted implements InventoryEvent {
  public readonly eventName = 'InventoryTransactionPosted';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly transactionId: string,
    public readonly warehouseId: string,
    public readonly skuId: string,
    public readonly type: string, // InventoryTransactionType
    public readonly quantity: number
  ) {}
}

export class InventoryAdjustmentApproved implements InventoryEvent {
  public readonly eventName = 'InventoryAdjustmentApproved';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly adjustmentId: string,
    public readonly warehouseId: string,
    public readonly skuId: string,
    public readonly quantityAdjusted: number
  ) {}
}

export class InventoryValuationCalculated implements InventoryEvent {
  public readonly eventName = 'InventoryValuationCalculated';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly transactionId: string,
    public readonly valuationMethod: string,
    public readonly totalCost: string
  ) {}
}
