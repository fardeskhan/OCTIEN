import { Projection } from './Projection';
import { SnapshotProvider } from './SnapshotProvider';
import { ProjectionCheckpointStore } from './ProjectionCheckpointStore';

export class ProjectionReplayCoordinator {
  constructor(
    private readonly checkpointStore: ProjectionCheckpointStore,
    private readonly snapshotProvider: SnapshotProvider,
    private readonly eventSource: any // E.g., Outbox Event Repository
  ) {}

  async replay(
    projection: Projection, 
    tenantId: string, 
    fromSequenceId: number = 0, 
    toSequenceId?: number, 
    useSnapshot: boolean = true
  ): Promise<void> {
    
    // 1. If starting from 0, completely drop/reset the read models
    if (fromSequenceId === 0) {
      await projection.reset();
    }

    let currentSequence = fromSequenceId;

    // 2. Snapshot Fast-Forward
    if (useSnapshot && fromSequenceId === 0) {
      const snapshot = await this.snapshotProvider.restoreSnapshot(projection.name(), tenantId);
      if (snapshot) {
        // Hydrate projection state internally if applicable
        currentSequence = snapshot.sequenceId;
      }
    }

    // 3. Replay loop (batching 10,000 at a time for performance)
    while (true) {
      const events = await this.eventSource.fetchEvents(tenantId, currentSequence, 10000);
      if (events.length === 0) break;

      const filteredEvents = toSequenceId 
        ? events.filter((e: any) => e.sequenceId <= toSequenceId)
        : events;

      await projection.replay(filteredEvents);
      currentSequence = filteredEvents[filteredEvents.length - 1].sequenceId;

      await projection.checkpoint();

      if (toSequenceId && currentSequence >= toSequenceId) {
        break;
      }
    }
  }
}
