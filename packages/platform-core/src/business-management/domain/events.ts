import { DomainEvent } from '@cosmy/shared-kernel/src/domain/DomainEvent';

export class BusinessCreated extends DomainEvent {
  constructor(public readonly businessId: string) { super(); }
}
export class BusinessUpdated extends DomainEvent {
  constructor(public readonly businessId: string) { super(); }
}
export class BusinessArchived extends DomainEvent {
  constructor(public readonly businessId: string) { super(); }
}
export class BranchCreated extends DomainEvent {
  constructor(public readonly branchId: string) { super(); }
}
export class WarehouseCreated extends DomainEvent {
  constructor(public readonly warehouseId: string) { super(); }
}
export class WarehouseActivated extends DomainEvent {
  constructor(public readonly warehouseId: string) { super(); }
}
export class WarehouseDeactivated extends DomainEvent {
  constructor(public readonly warehouseId: string) { super(); }
}
export class LocationCreated extends DomainEvent {
  constructor(public readonly locationId: string) { super(); }
}
export class FiscalYearCreated extends DomainEvent {
  constructor(public readonly fiscalYearId: string) { super(); }
}
export class FiscalPeriodOpened extends DomainEvent {
  constructor(public readonly periodId: string) { super(); }
}
export class FiscalPeriodClosed extends DomainEvent {
  constructor(public readonly periodId: string) { super(); }
}
export class BusinessSettingsUpdated extends DomainEvent {
  constructor(public readonly businessId: string) { super(); }
}
export class BrandingUpdated extends DomainEvent {
  constructor(public readonly businessId: string) { super(); }
}
