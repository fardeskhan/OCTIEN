import { AggregateRoot } from '../../../../../shared/AggregateRoot';
import { DomainEvent } from '../../../../../shared/DomainEvent';
import { Quantity } from '../../value-objects/Quantity';

export enum ReservationStatus {
  CREATED = 'CREATED',
  ALLOCATED = 'ALLOCATED',
  PARTIALLY_ALLOCATED = 'PARTIALLY_ALLOCATED',
  RELEASED = 'RELEASED',
  EXPIRED = 'EXPIRED',
  FULFILLED = 'FULFILLED'
}

export class ReservationAggregate extends AggregateRoot<string> {
  private _tenantId: string = '';
  private _productId: string = '';
  private _sourceContext: string = '';
  private _sourceReferenceId: string = '';
  
  private _status: ReservationStatus | null = null;
  private _requestedQuantity: Quantity | null = null;
  private _allocatedQuantity: Quantity | null = null;
  private _remainingQuantity: Quantity | null = null;
  
  constructor(id: string) {
    super();
    this.id = id;
  }

  public createReservation(
    tenantId: string,
    productId: string, 
    sourceContext: string,
    sourceReferenceId: string,
    requestedQuantity: Quantity, 
    actorId: string
  ): void {
    if (this.version > 0) throw new Error('Already created');
    
    const event = this.createEvent('ReservationCreated', {
      reservationId: this.id,
      tenantId,
      productId,
      sourceContext,
      sourceReferenceId,
      requestedQuantity
    }, actorId);
    this.applyEvent(event);
  }

  public allocateReservation(allocatedQuantity: Quantity, actorId: string): void {
    if (this._status !== ReservationStatus.CREATED && this._status !== ReservationStatus.PARTIALLY_ALLOCATED) {
       throw new Error(`Invalid state transition. Cannot allocate from state ${this._status}`);
    }
    if (!this._remainingQuantity || !this._remainingQuantity.isGreaterThanOrEqual(allocatedQuantity)) {
      throw new Error('Cannot allocate more than remaining requested quantity');
    }
    
    const newAllocated = this._allocatedQuantity ? this._allocatedQuantity.add(allocatedQuantity) : allocatedQuantity;
    const newRemaining = this._requestedQuantity!.subtract(newAllocated);

    const event = this.createEvent('ReservationAllocated', {
      reservationId: this.id,
      allocatedQuantity: newAllocated,
      remainingQuantity: newRemaining,
      isPartial: !newRemaining.equals(Quantity.zero(newRemaining.unit))
    }, actorId);
    this.applyEvent(event);
  }

  public releaseReservation(reason: string, actorId: string): void {
    if (this._status === ReservationStatus.RELEASED || this._status === ReservationStatus.FULFILLED || this._status === ReservationStatus.EXPIRED) {
      throw new Error(`Cannot release from terminal state ${this._status}`);
    }
    
    const event = this.createEvent('ReservationReleased', {
      reservationId: this.id,
      releasedQuantity: this._allocatedQuantity || Quantity.zero(this._requestedQuantity!.unit),
      reason
    }, actorId);
    this.applyEvent(event);
  }

  public fulfillReservation(fulfilledQuantity: Quantity, movementId: string, actorId: string): void {
    if (this._status !== ReservationStatus.ALLOCATED && this._status !== ReservationStatus.PARTIALLY_ALLOCATED) {
       throw new Error(`Cannot fulfill from state ${this._status}`);
    }
    // Partial fulfillment logic could reduce allocated quantity, etc.
    // For now, assume fulfillment of whatever is currently allocated.
    if (!this._allocatedQuantity?.isGreaterThanOrEqual(fulfilledQuantity)) {
      throw new Error('Cannot fulfill more than allocated');
    }
    
    const event = this.createEvent('ReservationFulfilled', {
      reservationId: this.id,
      fulfilledQuantity,
      movementId
    }, actorId);
    this.applyEvent(event);
  }
  
  public expireReservation(actorId: string): void {
    if (this._status !== ReservationStatus.CREATED && this._status !== ReservationStatus.PARTIALLY_ALLOCATED && this._status !== ReservationStatus.ALLOCATED) {
       throw new Error('Invalid state transition to EXPIRED');
    }
    
    const event = this.createEvent('ReservationExpired', {
      reservationId: this.id
    }, actorId);
    this.applyEvent(event);
  }

  private applyEvent(event: DomainEvent): void {
    const payload = event.payload;
    switch (event.eventType) {
      case 'ReservationCreated':
        this._tenantId = payload.tenantId;
        this._productId = payload.productId;
        this._sourceContext = payload.sourceContext;
        this._sourceReferenceId = payload.sourceReferenceId;
        this._requestedQuantity = payload.requestedQuantity;
        this._allocatedQuantity = Quantity.zero(payload.requestedQuantity.unit);
        this._remainingQuantity = payload.requestedQuantity;
        this._status = ReservationStatus.CREATED;
        break;
      case 'ReservationAllocated':
        this._allocatedQuantity = payload.allocatedQuantity;
        this._remainingQuantity = payload.remainingQuantity;
        this._status = payload.isPartial ? ReservationStatus.PARTIALLY_ALLOCATED : ReservationStatus.ALLOCATED;
        this.verifyQuantityInvariant();
        break;
      case 'ReservationReleased':
        this._allocatedQuantity = Quantity.zero(this._requestedQuantity!.unit);
        this._status = ReservationStatus.RELEASED;
        break;
      case 'ReservationFulfilled':
        this._status = ReservationStatus.FULFILLED;
        break;
      case 'ReservationExpired':
        this._status = ReservationStatus.EXPIRED;
        break;
    }
    this.incrementVersion();
    this.addDomainEvent(event);
  }

  private verifyQuantityInvariant(): void {
    if (!this._requestedQuantity || !this._allocatedQuantity || !this._remainingQuantity) return;
    const computedRequested = this._allocatedQuantity.add(this._remainingQuantity);
    if (!this._requestedQuantity.equals(computedRequested)) {
       throw new Error('Invariant Violation: requestedQuantity != allocatedQuantity + remainingQuantity');
    }
  }

  private createEvent(eventType: string, payload: any, actorId: string): DomainEvent {
    return {
      eventId: "uuid-v4-placeholder-" + Date.now(),
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
