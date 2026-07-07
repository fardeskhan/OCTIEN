export interface DomainEvent<TPayload = any> {
  eventId: string;
  eventType: string;
  aggregateId: string;
  aggregateVersion: number;
  businessId: string;
  correlationId: string | null;
  causationId: string | null;
  actorId: string;
  timestamp: Date;
  payloadVersion: number;
  payload: TPayload;
}
