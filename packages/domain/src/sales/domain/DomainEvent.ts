export interface DomainEvent<T = unknown> {
    eventId: string;
    aggregateId: string;
    aggregateType: string;
    eventType: string;
    eventVersion: number;
    timestamp: Date;
    causationId?: string;
    correlationId?: string;
    payload: T;
    metadata: Record<string, unknown>;
}
