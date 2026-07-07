export interface SnapshotPolicy {
    shouldSnapshot(aggregateType: string, currentVersion: number): boolean;
}
