export enum JournalStatus {
  DRAFT = 'DRAFT',                     // Being constructed, lines being added
  VALIDATED = 'VALIDATED',             // Zero-sum verified, period open, etc.
  PENDING_APPROVAL = 'PENDING_APPROVAL', // Waiting on human/system authorization due to policy limits
  APPROVED = 'APPROVED',               // Authorized, ready for hash generation and commit
  POSTED = 'POSTED',                   // Cryptographically committed. Absolutely immutable.
  REVERSED = 'REVERSED'                // A compensatory journal has logically cancelled this entry
}
