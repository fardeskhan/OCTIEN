import { DomainEvent } from '@cosmyerp/domain/src/sales/domain/DomainEvent';

export interface EventStore {
    /**
     * Appends a batch of events to the aggregate stream.
     * Must throw a ConcurrencyException if expectedVersion does not match the database version.
     */
    append(events: DomainEvent[], expectedVersion: number, transactionClient?: unknown): Promise<void>;

    /**
     * Loads the entire event stream for an aggregate.
     */
    loadStream(aggregateId: string): Promise<DomainEvent[]>;

    /**
     * Loads events for an aggregate starting strictly after a specific version.
     * Used when rehydrating from a performance snapshot.
     */
    loadSinceVersion(aggregateId: string, version: number): Promise<DomainEvent[]>;
}
