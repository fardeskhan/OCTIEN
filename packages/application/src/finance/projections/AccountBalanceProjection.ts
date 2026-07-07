import { Projection, ProjectionEvent } from '../../../../platform-runtime/src/cqrs/Projection';
import { Decimal } from '../../../../shared-kernel/src/finance/Decimal';

export class AccountBalanceProjection implements Projection {
  private currentVersion = 1;

  name(): string { return 'AccountBalanceProjection'; }
  version(): number { return this.currentVersion; }

  async apply(event: ProjectionEvent): Promise<void> {
    if (event.eventType !== 'JournalPosted') return; // Handles reversals purely as negative/inverted lines within standard Posts

    const lines = event.payload.lines;
    // 1. Fetch current balances for accounts in `read_account_balances`
    // 2. Apply math
    // 3. Upsert back to `read_account_balances` table
    
    // Fire internal event for TrialBalance to derive from
    // this.emit('AccountBalanceUpdated', ...)
  }

  async replay(events: ProjectionEvent[]): Promise<void> {
    for (const event of events) await this.apply(event);
  }

  async reset(): Promise<void> {
    // TRUNCATE TABLE read_account_balances;
  }

  async checkpoint(): Promise<void> {}
}
