export enum OutboxStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  PROCESSED = 'PROCESSED',
  FAILED = 'FAILED',
  DEAD_LETTER = 'DEAD_LETTER'
}

export interface OutboxEvent {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateVersion: number;
  correlationId: string | null;
  causationId: string | null;
  businessId: string;
  occurredAt: Date;
  payload: any;
  retryCount: number;
  status: OutboxStatus;
  lastAttemptAt: Date | null;
  failureReason: string | null;
}
