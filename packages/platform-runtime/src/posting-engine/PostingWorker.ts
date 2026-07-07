import { AccountingIntegrationEvent } from '../../../contracts/accounting/AccountingIntegrationEvent';
import { PostJournalCommand } from '../../../application/src/finance/commands/PostJournalCommand';
import { PostingIdempotencyKey } from '../../../shared-kernel/src/finance/PostingIdempotencyKey';

export enum PostingState {
  RECEIVED = 'RECEIVED',
  PLANNED = 'PLANNED',
  VALIDATED = 'VALIDATED',
  APPROVED = 'APPROVED',
  GENERATED = 'GENERATED',
  PERSISTED = 'PERSISTED',
  PUBLISHED = 'PUBLISHED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

/**
 * PLATFORM RUNTIME: POSTING ENGINE
 * Orchestrates journal postings with strict state-machine tracking.
 */
export class PostingWorker {
  constructor(
    private readonly ruleRegistry: any,
    private readonly planner: any,
    private readonly batchBuilder: any,
    private readonly validationEngine: any,
    private readonly dispatcher: any,
    private readonly dlq: any
  ) {}

  async handleEvent(event: AccountingIntegrationEvent): Promise<void> {
    const idempotencyKey = new PostingIdempotencyKey(
      event.metadata.tenantId,
      event.metadata.sourceCapability,
      event.metadata.eventId,
      event.contractVersion,
      event.financialIntent
    );

    const traceContext = { idempotencyKey: idempotencyKey.value, tenantId: event.metadata.tenantId };
    
    try {
      this.transitionState(PostingState.RECEIVED, traceContext);

      const rules = await this.ruleRegistry.resolve(event.financialIntent, event.metadata.sourceAggregate);
      const plan = this.planner.plan(event, rules);
      this.transitionState(PostingState.PLANNED, traceContext);

      const batch = this.batchBuilder.build(plan);
      const validationResult = this.validationEngine.validate(batch);
      if (!validationResult.isValid) {
        throw new Error(`Validation Failed: ${validationResult.errors.join(', ')}`);
      }
      this.transitionState(PostingState.VALIDATED, traceContext);

      // In production: route through ApprovalEngine here if policies require it.
      this.transitionState(PostingState.APPROVED, traceContext);

      // Generate actual Journal objects (handled by domain service inside dispatcher currently)
      this.transitionState(PostingState.GENERATED, traceContext);

      const command = new PostJournalCommand(batch);
      await this.dispatcher.dispatch(command); // Persists to Repository and publishes to Outbox
      
      this.transitionState(PostingState.PERSISTED, traceContext);
      this.transitionState(PostingState.PUBLISHED, traceContext);
      this.transitionState(PostingState.COMPLETED, traceContext);

    } catch (error: any) {
      this.transitionState(PostingState.FAILED, { ...traceContext, error: error.message });
      await this.dlq.enqueue(event, error);
    }
  }

  private transitionState(state: PostingState, context: any) {
    console.log(`[CAP-OPS] Transitioning to ${state}:`, JSON.stringify(context));
  }
}
