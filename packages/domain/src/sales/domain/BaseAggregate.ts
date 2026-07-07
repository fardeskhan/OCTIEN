import { DomainEvent } from './DomainEvent';

export abstract class BaseAggregate {
    public aggregateId: string;
    public aggregateVersion: number = 0;
    private uncommittedEvents: DomainEvent[] = [];

    protected constructor(aggregateId: string) {
        this.aggregateId = aggregateId;
    }

    /**
     * Applies the event to internal state and queues it for persistence.
     * Note: Does not advance aggregateVersion (per ADR-SALES-003C).
     */
    protected raiseEvent(event: DomainEvent): void {
        this.apply(event);
        this.uncommittedEvents.push(event);
    }

    /**
     * Mutates internal state. Contains NO business logic or validation.
     */
    protected abstract apply(event: DomainEvent): void;

    /**
     * Rehydrates state from the Event Store history.
     */
    public loadFromHistory(events: DomainEvent[]): void {
        for (const event of events) {
            this.apply(event);
            this.aggregateVersion = event.eventVersion;
        }
    }

    public getUncommittedEvents(): DomainEvent[] {
        return [...this.uncommittedEvents];
    }

    /**
     * Called by the Repository after successful Event Store persistence.
     */
    public commit(newVersion: number): void {
        this.aggregateVersion = newVersion;
        this.uncommittedEvents = [];
    }
}
