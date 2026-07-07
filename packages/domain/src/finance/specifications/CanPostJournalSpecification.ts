import { JournalEntry, JournalState } from '../aggregates/JournalEntry';
import { IFiscalPeriodPolicy } from '../policies/IFiscalPeriodPolicy';

export class CanPostJournalSpecification {
  constructor(private readonly fiscalPolicy: IFiscalPeriodPolicy) {}

  public async isSatisfiedBy(journal: JournalEntry): Promise<boolean> {
    if (journal.state !== JournalState.VALIDATED) return false;
    
    try {
      const isOpen = await this.fiscalPolicy.isPeriodOpen(journal.businessId, journal.fiscalYear, journal.fiscalPeriod);
      return isOpen;
    } catch {
      return false;
    }
  }
}
