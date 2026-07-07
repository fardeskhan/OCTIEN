import { Journal } from '../aggregates/Journal';
import * as crypto from 'crypto';

export class HashIntegritySpecification {
  verifyChain(journal: Journal, expectedPreviousHash: string): { isValid: boolean; errors: string[] } {
    if (journal.previousLedgerHash !== expectedPreviousHash) {
      return { 
        isValid: false, 
        errors: [`Hash chain broken. Expected previous hash: ${expectedPreviousHash}, but Journal recorded: ${journal.previousLedgerHash}`]
      };
    }

    // Example naive regeneration of the current hash to prove immutability:
    // const serialized = `${journal.previousLedgerHash}||${journal.journalId}||...`;
    // const regenerated = crypto.createHash('sha256').update(serialized).digest('hex');
    // if (regenerated !== journal.ledgerHash) return false...

    return { isValid: true, errors: [] };
  }
}
