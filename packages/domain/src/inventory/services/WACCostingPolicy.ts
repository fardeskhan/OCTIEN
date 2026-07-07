import { CostingPolicy, ConsumptionPlan, CostLayerRecord } from './CostingPolicy';
import { Quantity } from '../value-objects/Quantity';

export class WACCostingPolicy implements CostingPolicy {
  public createConsumptionPlan(requiredQuantity: Quantity, availableLayers: CostLayerRecord[]): ConsumptionPlan {
    // WAC treats all active layers identically for consumption proportioning or simply drains them.
    // Given the physical layer nature, WAC dynamically averages the cost of remaining layers,
    // but consumption drains layers chronologically to clear out old stock effectively.
    const plan: ConsumptionPlan = { consumptions: [], fulfilled: false };
    
    // Sort oldest first (standard physical drain approach for WAC in layered systems)
    const sortedLayers = [...availableLayers].sort((a, b) => a.receiptTimestamp.getTime() - b.receiptTimestamp.getTime());
    
    let remainingToFulfill = requiredQuantity;

    for (const layer of sortedLayers) {
      if (remainingToFulfill.equals(Quantity.zero(remainingToFulfill.unit))) break;
      if (layer.remainingQuantity.equals(Quantity.zero(layer.remainingQuantity.unit))) continue;

      const consumed = layer.remainingQuantity.isGreaterThanOrEqual(remainingToFulfill) 
        ? remainingToFulfill 
        : layer.remainingQuantity;

      plan.consumptions.push({ layerId: layer.layerId, quantity: consumed });
      remainingToFulfill = remainingToFulfill.subtract(consumed);
    }

    plan.fulfilled = remainingToFulfill.equals(Quantity.zero(remainingToFulfill.unit));
    return plan;
  }
}
