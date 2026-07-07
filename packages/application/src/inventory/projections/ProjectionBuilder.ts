import { DomainEvent } from 'domain/src/shared/DomainEvent';

/**
 * Projection Builders listen to Outbox/Domain events and update Read Models.
 */
export interface ProjectionBuilder {
  handleEvent(event: DomainEvent): Promise<void>;
}

export class MovementTimelineProjectionBuilder implements ProjectionBuilder {
  public async handleEvent(event: DomainEvent): Promise<void> {
    
    // Switch on event.eventType to rebuild 'read_movement_timeline' tables.
    if (event.eventType === 'Inventory.StockReceived') {
      // 1. Decode event payload
      // 2. Insert row directly into MovementTimeline read-model SQL table
      // 3. Increment counters in DashboardSummary read-model SQL table
    }
  }
}
