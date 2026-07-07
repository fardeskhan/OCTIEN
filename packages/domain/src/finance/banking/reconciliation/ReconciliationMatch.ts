export class ReconciliationMatch {
  constructor(
    public readonly matchId: string,
    public readonly tenantId: string,
    public readonly bankTransactionId: string,
    public readonly statementLineId: string,
    public readonly matchConfidence: number, // e.g., 0.0 to 1.0
    public readonly matchedAt: string
  ) {}
}
