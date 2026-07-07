import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';
import { InventoryValuationLayer } from '../aggregates/InventoryValuationLayer';

export class InventoryValuationResult {
  constructor(
    public readonly transactionId: string,
    public readonly tenantId: string,
    public readonly valuationMethod: 'FIFO' | 'WEIGHTED_AVERAGE',
    public readonly quantity: number,
    public readonly unitCost: Decimal,
    public readonly totalCost: Decimal,
    public readonly valuationLayers: InventoryValuationLayer[]
  ) {}
}
