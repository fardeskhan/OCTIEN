export class BudgetCalendar {
  constructor(
    public readonly calendarId: string,
    public readonly tenantId: string,
    public readonly fiscalYear: string,
    public readonly periods: string[] // e.g. ['JAN-2027', 'FEB-2027']
  ) {}
}
