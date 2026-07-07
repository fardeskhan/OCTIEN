import { FiscalYear } from '../entities/FiscalYear';

export class AccountingCalendar {
  private readonly years: Map<string, FiscalYear> = new Map();

  constructor(
    public readonly calendarId: string,
    public readonly tenantId: string,
    public readonly name: string,
    public readonly description: string
  ) {}

  public addFiscalYear(year: FiscalYear): void {
    if (year.calendarId !== this.calendarId) {
      throw new Error(`Year ${year.yearId} does not belong to Calendar ${this.calendarId}`);
    }

    // Continuity verification: New year must not overlap an existing year
    for (const existingYear of this.years.values()) {
      const existingStart = new Date(existingYear.startDate).getTime();
      const existingEnd = new Date(existingYear.endDate).getTime();
      const newStart = new Date(year.startDate).getTime();
      const newEnd = new Date(year.endDate).getTime();

      if (newStart < existingEnd && newEnd > existingStart) {
        throw new Error(`FiscalYear overlap detected between ${year.yearId} and ${existingYear.yearId}`);
      }
    }

    this.years.set(year.yearId, year);
  }

  public getFiscalYear(yearId: string): FiscalYear | undefined {
    return this.years.get(yearId);
  }

  public getAllYears(): FiscalYear[] {
    return Array.from(this.years.values());
  }
}
