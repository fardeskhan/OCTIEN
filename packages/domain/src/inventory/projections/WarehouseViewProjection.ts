import { BaseProjection } from '../../shared/projections/BaseProjection';
import { ProjectionCheckpointStore } from '../../shared/projections/Projection';
import { ProjectionDLQ } from '../../shared/projections/ProjectionDLQ';
import { DomainEvent } from '../../shared/DomainEvent';

export class WarehouseViewProjection extends BaseProjection {
  public readonly name = 'WarehouseViewProjection';
  public readonly version = 'v1';

  constructor(checkpointStore: ProjectionCheckpointStore, dlq: ProjectionDLQ) {
    super(checkpointStore, dlq);
  }

  public handles(eventType: string): boolean {
    return ['LocationCreated', 'LocationActivated', 'LocationDeactivated', 'StockMoved'].includes(eventType);
  }

  public async reset(): Promise<void> {
    // Drop table logic
  }

  protected async execute(event: DomainEvent<any>): Promise<void> {
    // Update visuals: capacity, utilization, active bins
  }
}
