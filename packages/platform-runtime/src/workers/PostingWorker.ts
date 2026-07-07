import { IBackgroundWorker } from './WorkerRegistry';
import { EventStore } from '../../../shared-kernel/src/events/EventStore';

export interface AccountingIntegrationEvent {
  sourceCapability: string;
  eventType: string; // e.g. 'SALES_INVOICE_APPROVED'
  tenantId: string;
  postingTemplateId: string;
  documentId: string;
  currency: string;
  lines: any[];
  taxes: any[];
  dimensions: Map<string, string>;
}

/**
 * Platform Service: Financial Posting Worker (FPE)
 * Cross-cutting infrastructure worker that listens for Canonical Accounting Integration Events
 * from any capability (Sales, Inventory, HR) and translates them into double-entry 
 * PostJournalCommands sent to CAP-FINANCE.
 */
export class PostingWorker implements IBackgroundWorker {
  public id = 'worker-financial-posting-engine';
  public capabilities = ['FINANCE_POSTING'];

  constructor(
    private readonly eventStore: EventStore,
    private readonly ruleRegistry: any, // PostingRuleRegistry
    private readonly commandBus: any // ICommandBus
  ) {}

  public async start(): Promise<void> {
    console.log(`[PostingWorker] Starting Translation Engine for Canonical Accounting Events.`);
    // Subscribe to EventStore streams matching 'AccountingIntegrationEvent'
  }

  public async stop(): Promise<void> {
    console.log(`[PostingWorker] Shutting down gracefully.`);
  }

  public async handleEvent(event: AccountingIntegrationEvent): Promise<void> {
    try {
      // 1. Fetch Tenant-specific Configured Rules for this Template
      const template = await this.ruleRegistry.getTemplate(event.tenantId, event.postingTemplateId);

      // 2. Evaluate Expressions (Taxes, Line Items) against Template Configuration
      const journalLines = template.evaluate(event);

      // 3. Dispatch strict Command to CAP-FINANCE boundary
      await this.commandBus.dispatch({
        type: 'CreateJournalCommand',
        tenantId: event.tenantId,
        lines: journalLines,
        audit: {
          sourceCapability: event.sourceCapability,
          sourceAggregateId: event.documentId,
          // ... remaining trace elements
        }
      });
    } catch (error) {
      // Throw to Outbox/DLQ - worker will naturally hit OperationalPolicy (Retry -> Drain -> Quarantine)
      throw error;
    }
  }
}
