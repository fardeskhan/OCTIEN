import { ProjectionCheckpointStore } from './ProjectionCheckpointStore';

export class ProjectionLagMonitor {
  constructor(
    private readonly checkpointStore: ProjectionCheckpointStore,
    private readonly latestEventStoreSequenceProvider: () => Promise<{ sequence: number, timestamp: string }>
  ) {}

  async checkLag(projectionName: string, tenantId: string): Promise<{ sequenceLag: number, timeLagMs: number }> {
    const checkpoint = await this.checkpointStore.getCheckpoint(projectionName, tenantId);
    const latestEvent = await this.latestEventStoreSequenceProvider();

    if (!checkpoint) {
      return { sequenceLag: latestEvent.sequence, timeLagMs: Date.now() - new Date(latestEvent.timestamp).getTime() };
    }

    const sequenceLag = latestEvent.sequence - checkpoint.lastSequence;
    const timeLagMs = new Date(latestEvent.timestamp).getTime() - new Date(checkpoint.lastEventTimestamp).getTime();

    return { sequenceLag, timeLagMs };
  }
}
