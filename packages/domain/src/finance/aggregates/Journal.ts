import { JournalLine } from '../entities/JournalLine';
import { JournalStatus } from '../value-objects/JournalStatus';
import { DomainEvent, JournalValidated, JournalApprovalRequested, JournalApproved, JournalPosted, JournalReversed } from '../events/JournalDomainEvents';
import { JournalIdempotencyKey } from '../../../../shared-kernel/src/finance/JournalIdempotencyKey';
import { Decimal } from '../../../../shared-kernel/src/finance/Decimal';

export class Journal {
  private _status: JournalStatus = JournalStatus.DRAFT;
  private readonly _domainEvents: DomainEvent[] = [];
  
  constructor(
    public readonly journalId: string,
    public readonly tenantId: string,
    public readonly idempotencyKey: JournalIdempotencyKey,
    public readonly postingDate: string,
    public readonly lines: JournalLine[],
    public readonly policyVersion: string,
    public ledgerHash?: string,
    public readonly previousLedgerHash?: string // Supports ledger chaining
  ) {}

  get status(): JournalStatus {
    return this._status;
  }

  get domainEvents(): DomainEvent[] {
    return this._domainEvents;
  }

  public validate(): void {
    if (this._status !== JournalStatus.DRAFT) throw new Error('Only DRAFT journals can be validated');
    this._status = JournalStatus.VALIDATED;
    this._domainEvents.push(new JournalValidated(this.journalId, new Date().toISOString()));
  }

  public requestApproval(approvalReference: string): void {
    if (this._status !== JournalStatus.VALIDATED) throw new Error('Only VALIDATED journals can request approval');
    this._status = JournalStatus.PENDING_APPROVAL;
    this._domainEvents.push(new JournalApprovalRequested(this.journalId, new Date().toISOString(), approvalReference));
  }

  public approve(approvedBy: string): void {
    if (this._status !== JournalStatus.PENDING_APPROVAL) throw new Error('Only PENDING_APPROVAL journals can be approved');
    this._status = JournalStatus.APPROVED;
    this._domainEvents.push(new JournalApproved(this.journalId, new Date().toISOString(), approvedBy));
  }

  public post(generatedHash: string): void {
    if (this._status !== JournalStatus.VALIDATED && this._status !== JournalStatus.APPROVED) {
      throw new Error(`Cannot post journal from status ${this._status}`);
    }
    
    // Lock all lines
    this.lines.forEach(line => line.lock());
    
    this.ledgerHash = generatedHash;
    this._status = JournalStatus.POSTED;
    this._domainEvents.push(new JournalPosted(this.journalId, new Date().toISOString(), generatedHash, this.lines));
  }

  public reverse(
    reversalJournalId: string,
    reason: string,
    reversedBy: string,
    reversalPolicyVersion: string
  ): Journal {
    if (this._status !== JournalStatus.POSTED) {
      throw new Error('Only POSTED journals can be reversed');
    }

    this._status = JournalStatus.REVERSED;
    this._domainEvents.push(new JournalReversed(this.journalId, reversalJournalId, new Date().toISOString()));

    // Generate compensating lines
    const compensatingLines = this.lines.map(line => {
      const reversedType = line.type === 'DEBIT' ? 'CREDIT' : 'DEBIT';
      return new JournalLine(
        `rev-line-${line.id}`,
        line.accountId,
        line.amount,
        line.currency,
        reversedType,
        line.exchangeRate,
        line.dimensions,
        `REVERSAL: ${reason}`
      );
    });

    const reversalJournal = new Journal(
      reversalJournalId,
      this.tenantId,
      new JournalIdempotencyKey(`rev-${this.idempotencyKey.value}`),
      new Date().toISOString(), // reversalTimestamp
      compensatingLines,
      reversalPolicyVersion
    );
    
    // We attach reversal metadata to the new journal for audit tracking
    (reversalJournal as any).originalJournalId = this.journalId;
    (reversalJournal as any).reversalReason = reason;
    (reversalJournal as any).reversedBy = reversedBy;

    return reversalJournal;
  }

  public clearEvents(): void {
    this._domainEvents.length = 0;
  }
}
