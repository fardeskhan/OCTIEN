import { Projection, ProjectionEvent } from '../../../../platform-runtime/src/cqrs/Projection';
import { Decimal } from '../../../../shared-kernel/src/finance/Decimal';

export class GeneralLedgerProjection implements Projection {
  private currentVersion = 1;

  name(): string { return 'GeneralLedgerProjection'; }
  version(): number { return this.currentVersion; }

  async apply(event: ProjectionEvent): Promise<void> {
    if (event.eventType !== 'JournalPosted' && event.eventType !== 'JournalReversed') return;
    
    // Parse Payload lines
    // Insert into 'read_general_ledger'
    // id, tenant_id, account_id, date, debit, credit, running_balance, journal_id
    
    // NOTE: Running balance requires querying the immediately preceding line for that account
    // running_balance = previous.running_balance + debit - credit;
  }

  async replay(events: ProjectionEvent[]): Promise<void> {
    for (const event of events) await this.apply(event);
  }

  async reset(): Promise<void> {
    // TRUNCATE TABLE read_general_ledger;
  }

  async checkpoint(): Promise<void> {
    // Save sequence 
  }
}
