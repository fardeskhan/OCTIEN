import { EventStore } from './EventStore';
import { UpcasterPipeline } from './UpcasterPipeline';

export interface Projection {
  name: string;
  applyEvent(event: any): Promise<void>;
  truncate(): Promise<void>;
}

export class ReplayEngine {
  constructor(
    private readonly eventStore: EventStore,
    private readonly upcasterPipeline: UpcasterPipeline,
    private readonly projections: Projection[]
  ) {}

  public async replayAll(): Promise<void> {
    // 1. Destroy projections
    for (const projection of this.projections) {
      await projection.truncate();
    }

    // 2. Stream all events chronologically (Global order)
    const eventStream = this.eventStore.replay(0);
    
    // 3. Rebuild
    for await (const persistedEvent of eventStream) {
      // 3a. Upcast
      const upcastedEvent = this.upcasterPipeline.upcast(persistedEvent.event);
      
      // 3b. Apply to projections
      // Note: ReplayEngine NEVER calls aggregate commands.
      for (const projection of this.projections) {
        await projection.applyEvent(upcastedEvent);
      }
    }
  }
}
