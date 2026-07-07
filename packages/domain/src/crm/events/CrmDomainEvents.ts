import { DomainEvent } from '@cosmy/shared-kernel/src/domain/DomainEvent';

export class CustomerCreatedDomainEvent extends DomainEvent {
  constructor(public readonly customerId: string) { super(); }
}

export class CustomerActivatedDomainEvent extends DomainEvent {
  constructor(public readonly customerId: string) { super(); }
}

export class CustomerSuspendedDomainEvent extends DomainEvent {
  constructor(public readonly customerId: string) { super(); }
}

export class CustomerArchivedDomainEvent extends DomainEvent {
  constructor(public readonly customerId: string) { super(); }
}

export class CreditProfileChangedDomainEvent extends DomainEvent {
  constructor(public readonly customerId: string) { super(); }
}

export class ContactAddedDomainEvent extends DomainEvent {
  constructor(public readonly customerId: string, public readonly contactId: string) { super(); }
}

export class ContactUpdatedDomainEvent extends DomainEvent {
  constructor(public readonly customerId: string, public readonly contactId: string) { super(); }
}

export class ContactRemovedDomainEvent extends DomainEvent {
  constructor(public readonly customerId: string, public readonly contactId: string) { super(); }
}

export class AddressAddedDomainEvent extends DomainEvent {
  constructor(public readonly customerId: string, public readonly addressId: string) { super(); }
}

export class AddressUpdatedDomainEvent extends DomainEvent {
  constructor(public readonly customerId: string, public readonly addressId: string) { super(); }
}

export class AddressRemovedDomainEvent extends DomainEvent {
  constructor(public readonly customerId: string, public readonly addressId: string) { super(); }
}
