export enum PeriodStatus {
  FUTURE = 'FUTURE',         // Not yet open, prevents postings
  OPEN = 'OPEN',             // Standard daily postings allowed
  SOFT_CLOSED = 'SOFT_CLOSED', // Only adjustment or system entries allowed
  HARD_CLOSED = 'HARD_CLOSED', // Cryptographically locked, absolutely zero postings allowed
  ARCHIVED = 'ARCHIVED'      // Logically deleted
}
