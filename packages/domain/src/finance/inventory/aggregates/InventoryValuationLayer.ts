import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';

export class InventoryValuationLayer {
  constructor(
    public readonly layerId: string,
    public readonly tenantId: string,
    public readonly skuId: string,
    public readonly warehouseId: string,
    public readonly receivedQuantity: number,
    public remainingQuantity: number,
    public readonly unitCost: Decimal,
    public readonly createdAt: string
  ) {}
}
