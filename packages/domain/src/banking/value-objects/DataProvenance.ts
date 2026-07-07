export class DataProvenance {
  constructor(
    public readonly institutionId: string,
    public readonly adapterId: string,
    public readonly importMethod: 'API_SYNC' | 'MANUAL_UPLOAD' | 'WEBHOOK',
    public readonly syncJobId: string,
    public readonly importedAt: Date,
    public readonly checksum: string,
    public readonly statementVersion?: number,
    public readonly originalReference?: string
  ) {
    if (!institutionId || !adapterId || !syncJobId || !checksum) {
      throw new Error("Missing critical provenance fields for financial auditing.");
    }
  }

  public matches(other: DataProvenance): boolean {
    return this.checksum === other.checksum && this.syncJobId === other.syncJobId;
  }
}
