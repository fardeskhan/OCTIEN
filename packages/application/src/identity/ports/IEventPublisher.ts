import { DomainEvent } from '../../../../shared-kernel/src/domain/DomainEvent';

export interface IEventPublisher {
  /**
   * Publishes a domain event directly to the Event Bus (Kafka/Redis Streams).
   * Note: In the COSMY architecture, aggregates do NOT call this directly. 
   * Instead, repositories commit events to the Outbox, and a background worker
   * calls this publisher to guarantee at-least-once delivery.
   */
  publish(event: DomainEvent): Promise<void>;

  /**
   * Publishes a batch of events transactionally if supported by the underlying broker.
   */
  publishBatch(events: DomainEvent[]): Promise<void>;
}
