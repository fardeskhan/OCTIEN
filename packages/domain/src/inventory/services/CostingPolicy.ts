import { Quantity } from '../value-objects/Quantity';

export interface CostLayerRecord {
  layerId: string;
  remainingQuantity: Quantity;
  unitCost: number;
  receiptTimestamp: Date;
}

export interface ConsumptionPlan {
  consumptions: Array<{ layerId: string; quantity: Quantity }>;
  fulfilled: boolean;
}

export interface CostingPolicy {
  createConsumptionPlan(requiredQuantity: Quantity, availableLayers: CostLayerRecord[]): ConsumptionPlan;
}
