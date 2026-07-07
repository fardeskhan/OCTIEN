export enum InventoryAdjustmentStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED'
}

export class InventoryAdjustment {
  private _status: InventoryAdjustmentStatus = InventoryAdjustmentStatus.DRAFT;

  constructor(
    public readonly adjustmentId: string,
    public readonly tenantId: string,
    public readonly warehouseId: string,
    public readonly skuId: string,
    public readonly quantityAdjusted: number, // positive or negative
    public readonly reason: string
  ) {}

  get status(): InventoryAdjustmentStatus {
    return this._status;
  }

  public approve(): void {
    if (this._status !== InventoryAdjustmentStatus.DRAFT) throw new Error('Invalid transition');
    this._status = InventoryAdjustmentStatus.APPROVED;
  }

  public post(): void {
    if (this._status !== InventoryAdjustmentStatus.APPROVED) throw new Error('Invalid transition');
    this._status = InventoryAdjustmentStatus.POSTED;
  }
}
