export class RenderedArtifact {
  constructor(
    public readonly artifactId: string,
    public readonly tenantId: string,
    public readonly reportSnapshotId: string,
    public readonly type: 'JSON' | 'CSV' | 'PDF' | 'EXCEL',
    public readonly checksum: string,
    public readonly generatedAt: string,
    public readonly payload: any // The actual file buffer or string representation
  ) {}
}
