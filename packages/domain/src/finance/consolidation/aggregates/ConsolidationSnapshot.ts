export class ConsolidationSnapshot {
  constructor(
    public readonly snapshotId: string,
    public readonly periodId: string,
    public readonly checksum: string
  ) {}
}
