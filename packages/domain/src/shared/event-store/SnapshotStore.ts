export interface Snapshot {
  aggregateId: string;
  aggregateType: string;
  version: number;
  schemaVersion: string;
  state: unknown;
}

export interface SnapshotStore {
  loadSnapshot(aggregateId: string, aggregateType: string): Promise<Snapshot | null>;
  saveSnapshot(snapshot: Snapshot): Promise<void>;
  deleteSnapshot(aggregateId: string): Promise<void>;
}
