import { BaseProjection } from '../../shared/projections/BaseProjection';
import { ProjectionCheckpointStore } from '../../shared/projections/Projection';
import { ProjectionDLQ } from '../../shared/projections/ProjectionDLQ';
import { DomainEvent } from '../../shared/DomainEvent';
import { Quantity } from '../value-objects/Quantity';

export interface InventoryAvailabilityState {
  productId: string;
  locationId: string;
  onHand: Quantity;
  reserved: Quantity;
}

export class InventoryAvailabilityProjection extends BaseProjection {
  public readonly name = 'InventoryAvailabilityProjection';
  public readonly version = 'v1';

  // In memory mock for derived state database
  private state: Map<string, InventoryAvailabilityState> = new Map();

  constructor(checkpointStore: ProjectionCheckpointStore, dlq: ProjectionDLQ) {
    super(checkpointStore, dlq);
  }

  public handles(eventType: string): boolean {
    const handled = [
      'StockMoved',
      'BucketAllocationReserved',
      'BucketAllocationReleased'
    ];
    return handled.includes(eventType);
  }

  public async reset(): Promise<void> {
    this.state.clear();
  }

  protected async execute(event: DomainEvent<any>): Promise<void> {
    const payload = event.payload;

    if (event.eventType === 'StockMoved') {
      if (payload.fromLocationId) {
        const keyOut = `${payload.productId}-${payload.fromLocationId}`;
        const record = this.getOrInit(keyOut, payload.productId, payload.fromLocationId, payload.quantity.unitOfMeasure);
        record.onHand = record.onHand.subtract(payload.quantity);
        this.state.set(keyOut, record);
      }
      
      if (payload.toLocationId) {
        const keyIn = `${payload.productId}-${payload.toLocationId}`;
        const record = this.getOrInit(keyIn, payload.productId, payload.toLocationId, payload.quantity.unitOfMeasure);
        record.onHand = record.onHand.add(payload.quantity);
        this.state.set(keyIn, record);
      }
    } else if (event.eventType === 'BucketAllocationReserved') {
      const key = `${payload.productId}-${payload.locationId}`;
      const record = this.getOrInit(key, payload.productId, payload.locationId, payload.quantity.unitOfMeasure);
      record.reserved = record.reserved.add(payload.quantity);
      this.state.set(key, record);
    } else if (event.eventType === 'BucketAllocationReleased') {
      const key = `${payload.productId}-${payload.locationId}`;
      const record = this.getOrInit(key, payload.productId, payload.locationId, payload.quantity.unitOfMeasure);
      record.reserved = record.reserved.subtract(payload.quantity);
      this.state.set(key, record);
    }
  }

  public getAvailable(productId: string, locationId: string): Quantity {
    const key = `${productId}-${locationId}`;
    const record = this.state.get(key);
    if (!record) throw new Error('Not found');
    return record.onHand.subtract(record.reserved);
  }

  private getOrInit(key: string, productId: string, locationId: string, uom: string): InventoryAvailabilityState {
    if (!this.state.has(key)) {
      this.state.set(key, {
        productId,
        locationId,
        onHand: Quantity.zero(uom),
        reserved: Quantity.zero(uom)
      });
    }
    return this.state.get(key)!;
  }
}
