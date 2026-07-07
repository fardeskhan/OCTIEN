import { ReverseJournalCommand } from '../commands/ReverseJournalCommand';
// import { JournalReversalService } from '../services/JournalReversalService';

export class ReverseJournalHandler {
  constructor(
    private readonly journalRepository: any, // PostgresJournalRepository
    private readonly policyResolver: any     // AccountingPolicyResolver
  ) {}

  async handle(command: ReverseJournalCommand): Promise<void> {
    // 1. Fetch original Journal `originalJournalId`
    // 2. Enforce Reversal Invariants:
    //    - exists?
    //    - status === POSTED?
    //    - never reversed? (reversal of reversal not allowed without strict flags)
    // 3. Resolve historical AccountingPolicy for `reversalTimestamp`
    // 4. Generate Reversal via `Journal.reverse()`
    // 5. Append new chained LedgerHash
    // 6. Save BOTH Original Journal (now REVERSED) and Reversal Journal (now POSTED) in one transaction.
  }
}
