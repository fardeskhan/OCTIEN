import { DomainEvent } from '@cosmyerp/domain/src/sales/domain/DomainEvent';

export interface OutboxMessage {
    id: string; // usually matches eventId
    eventType: string;
    aggregateId: string;
    payload: unknown;
    createdAt: Date;
    processedAt: Date | null;
    error: string | null;
    attemptCount: number;
}

export interface OutboxRepository {
    /**
     * Inserts events into the outbox table. 
     * Must be executed within the same database transaction as EventStore.append().
     */
    insert(events: DomainEvent[], transactionClient?: unknown): Promise<void>;
    
    /**
     * Retrieves unprocessed messages for the publisher worker.
     */
    fetchUnprocessed(batchSize: number): Promise<OutboxMessage[]>;

    /**
     * Marks a message as successfully processed.
     */
    markProcessed(messageId: string): Promise<void>;

    /**
     * Increments the attempt count and logs an error.
     */
    recordFailure(messageId: string, error: string): Promise<void>;

    /**
     * Moves a message to the Dead Letter Queue (DLQ) after exceeding max retries.
     */
    moveToDLQ(messageId: string, error: string): Promise<void>;
}
