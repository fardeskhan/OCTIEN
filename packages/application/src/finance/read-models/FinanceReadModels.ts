// Read Models (Projections) decouple the UI from Domain Aggregates
// They are flattened shapes populated purely by Event Dispatchers (Outbox consumers)

export interface AccountTreeView {
  id: string;
  code: string;
  name: string;
  type: string;
  normalBalance: 'DEBIT' | 'CREDIT';
  balance: number; // Projected rolling balance
  children: AccountTreeView[];
}

export interface JournalSummaryView {
  id: string;
  journalNumber: string;
  state: string;
  totalDebits: number;
  totalCredits: number;
  fiscalPeriod: string;
}

export interface LedgerView {
  accountId: string;
  accountName: string;
  entries: {
    date: Date;
    journalNumber: string;
    description: string;
    debit: number | null;
    credit: number | null;
    runningBalance: number;
  }[];
}

export interface TrialBalanceView {
  businessId: string;
  fiscalPeriod: string;
  lines: {
    accountCode: string;
    accountName: string;
    debitBalance: number | null;
    creditBalance: number | null;
  }[];
  totalDebits: number;
  totalCredits: number;
}

export interface FinanceDashboardView {
  businessId: string;
  cashAndBankBalance: number;
  totalAccountsReceivable: number;
  totalAccountsPayable: number;
  netIncome: number;
  pendingJournalsCount: number;
}
