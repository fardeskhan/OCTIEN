export class ReportSnapshot {
  constructor(
    public readonly snapshotId: string,
    public readonly tenantId: string,
    public readonly reportId: string,
    public readonly generatedAt: string,
    public readonly hash: string,
    public readonly sourceProjectionVersions: Record<string, number>,
    public readonly data: any // The synthesized read-only payload
  ) {}
}
