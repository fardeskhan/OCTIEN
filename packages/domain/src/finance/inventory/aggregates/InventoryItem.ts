export class InventoryItem {
  constructor(
    public readonly skuId: string,
    public readonly tenantId: string,
    public readonly name: string,
    public readonly valuationMethod: 'FIFO' | 'WEIGHTED_AVERAGE'
  ) {}
}
