import { AggregateRepository } from '../../../../shared/event-store/AggregateRepository';
import { CostLayerAggregate } from '../aggregates/costlayer/CostLayerAggregate';
import { Quantity } from '../value-objects/Quantity';

export class CostAdjustmentWorkflow {
  constructor(private readonly repository: AggregateRepository) {}

  // Type A: Supplier Cost Correction
  public async adjustSupplierCost(layerId: string, costAdjustment: number, reason: string, actorId: string): Promise<void> {
    const layer = await this.repository.load(layerId, 'CostLayer', () => new CostLayerAggregate(layerId));
    layer.adjustCostLayer(Quantity.zero("UNIT"), costAdjustment, reason, true, actorId);
    await this.repository.save(layer);
  }

  // Note: Type B (Physical Inventory Recount) initiates a Stock Movement first, and the standard CostConsumptionSaga
  // will process the consumption logic. It does not hit the adjustCostLayer API directly.
}
