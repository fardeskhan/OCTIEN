import { AggregateRoot } from '../../../../../shared/AggregateRoot';
import { DomainEvent } from '../../../../../shared/DomainEvent';

export type LocationType = 'WAREHOUSE' | 'ZONE' | 'BIN' | 'TRANSIT' | 'SCRAP' | 'CUSTOMER' | 'SUPPLIER';

export class LocationAggregate extends AggregateRoot<string> {
  private _type: LocationType = 'WAREHOUSE';
  private _active: boolean = false;
  private _parentLocationId: string | undefined;
  
  constructor(id: string) {
    super();
    this.id = id;
  }

  public createLocation(locationType: LocationType, parentLocationId: string | undefined, actorId: string): void {
    if (this.version > 0) throw new Error('Already created');
    
    const event = this.createEvent('LocationCreated', {
      locationId: this.id,
      locationType,
      parentLocationId
    }, actorId);
    this.applyEvent(event);
  }

  public activateLocation(actorId: string): void {
    if (this._active) throw new Error('Already active');
    const event = this.createEvent('LocationActivated', { locationId: this.id }, actorId);
    this.applyEvent(event);
  }

  public deactivateLocation(reason: string, actorId: string): void {
    if (!this._active) throw new Error('Already inactive');
    const event = this.createEvent('LocationDeactivated', { locationId: this.id, reason }, actorId);
    this.applyEvent(event);
  }

  public moveLocation(newParentLocationId: string, parentGraph: Set<string>, actorId: string): void {
    // Invariant: Topology cycles must be impossible (Parent Loop).
    // The parentGraph Set represents the entire ancestor chain of the intended new parent.
    // If THIS location ID is found anywhere in the ancestor chain of the new parent,
    // we would be moving this location inside of one of its own descendants, creating a cycle.
    if (parentGraph.has(this.id) || newParentLocationId === this.id) {
      throw new Error('Topology cycle detected (Parent Loop). Location move rejected.');
    }

    const event = this.createEvent('LocationMoved', {
      locationId: this.id,
      newParentLocationId
    }, actorId);
    this.applyEvent(event);
  }

  private applyEvent(event: DomainEvent): void {
    switch (event.eventType) {
      case 'LocationCreated':
        this._type = event.payload.locationType;
        this._parentLocationId = event.payload.parentLocationId;
        break;
      case 'LocationActivated':
        this._active = true;
        break;
      case 'LocationDeactivated':
        this._active = false;
        break;
      case 'LocationMoved':
        this._parentLocationId = event.payload.newParentLocationId;
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
