import { AggregateRoot } from '@cosmy/shared-kernel/src/domain/AggregateRoot';
import { DomainEvent } from '@cosmy/shared-kernel/src/domain/DomainEvent';
import { Entity } from '@cosmy/shared-kernel/src/domain/Entity';

export class WarehouseCreatedDomainEvent extends DomainEvent {
  constructor(public readonly warehouseId: string) { super(); }
}

export class WarehouseActivatedDomainEvent extends DomainEvent {
  constructor(public readonly warehouseId: string) { super(); }
}

export class WarehouseDeactivatedDomainEvent extends DomainEvent {
  constructor(public readonly warehouseId: string) { super(); }
}

export class Location extends Entity<string> {
  constructor(
    id: string,
    public zone: string,
    public bin: string,
    public shelf: string
  ) {
    super(id);
  }
}

export enum WarehouseState {
  CREATED = 'CREATED',
  ACTIVE = 'ACTIVE',
  UNDER_MAINTENANCE = 'UNDER_MAINTENANCE',
  INACTIVE = 'INACTIVE',
  ARCHIVED = 'ARCHIVED'
}

export class Warehouse extends AggregateRoot<string> {
  private locations: Location[] = [];

  private constructor(
    id: string,
    public readonly businessId: string,
    public name: string,
    public state: WarehouseState
  ) {
    super(id);
  }

  public static create(id: string, businessId: string, name: string): Warehouse {
    const wh = new Warehouse(id, businessId, name, WarehouseState.CREATED);
    wh.addDomainEvent(new WarehouseCreatedDomainEvent(id));
    return wh;
  }

  public addLocation(location: Location): void {
    this.locations.push(location);
  }

  public activate(): void {
    this.state = WarehouseState.ACTIVE;
    this.addDomainEvent(new WarehouseActivatedDomainEvent(this.id));
  }

  public deactivate(): void {
    this.state = WarehouseState.INACTIVE;
    this.addDomainEvent(new WarehouseDeactivatedDomainEvent(this.id));
  }

  public setMaintenanceMode(): void {
    this.state = WarehouseState.UNDER_MAINTENANCE;
  }
}
