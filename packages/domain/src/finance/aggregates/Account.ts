export type AccountType = 'ASSET' | 'LIABILITY' | 'EQUITY' | 'REVENUE' | 'EXPENSE';

/**
 * Domain Aggregate representing a node in the Chart of Accounts (COA).
 * Explicitly separates Type (Asset), Natural Account (Cash), and Presentation Group (Current Assets).
 */
export class Account {
  constructor(
    public readonly accountId: string,
    public readonly tenantId: string,
    public readonly accountCode: string, // e.g. "10100"
    public readonly name: string, // e.g. "HDFC Operating Account"
    public readonly type: AccountType,
    public readonly presentationGroup: string, // e.g. "Current Assets"
    public readonly naturalAccount: string, // e.g. "Bank"
    public readonly isControlAccount: boolean = false, // e.g. True for AR/AP subledgers
    public readonly parentAccountId?: string
  ) {}

  public get isAssetOrExpense(): boolean {
    return this.type === 'ASSET' || this.type === 'EXPENSE';
  }

  public get isLiabilityEquityOrRevenue(): boolean {
    return this.type === 'LIABILITY' || this.type === 'EQUITY' || this.type === 'REVENUE';
  }
}
