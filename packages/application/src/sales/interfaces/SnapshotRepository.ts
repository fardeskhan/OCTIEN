export interface Snapshot {
    aggregateId: string;
    aggregateType: string;
    version: number;
    payload: unknown;
    capturedAt: Date;
}

export interface SnapshotRepository {
    /**
     * Saves a performance snapshot of an aggregate.
     */
    saveSnapshot(snapshot: Snapshot, transactionClient?: unknown): Promise<void>;

    /**
     * Loads the latest performance snapshot for an aggregate, if it exists.
     */
    loadLatestSnapshot(aggregateId: string): Promise<Snapshot | null>;
}
