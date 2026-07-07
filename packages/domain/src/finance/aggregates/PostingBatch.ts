import { Journal } from './Journal';

export type BatchState = 'STAGED' | 'VALIDATING' | 'POSTED' | 'FAILED' | 'ROLLED_BACK';

/**
 * Domain Aggregate representing an atomic transaction boundary for a collection of AccountingIntegrationEvents.
 * Dramatically increases throughput and rollback isolation over single-journal postings.
 */
export class PostingBatch {
  private state: BatchState = 'STAGED';
  private failureReason?: string;

  constructor(
    public readonly batchId: string,
    public readonly tenantId: string,
    public readonly sourceCapability: string, // e.g. CAP-PAYROLL
    public readonly journals: Journal[],
    public readonly createdAt: Date = new Date()
  ) {}

  public async validate(integrityService: any, fiscalPeriod: any): Promise<void> {
    if (this.state !== 'STAGED') throw new Error('Only STAGED batches can be validated.');
    
    this.state = 'VALIDATING';
    
    try {
      await integrityService.validatePrePosting(this.journals, fiscalPeriod);
    } catch (error: any) {
      this.state = 'FAILED';
      this.failureReason = error.message;
      throw error;
    }
  }

  public postAll(workerId: string): void {
    if (this.state !== 'VALIDATING') throw new Error('Batch must be VALIDATED before posting.');

    // Atomic application
    for (const journal of this.journals) {
      if (journal.state === 'APPROVED' || journal.state === 'DRAFT') { // Depending on Approval Policies
         journal.post(workerId);
      }
    }
    
    this.state = 'POSTED';
  }

  public rollback(reason: string): void {
    if (this.state === 'POSTED') {
      throw new Error('Already POSTED batches must be REVERSED, not rolled back.');
    }
    
    this.state = 'ROLLED_BACK';
    this.failureReason = reason;
  }
}
