/**
 * Domain Aggregate: Ledger Snapshot
 * Captured exactly before a HARD_CLOSE. Serves as the ultimate, immutable audit truth for an accounting period.
 */
export class LedgerSnapshot {
  constructor(
    public readonly snapshotId: string,
    public readonly tenantId: string,
    public readonly periodId: string,
    public readonly trialBalanceReport: any,
    public readonly ledgerHashAtClose: string,
    public readonly exchangeRates: Map<string, number>,
    public readonly projectionVersion: string,
    public readonly checksums: any,
    public readonly reportVersion: string,
    public readonly generatedBy: string,
    public readonly generatedAt: Date = new Date()
  ) {}
}
