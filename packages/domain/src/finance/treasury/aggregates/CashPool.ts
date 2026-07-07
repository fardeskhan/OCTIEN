export class CashPool {
  constructor(
    public readonly cashPoolId: string,
    public readonly tenantId: string,
    public readonly name: string,
    public readonly participatingAccounts: string[] // List of bankAccountIds
  ) {}

  // Frozen as requested: No balances, no liquidity values. Just a logical grouping.
}
