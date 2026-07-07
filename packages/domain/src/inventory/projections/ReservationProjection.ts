import { BaseProjection } from '../../shared/projections/BaseProjection';
import { ProjectionCheckpointStore } from '../../shared/projections/Projection';
import { ProjectionDLQ } from '../../shared/projections/ProjectionDLQ';
import { DomainEvent } from '../../shared/DomainEvent';

export class ReservationProjection extends BaseProjection {
  public readonly name = 'ReservationProjection';
  public readonly version = 'v1';

  constructor(checkpointStore: ProjectionCheckpointStore, dlq: ProjectionDLQ) {
    super(checkpointStore, dlq);
  }

  public handles(eventType: string): boolean {
    return eventType.startsWith('Reservation');
  }

  public async reset(): Promise<void> {
    // Drop table logic
  }

  protected async execute(event: DomainEvent<any>): Promise<void> {
    // Upsert reservation state, explicitly including 'Current Lifecycle State'
    // e.g., if event is ReservationAllocated, state = 'ALLOCATED'
  }
}
