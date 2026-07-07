export enum BatchStatus {
  CREATED = 'CREATED',
  RECEIVED = 'RECEIVED',
  AVAILABLE = 'AVAILABLE',
  RESERVED = 'RESERVED', // Fully reserved, no stock left available
  CONSUMED = 'CONSUMED', // Completely used up (e.g., manufacturing)
  CLOSED = 'CLOSED',     // Closed for further operations manually
  ARCHIVED = 'ARCHIVED'  // Moved out of active state
}
