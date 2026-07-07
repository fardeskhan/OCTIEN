import { IBankGateway, BankAccountData, BankTransactionData } from '../IBankGateway';
import { IFinancialConnectivity } from '../../../../../shared-kernel/src/services/IFinancialConnectivity';
import { ICICITransactionNormalizer } from './ICICITransactionNormalizer';

export class ICICIAdapter implements IBankGateway {
  constructor(
    private readonly connectivity: IFinancialConnectivity,
    private readonly normalizer: ICICITransactionNormalizer
  ) {}

  adapterId(): string {
    return 'icici-corporate';
  }

  async discoverAccounts(tenantId: string, consentToken: string): Promise<BankAccountData[]> {
    const rawData = await this.connectivity.executeAdapter<any>(
      this.adapterId(),
      `vault:${tenantId}:icici-credentials`,
      'FETCH_ACCOUNTS',
      {}
    );
    // In a real implementation, this goes through ICICIBalanceNormalizer
    return [];
  }

  async fetchBalances(tenantId: string, accountIds: string[]): Promise<BankAccountData[]> {
    return [];
  }

  async fetchTransactions(tenantId: string, accountId: string, fromDate: Date, toDate: Date, cursor?: string): Promise<{ transactions: BankTransactionData[]; nextCursor?: string; }> {
    const rawData = await this.connectivity.executeAdapter<any>(
      this.adapterId(),
      `vault:${tenantId}:icici-credentials`,
      'FETCH_TRANSACTIONS',
      { accountId, fromDate, toDate, cursor }
    );
    
    // Strict Normalization: The domain NEVER sees raw ICICI JSON formats
    const transactions = rawData.transactions.map((tx: any) => this.normalizer.normalize(tx));
    return { transactions, nextCursor: rawData.nextPageToken };
  }

  async downloadStatement(tenantId: string, accountId: string, month: string): Promise<Buffer> {
    const rawBuffer = await this.connectivity.executeAdapter<Buffer>(
      this.adapterId(),
      `vault:${tenantId}:icici-credentials`,
      'DOWNLOAD_STATEMENT',
      { accountId, month }
    );
    return rawBuffer;
  }

  async checkHealth(): Promise<{ isHealthy: boolean; latencyMs: number; }> {
    return { isHealthy: true, latencyMs: 80 };
  }
}
