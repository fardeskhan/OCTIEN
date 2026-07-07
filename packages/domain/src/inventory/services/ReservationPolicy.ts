import { Quantity } from '../value-objects/Quantity';

export interface AllocationRequest {
  reservationId: string;
  productId: string;
  requestedQuantity: Quantity;
}

export interface InventoryContext {
  // Contains available buckets, locations, etc. for the policy to evaluate
  availableBuckets: Array<{ locationId: string, availableQuantity: Quantity }>;
}

export interface AllocationPlan {
  allocations: Array<{ locationId: string, quantity: Quantity }>;
  isPartial: boolean;
}

export interface ReservationPolicy {
  allocate(request: AllocationRequest, context: InventoryContext): AllocationPlan;
}
