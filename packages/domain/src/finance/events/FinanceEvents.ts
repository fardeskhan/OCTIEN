export interface DomainEventMetadata {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateVersion: number;
  businessId: string;
  correlationId: string;
  causationId: string;
  actorId: string;
  occurredAt: Date;
  payloadVersion: string;
}

export abstract class FinanceDomainEvent {
  constructor(public readonly metadata: DomainEventMetadata) {}
}

export class AccountCreatedEvent extends FinanceDomainEvent {
  constructor(
    metadata: DomainEventMetadata,
    public readonly payload: {
      accountCode: string;
      name: string;
      type: string;
      parentAccountId: string | null;
    }
  ) {
    super(metadata);
  }
}

export class AccountActivatedEvent extends FinanceDomainEvent {
  constructor(metadata: DomainEventMetadata) { super(metadata); }
}

export class AccountDeactivatedEvent extends FinanceDomainEvent {
  constructor(metadata: DomainEventMetadata) { super(metadata); }
}

export class JournalCreatedEvent extends FinanceDomainEvent {
  constructor(
    metadata: DomainEventMetadata,
    public readonly payload: {
      journalNumber: string;
      baseCurrency: string;
      fiscalYear: string;
      fiscalPeriod: string;
    }
  ) {
    super(metadata);
  }
}

export class JournalValidatedEvent extends FinanceDomainEvent {
  constructor(metadata: DomainEventMetadata) { super(metadata); }
}

export class JournalPostedEvent extends FinanceDomainEvent {
  constructor(
    metadata: DomainEventMetadata,
    public readonly payload: {
      totalBaseAmount: string;
    }
  ) {
    super(metadata);
  }
}

export class JournalReversedEvent extends FinanceDomainEvent {
  constructor(
    metadata: DomainEventMetadata,
    public readonly payload: {
      reversalJournalId: string;
    }
  ) {
    super(metadata);
  }
}
