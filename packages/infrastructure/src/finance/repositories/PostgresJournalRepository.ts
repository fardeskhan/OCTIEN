import { Journal } from '../../../domain/src/finance/aggregates/Journal';

export class PostgresJournalRepository {
  async save(journal: Journal): Promise<void> {
    // 1. Transaction Start
    // 2. Lock check on related ledger hashes
    // 3. INSERT Journal and JournalLines (No UPDATE queries allowed)
    // 4. INSERT all journal.domainEvents into outbox_events table
    // 5. Commit
    
    // Once persisted, the aggregate should clear its event queue.
    journal.clearEvents();
  }

  async findById(journalId: string, tenantId: string): Promise<Journal> {
    throw new Error('Not implemented');
  }

  async findByReference(reference: string, tenantId: string): Promise<Journal[]> {
    throw new Error('Not implemented');
  }

  async exists(idempotencyKey: string, tenantId: string): Promise<boolean> {
    throw new Error('Not implemented');
  }

  async lock(journalId: string): Promise<void> {
    // Select FOR UPDATE
    throw new Error('Not implemented');
  }
}
