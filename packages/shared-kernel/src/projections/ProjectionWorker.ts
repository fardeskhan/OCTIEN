import { IProjection, ProjectionMetadata } from './IProjection';

export interface ProjectionWorkerConfig {
  projectionType: string;
  batchSize: number;
  retryPolicy: {
    maxRetries: number;
    backoffMs: number;
  };
  concurrency: number;
  checkpointStrategy: 'PER_EVENT' | 'PER_BATCH';
}

export class ProjectionWorker<TEvent> {
  constructor(
    private readonly projection: IProjection<TEvent>,
    private readonly config: ProjectionWorkerConfig,
    private readonly repository: any // Abstracted IProjectionRepository
  ) {}

  public async start(): Promise<void> {
    // 1. Load Checkpoint from Metadata
    // 2. Poll Event Store for events matching projection.supportedEvents()
    // 3. Dispatch to applyBatch
  }

  public async applyBatch(events: TEvent[]): Promise<void> {
    for (const event of events) {
      try {
        const metadata = this.buildMetadataForEvent(event);
        
        // Idempotency check happens internally or at the DB unique constraint layer
        await this.projection.apply(event, metadata);
        
        // If checkpointStrategy is PER_EVENT, save metadata now
        if (this.config.checkpointStrategy === 'PER_EVENT') {
            await this.repository.saveMetadata(metadata);
        }

      } catch (error) {
        // DLQ logic + Retry Backoff
        await this.handleFailure(event, error);
      }
    }
    
    // Save batch checkpoint
    if (this.config.checkpointStrategy === 'PER_BATCH') {
       // Save final metadata checkpoint
    }
  }

  public async triggerRebuild(allEvents: TEvent[]): Promise<boolean> {
    // 1. Drop existing projection data
    // 2. Call projection.rebuild()
    // 3. Verify deterministic checksum against expected value
    await this.projection.rebuild(allEvents);
    const calculatedChecksum = this.projection.checksum();
    return this.projection.validate();
  }

  private buildMetadataForEvent(event: any): ProjectionMetadata {
    // Extracted from Event Header
    return {} as ProjectionMetadata; 
  }

  private async handleFailure(event: any, error: any): Promise<void> {
     // Implementation for Dead Letter Queue routing and Telemetry alerting
  }
}
