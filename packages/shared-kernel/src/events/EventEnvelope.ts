export interface EventEnvelope<TPayload = any> {
  eventId: string;
  eventType: string;
  occurredAt: string;
  businessId: string;
  tenantId: string;
  aggregateId: string;
  aggregateVersion: number;
  correlationId: string;
  causationId: string;
  actorId: string;
  payloadVersion: string;
  payload: TPayload;
}
