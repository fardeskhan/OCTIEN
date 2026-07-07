import { AggregateRoot } from '../../../../../shared/AggregateRoot';
import { DomainEvent } from '../../../../../shared/DomainEvent';
import { Quantity } from '../../value-objects/Quantity';

export class InventoryBucketAggregate extends AggregateRoot<string> {
  private _productId: string;
  private _locationId: string;
  private _onHand: Quantity | null = null;
  private _allocated: Quantity | null = null;

  constructor(id: string) {
    super();
    this.id = id;
    this._productId = id.split('-')[0];
    this._locationId = id.split('-')[1];
  }

  // Available is strictly derived, never stored.
  public get available(): Quantity {
    if (!this._onHand || !this._allocated) throw new Error('Bucket not initialized');
    return this._onHand.subtract(this._allocated);
  }

  public receiveStock(quantity: Quantity, movementId: string, actorId: string): void {
    const event = this.createEvent('BucketStockReceived', {
      productId: this._productId,
      locationId: this._locationId,
      quantity,
      movementId
    }, actorId);
    this.applyEvent(event);
  }

  public reserveAllocation(reservationId: string, quantity: Quantity, actorId: string): void {
    if (!this.available.isGreaterThanOrEqual(quantity)) {
      throw new Error('Insufficient availability for reservation');
    }
    const event = this.createEvent('BucketAllocationReserved', {
      productId: this._productId,
      locationId: this._locationId,
      reservationId,
      quantity
    }, actorId);
    this.applyEvent(event);
  }

  public releaseAllocation(reservationId: string, quantity: Quantity, actorId: string): void {
    const event = this.createEvent('BucketAllocationReleased', {
      productId: this._productId,
      locationId: this._locationId,
      reservationId,
      quantity
    }, actorId);
    this.applyEvent(event);
  }

  public dispatchStock(quantity: Quantity, movementId: string, actorId: string): void {
    if (!this.available.isGreaterThanOrEqual(quantity)) {
      throw new Error('Insufficient availability for dispatch');
    }
    const event = this.createEvent('BucketStockDispatched', {
      productId: this._productId,
      locationId: this._locationId,
      quantity,
      movementId
    }, actorId);
    this.applyEvent(event);
  }

  public transferOutStock(targetLocationId: string, quantity: Quantity, movementId: string, actorId: string): void {
    if (!this.available.isGreaterThanOrEqual(quantity)) {
      throw new Error('Insufficient availability for transfer out');
    }
    const event = this.createEvent('BucketStockTransferredOut', {
      productId: this._productId,
      sourceLocationId: this._locationId,
      targetLocationId,
      quantity,
      movementId
    }, actorId);
    this.applyEvent(event);
  }

  public transferInStock(sourceLocationId: string, quantity: Quantity, movementId: string, actorId: string): void {
    const event = this.createEvent('BucketStockTransferredIn', {
      productId: this._productId,
      targetLocationId: this._locationId,
      sourceLocationId,
      quantity,
      movementId
    }, actorId);
    this.applyEvent(event);
  }

  private applyEvent(event: DomainEvent): void {
    // Note: State mutation happens exclusively here as per ADR-INV-016
    const payload = event.payload;
    if (!this._onHand) {
      this._onHand = Quantity.zero(payload.quantity.unit);
      this._allocated = Quantity.zero(payload.quantity.unit);
    }

    switch (event.eventType) {
      case 'BucketStockReceived':
      case 'BucketStockTransferredIn':
        this._onHand = this._onHand.add(payload.quantity);
        break;
      case 'BucketStockDispatched':
      case 'BucketStockTransferredOut':
        this._onHand = this._onHand.subtract(payload.quantity);
        break;
      case 'BucketAllocationReserved':
        this._allocated = this._allocated.add(payload.quantity);
        break;
      case 'BucketAllocationReleased':
        this._allocated = this._allocated.subtract(payload.quantity);
        break;
    }
    this.incrementVersion();
    this.addDomainEvent(event);
  }

  private createEvent(eventType: string, payload: any, actorId: string): DomainEvent {
    // Generate UUID string representation
    const cryptoUuid = "uuid-v4-placeholder-" + Date.now(); 
    return {
      eventId: cryptoUuid,
      eventType,
      aggregateId: this.id,
      aggregateVersion: this.version + 1,
      businessId: this.id,
      correlationId: null,
      causationId: null,
      actorId,
      timestamp: new Date(),
      payloadVersion: 1,
      payload
    };
  }
}
