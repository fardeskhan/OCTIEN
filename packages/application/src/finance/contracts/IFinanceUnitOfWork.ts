import { ChartOfAccounts } from '@cosmy/domain/src/finance/aggregates/ChartOfAccounts';
import { JournalEntry } from '@cosmy/domain/src/finance/aggregates/JournalEntry';
import { FinanceDomainEvent } from '@cosmy/domain/src/finance/events/FinanceEvents';

export interface IChartOfAccountsRepository {
  findById(id: string): Promise<ChartOfAccounts | null>;
  save(coa: ChartOfAccounts): Promise<void>;
  existsAccountCode(businessId: string, code: string): Promise<boolean>;
}

export interface IJournalEntryRepository {
  findById(id: string): Promise<JournalEntry | null>;
  findByJournalNumber(journalNumber: string): Promise<JournalEntry | null>;
  save(journal: JournalEntry): Promise<void>;
}

export interface IOutboxService {
  append(events: FinanceDomainEvent[]): Promise<void>;
}

export interface IFinanceUnitOfWork {
  begin(): Promise<void>;
  commit(): Promise<void>;
  rollback(): Promise<void>;

  chartOfAccounts: IChartOfAccountsRepository;
  journals: IJournalEntryRepository;
  outbox: IOutboxService;
}
