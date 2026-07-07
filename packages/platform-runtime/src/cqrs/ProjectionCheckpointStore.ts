export interface ProjectionCheckpoint {
  projectionName: string;
  projectionVersion: number;
  tenantId: string;
  lastSequence: number;
  lastEventId: string;
  lastEventTimestamp: string;
  lastReplayId: string | null;
  checkpointHash: string;
  updatedAt: string;
}

export interface ProjectionCheckpointStore {
  getCheckpoint(projectionName: string, tenantId: string): Promise<ProjectionCheckpoint | null>;
  saveCheckpoint(checkpoint: ProjectionCheckpoint): Promise<void>;
}
