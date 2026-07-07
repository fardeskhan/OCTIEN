import { AggregateRoot } from '../../../../../shared/AggregateRoot';
import { DomainEvent } from '../../../../../shared/DomainEvent';
import { Quantity } from '../../value-objects/Quantity';

export enum CostLayerStatus {
  CREATED = 'CREATED',
  ACTIVE = 'ACTIVE',
  ADJUSTED = 'ADJUSTED',
  CLOSED = 'CLOSED'
}

export class CostLayerAggregate extends AggregateRoot<string> {
  private _tenantId: string = '';
  private _productId: string = '';
  private _locationId: string = '';
  private _receiptReference: string = '';
  private _receiptTimestamp: Date | null = null;
  
  private _status: CostLayerStatus | null = null;
  private _remainingQuantity: Quantity | null = null;
  private _unitCost: number = 0;
  
  constructor(id: string) {
    super();
    this.id = id;
  }

  public createCostLayer(
    tenantId: string,
    productId: string, 
    locationId: string, 
    receiptReference: string,
    receiptTimestamp: Date,
    initialQuantity: Quantity, 
    unitCost: number, 
    sourceMovementId: string, 
    actorId: string
  ): void {
    if (this.version > 0) throw new Error('Already created');
    
    const event = this.createEvent('CostLayerCreated', {
      layerId: this.id,
      tenantId,
      productId,
      locationId,
      receiptReference,
      receiptTimestamp,
      initialQuantity,
      unitCost,
      sourceMovementId
    }, actorId);
    this.applyEvent(event);
  }

  public consumeCostLayer(consumedQuantity: Quantity, targetMovementId: string, actorId: string): void {
    if (this._status !== CostLayerStatus.ACTIVE && this._status !== CostLayerStatus.CREATED && this._status !== CostLayerStatus.ADJUSTED) {
      throw new Error(`Cannot consume from state ${this._status}`);
    }
    if (!this._remainingQuantity) throw new Error('Cost layer not initialized');
    
    // Invariant: remainingQuantity >= 0 must be impossible to violate
    if (!this._remainingQuantity.isGreaterThanOrEqual(consumedQuantity)) {
      throw new Error('Cannot consume more than remaining quantity (Invariant Violation)');
    }
    
    const newRemainingQty = this._remainingQuantity.subtract(consumedQuantity);
    const event = this.createEvent('CostLayerConsumed', {
      layerId: this.id,
      consumedQuantity,
      remainingQuantity: newRemainingQty,
      targetMovementId,
      isClosed: newRemainingQty.equals(Quantity.zero(newRemainingQty.unit))
    }, actorId);
    this.applyEvent(event);
  }

  public adjustCostLayer(quantityAdjustment: Quantity, costAdjustment: number, reason: string, isPositiveQtyAdjustment: boolean, actorId: string): void {
    if (this._status === CostLayerStatus.CLOSED && !isPositiveQtyAdjustment && costAdjustment === 0) {
      throw new Error('Cannot adjust quantity on a closed layer');
    }
    if (!this._remainingQuantity) throw new Error('Cost layer not initialized');
    
    let newRemainingQty: Quantity;
    if (isPositiveQtyAdjustment) {
      newRemainingQty = this._remainingQuantity.add(quantityAdjustment);
    } else {
      if (!this._remainingQuantity.isGreaterThanOrEqual(quantityAdjustment)) {
        throw new Error('Adjustment cannot result in negative remaining quantity (Invariant Violation)');
      }
      newRemainingQty = this._remainingQuantity.subtract(quantityAdjustment);
    }
    
    const newUnitCost = this._unitCost + costAdjustment;

    const event = this.createEvent('CostLayerAdjusted', {
      layerId: this.id,
      quantityAdjustment,
      costAdjustment,
      newUnitCost,
      reason,
      newRemainingQty,
      isClosed: newRemainingQty.equals(Quantity.zero(newRemainingQty.unit))
    }, actorId);
    this.applyEvent(event);
  }

  private applyEvent(event: DomainEvent): void {
    switch (event.eventType) {
      case 'CostLayerCreated':
        this._tenantId = event.payload.tenantId;
        this._productId = event.payload.productId;
        this._locationId = event.payload.locationId;
        this._receiptReference = event.payload.receiptReference;
        this._receiptTimestamp = event.payload.receiptTimestamp;
        this._remainingQuantity = event.payload.initialQuantity;
        this._unitCost = event.payload.unitCost;
        this._status = CostLayerStatus.ACTIVE;
        break;
      case 'CostLayerConsumed':
        this._remainingQuantity = event.payload.remainingQuantity;
        this._status = event.payload.isClosed ? CostLayerStatus.CLOSED : CostLayerStatus.ACTIVE;
        break;
      case 'CostLayerAdjusted':
        this._remainingQuantity = event.payload.newRemainingQty;
        this._unitCost = event.payload.newUnitCost;
        this._status = event.payload.isClosed ? CostLayerStatus.CLOSED : CostLayerStatus.ADJUSTED;
        break;
    }
    this.incrementVersion();
    this.addDomainEvent(event);
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
