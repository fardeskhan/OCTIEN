import { Projection, ProjectionEvent } from './Projection';

export class ProjectionEventDispatcher {
  private projections: Map<string, Projection> = new Map();

  register(projection: Projection) {
    this.projections.set(projection.name(), projection);
  }

  async dispatch(event: ProjectionEvent): Promise<void> {
    // Single point of entry. 
    // This dispatcher could be fed by Postgres logical decoding, a polling loop, or a Kafka consumer.
    // The individual Projections have zero knowledge of the transport layer.
    
    for (const projection of this.projections.values()) {
      await projection.apply(event);
      // Could batch checkpoints here
    }
  }
}
