export class LedgerPeriod {
  constructor(
    public readonly start: string, // ISO-8601 UTC
    public readonly end: string, // ISO-8601 UTC
    public readonly calendarId: string,
    public readonly periodNumber: number,
    public readonly fiscalYear: string
  ) {
    if (new Date(start) >= new Date(end)) {
      throw new Error('LedgerPeriod start must be before end');
    }
  }

  equals(other: LedgerPeriod): boolean {
    return this.calendarId === other.calendarId && 
           this.periodNumber === other.periodNumber && 
           this.fiscalYear === other.fiscalYear;
  }
}
