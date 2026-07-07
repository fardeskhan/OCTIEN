import { AccountingCalendar } from '../../../domain/src/finance/aggregates/AccountingCalendar';

export class PostgresFiscalCalendarRepository {
  async save(calendar: AccountingCalendar): Promise<void> {
    // 1. Transaction Start
    // 2. Optimistic Lock check on __version
    // 3. Upsert Calendar, FiscalYears, FiscalPeriods, and AdjustmentPeriods
    // 4. Publish Domain Event to Outbox
    // 5. Commit
  }

  async findActiveCalendar(tenantId: string): Promise<AccountingCalendar> {
    throw new Error('Not implemented');
  }
}
