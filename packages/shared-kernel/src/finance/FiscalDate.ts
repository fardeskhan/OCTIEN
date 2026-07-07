import { InvalidFiscalDateException } from './FinancialException';

export class FiscalDate {
  public readonly utcDate: string;

  constructor(inputDate: string) {
    const d = new Date(inputDate);
    if (isNaN(d.getTime())) {
      throw new InvalidFiscalDateException(`Invalid date string: ${inputDate}`);
    }
    // Normalize to strict UTC ISO-8601 for replay determinism
    this.utcDate = d.toISOString();
  }

  equals(other: FiscalDate): boolean {
    return this.utcDate === other.utcDate;
  }
}
