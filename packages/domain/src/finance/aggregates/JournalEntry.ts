import { JournalNumber } from '../value-objects/JournalNumber';
import { JournalLine } from '../entities/JournalLine';
import { Money } from '../value-objects/Money';
import { Currency } from '../value-objects/Currency';
import { IFiscalPeriodPolicy } from '../policies/IFiscalPeriodPolicy';
import { 
  JournalImbalanceException, 
  InvalidJournalStateException, 
  JournalAlreadyReversedException, 
  ClosedFiscalPeriodException,
  CurrencyMismatchException
} from '../exceptions/FinanceExceptions';

export enum JournalState {
  DRAFT = 'DRAFT',
  VALIDATED = 'VALIDATED',
  POSTED = 'POSTED',
  REVERSED = 'REVERSED'
}

export class JournalEntry {
  private lines: JournalLine[] = [];
  public state: JournalState = JournalState.DRAFT;
  public version: number = 1;
  public reversalJournalId?: string;
  public originalJournalId?: string;

  private constructor(
    public readonly id: string,
    public readonly journalNumber: JournalNumber,
    public readonly businessId: string,
    public readonly baseCurrency: Currency,
    public readonly fiscalYear: string,
    public readonly fiscalPeriod: string
  ) {}

  public static create(
    id: string,
    journalNumber: JournalNumber,
    businessId: string,
    baseCurrencyCode: string,
    fiscalYear: string,
    fiscalPeriod: string
  ): JournalEntry {
    return new JournalEntry(
      id,
      journalNumber,
      businessId,
      Currency.create(baseCurrencyCode),
      fiscalYear,
      fiscalPeriod
    );
  }

  public addLine(line: JournalLine): void {
    if (this.state !== JournalState.DRAFT) {
      throw new InvalidJournalStateException('Cannot add lines to a journal entry that is not in DRAFT state.');
    }
    
    if (!line.baseAmount.currency.equals(this.baseCurrency)) {
      throw new CurrencyMismatchException('Line base amount currency must match the journal base currency.');
    }
    
    this.lines.push(line);
  }

  public validate(): void {
    if (this.state !== JournalState.DRAFT) {
      throw new InvalidJournalStateException('Can only validate journals in DRAFT state.');
    }
    if (this.lines.length < 2) {
      throw new InvalidJournalStateException('A journal entry must contain at least two lines.');
    }

    let totalBaseDebits = Money.create(0, this.baseCurrency.code);
    let totalBaseCredits = Money.create(0, this.baseCurrency.code);

    for (const line of this.lines) {
      if (line.isDebit()) {
        totalBaseDebits = totalBaseDebits.add(line.baseAmount);
      } else {
        totalBaseCredits = totalBaseCredits.add(line.baseAmount);
      }
    }

    if (!totalBaseDebits.equals(totalBaseCredits)) {
      throw new JournalImbalanceException(`Journal Imbalance: Debits (${totalBaseDebits.amount.toString()}) do not equal Credits (${totalBaseCredits.amount.toString()}).`);
    }

    this.state = JournalState.VALIDATED;
  }

  public async post(fiscalPolicy: IFiscalPeriodPolicy): Promise<void> {
    if (this.state !== JournalState.VALIDATED) {
      throw new InvalidJournalStateException('Journal entry must be VALIDATED before it can be POSTED.');
    }
    const isPeriodOpen = await fiscalPolicy.isPeriodOpen(this.businessId, this.fiscalYear, this.fiscalPeriod);
    if (!isPeriodOpen) {
      throw new ClosedFiscalPeriodException(`Fiscal period ${this.fiscalYear}-${this.fiscalPeriod} is closed.`);
    }

    this.state = JournalState.POSTED;
    // Dispatch: Finance.JournalPosted
  }

  public reverse(newJournalId: string, newJournalNumber: JournalNumber): JournalEntry {
    if (this.state !== JournalState.POSTED) {
      throw new InvalidJournalStateException('Only POSTED journal entries can be reversed.');
    }
    if (this.reversalJournalId) {
      throw new JournalAlreadyReversedException('This journal entry has already been reversed.');
    }
    this.state = JournalState.REVERSED;
    this.reversalJournalId = newJournalId;

    const reversal = JournalEntry.create(
      newJournalId,
      newJournalNumber,
      this.businessId,
      this.baseCurrency.code,
      this.fiscalYear,
      this.fiscalPeriod
    );

    // Perfectly invert debits to credits preserving historical rates
    for (const line of this.lines) {
       const swappedLine = JournalLine.create(
          `${line.id}-rev`,
          line.accountId,
          line.credit, 
          line.debit,  
          line.baseAmount,
          line.exchangeRate,
          `Reversal of ${this.journalNumber.value}: ${line.description || ''}`
       );
       reversal.addLine(swappedLine);
    }
    reversal.validate();
    return reversal;
  }

  public getLines(): JournalLine[] {
    return [...this.lines];
  }
}
