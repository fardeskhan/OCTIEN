export interface DomainEvent {
  eventName: string;
  timestamp: string;
  aggregateId: string;
}

export class JournalValidated implements DomainEvent {
  public readonly eventName = 'JournalValidated';
  constructor(public readonly aggregateId: string, public readonly timestamp: string) {}
}

export class JournalApprovalRequested implements DomainEvent {
  public readonly eventName = 'JournalApprovalRequested';
  constructor(public readonly aggregateId: string, public readonly timestamp: string, public readonly approvalReference: string) {}
}

export class JournalApproved implements DomainEvent {
  public readonly eventName = 'JournalApproved';
  constructor(public readonly aggregateId: string, public readonly timestamp: string, public readonly approvedBy: string) {}
}

export class JournalPosted implements DomainEvent {
  public readonly eventName = 'JournalPosted';
  constructor(
    public readonly aggregateId: string, 
    public readonly timestamp: string, 
    public readonly ledgerHash: string,
    public readonly lines: any[]
  ) {}
}

export class JournalReversed implements DomainEvent {
  public readonly eventName = 'JournalReversed';
  constructor(
    public readonly aggregateId: string, // The original journal ID
    public readonly reversalJournalId: string, // The newly generated compensating journal ID
    public readonly timestamp: string
  ) {}
}
