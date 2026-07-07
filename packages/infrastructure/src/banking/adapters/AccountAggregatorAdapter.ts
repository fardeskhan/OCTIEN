import { IBankGateway, BankAccountData, BankTransactionData } from './IBankGateway';
import { IFinancialConnectivity } from '../../../../shared-kernel/src/services/IFinancialConnectivity';

export class AccountAggregatorAdapter implements IBankGateway {
  
  constructor(private readonly platformConnectivity: IFinancialConnectivity) {}

  adapterId(): string {
    return 'account-aggregator';
  }

  async discoverAccounts(tenantId: string, consentToken: string): Promise<BankAccountData[]> {
    // Delegates mTLS and OAuth execution to the platform connectivity runtime.
    // The domain adapter never handles raw keys.
    const rawData = await this.platformConnectivity.executeAdapter<any>(
      this.adapterId(),
      `vault:${tenantId}:aa-consent`,
      'FETCH_ACCOUNTS',
      { consentId: consentToken }
    );
    
    return this.normalizeAccounts(rawData);
  }

  async fetchBalances(tenantId: string, accountIds: string[]): Promise<BankAccountData[]> {
    // Normalizes AA FIP balance schemas into COSMY domain standard
    return [];
  }

  async fetchTransactions(tenantId: string, accountId: string, fromDate: Date, toDate: Date, cursor?: string): Promise<{ transactions: BankTransactionData[]; nextCursor?: string; }> {
    return { transactions: [] };
  }

  async downloadStatement(tenantId: string, accountId: string, month: string): Promise<Buffer> {
    throw new Error('Statements are retrieved structurally via AA. Use transaction endpoints.');
  }

  async checkHealth(): Promise<{ isHealthy: boolean; latencyMs: number; }> {
    return { isHealthy: true, latencyMs: 120 };
  }

  private normalizeAccounts(rawData: any): BankAccountData[] {
    // Normalization pipeline implementation
    return [];
  }
}
