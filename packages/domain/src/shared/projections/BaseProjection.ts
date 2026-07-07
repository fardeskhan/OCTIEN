import { Projection, ProjectionCheckpointStore } from './Projection';
import { ProjectionDLQ } from './ProjectionDLQ';
import { DomainEvent } from '../DomainEvent';

export abstract class BaseProjection implements Projection {
  public abstract readonly name: string;
  public abstract readonly version: string;

  constructor(
    protected readonly checkpointStore: ProjectionCheckpointStore,
    protected readonly dlq: ProjectionDLQ
  ) {}

  public abstract handles(eventType: string): boolean;
  
  protected abstract execute(event: DomainEvent<any>): Promise<void>;
  public abstract reset(): Promise<void>;

  public async apply(event: DomainEvent<any>, globalPosition: number): Promise<void> {
    if (!this.handles(event.eventType)) {
      return;
    }

    try {
      const checkpoint = await this.checkpointStore.getCheckpoint(this.name);
      
      // Idempotency Guard
      if (checkpoint && checkpoint.lastGlobalPosition >= globalPosition) {
        // Skip already processed events
        return;
      }

      if (checkpoint && checkpoint.projectionVersion !== this.version) {
        throw new Error(`Projection version mismatch for ${this.name}. Expected ${this.version}, got ${checkpoint.projectionVersion}. Full rebuild required.`);
      }

      await this.execute(event);

      await this.checkpointStore.saveCheckpoint({
        projectionName: this.name,
        projectionVersion: this.version,
        lastGlobalPosition: globalPosition,
        updatedAt: new Date().toISOString()
      });

    } catch (error) {
      await this.dlq.sendToDeadLetter(this.name, event, globalPosition, error as Error);
    }
  }
}
