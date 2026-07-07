import { Account } from '../entities/Account';

export class ChartOfAccounts {
  private readonly accounts: Map<string, Account> = new Map();

  constructor(
    public readonly chartId: string,
    public readonly tenantId: string,
    public readonly chartVersion: string,
    public readonly effectiveFrom: string,
    public readonly effectiveTo?: string
  ) {}

  public addAccount(account: Account): void {
    if (account.tenantId !== this.tenantId) {
      throw new Error('Tenant mismatch: Account belongs to a different tenant.');
    }
    if (this.accounts.has(account.accountId)) {
      throw new Error(`Account ${account.accountId} already exists in Chart ${this.chartId}`);
    }
    if (account.parentAccountId && !this.accounts.has(account.parentAccountId)) {
      throw new Error(`Parent account ${account.parentAccountId} does not exist in Chart ${this.chartId}`);
    }
    
    // Cycle detection logic ensures acyclic hierarchy
    this.detectCycles(account.accountId, account.parentAccountId);
    
    this.accounts.set(account.accountId, account);
  }

  public getAccount(accountId: string): Account | undefined {
    return this.accounts.get(accountId);
  }

  public getAllAccounts(): Account[] {
    return Array.from(this.accounts.values());
  }

  private detectCycles(accountId: string, parentId?: string): void {
    let currentParent = parentId;
    while (currentParent) {
      if (currentParent === accountId) {
        throw new Error('Acyclic hierarchy violation: Account cannot be its own ancestor.');
      }
      const parentNode = this.accounts.get(currentParent);
      currentParent = parentNode?.parentAccountId;
    }
  }
}
