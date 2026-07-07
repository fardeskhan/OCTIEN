export interface SnapshotProvider {
  createSnapshot(projectionName: string, tenantId: string, sequenceId: number, state: any): Promise<string>;
  restoreSnapshot(projectionName: string, tenantId: string, targetSequenceId?: number): Promise<{ sequenceId: number, state: any } | null>;
  verifySnapshot(snapshotId: string): Promise<boolean>;
  deleteSnapshot(snapshotId: string): Promise<void>;
}
