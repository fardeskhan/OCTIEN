export enum AccountStatus {
  DRAFT = 'DRAFT',           // No postings allowed. Awaiting activation.
  ACTIVE = 'ACTIVE',         // Fully open for postings.
  RESTRICTED = 'RESTRICTED', // Limited posting (e.g., only automated systems).
  FROZEN = 'FROZEN',         // Read-only. No postings, no structural modifications.
  ARCHIVED = 'ARCHIVED'      // Logically deleted. No postings.
}
