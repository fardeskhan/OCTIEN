export interface BankAccountData {
  accountId: string;
  accountType: string;
  currency: string;
  balance: number;
  lastUpdated: Date;
}

export interface BankTransactionData {
  transactionId: string;
  amount: number;
  currency: string;
  date: Date;
  reference: string;
  type: 'CREDIT' | 'DEBIT';
  utr?: string;
}

export interface IBankGateway {
  adapterId(): string;
  
  discoverAccounts(tenantId: string, consentToken: string): Promise<BankAccountData[]>;
  
  fetchBalances(tenantId: string, accountIds: string[]): Promise<BankAccountData[]>;
  
  fetchTransactions(tenantId: string, accountId: string, fromDate: Date, toDate: Date, cursor?: string): Promise<{
    transactions: BankTransactionData[];
    nextCursor?: string;
  }>;
  
  downloadStatement(tenantId: string, accountId: string, month: string): Promise<Buffer>;
  
  checkHealth(): Promise<{ isHealthy: boolean; latencyMs: number }>;
}
