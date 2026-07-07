import { BaseProjection } from '../../shared/projections/BaseProjection';
import { ProjectionCheckpointStore } from '../../shared/projections/Projection';
import { ProjectionDLQ } from '../../shared/projections/ProjectionDLQ';
import { DomainEvent } from '../../shared/DomainEvent';

export class ValuationProjection extends BaseProjection {
  public readonly name = 'ValuationProjection';
  public readonly version = 'v1';

  constructor(checkpointStore: ProjectionCheckpointStore, dlq: ProjectionDLQ) {
    super(checkpointStore, dlq);
  }

  public handles(eventType: string): boolean {
    return eventType.startsWith('CostLayer');
  }

  public async reset(): Promise<void> {
    // Drop table logic
  }

  protected async execute(event: DomainEvent<any>): Promise<void> {
    // Database upsert logic for tracking inventory value, FIFO, Average Cost
  }
}
