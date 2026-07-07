import { InventoryTransactionType } from './InventoryTransactionType';

export class InventoryTransaction {
  constructor(
    public readonly transactionId: string,
    public readonly tenantId: string,
    public readonly warehouseId: string,
    public readonly skuId: string,
    public readonly type: InventoryTransactionType,
    public readonly quantity: number,
    public readonly timestamp: string
  ) {}
}
