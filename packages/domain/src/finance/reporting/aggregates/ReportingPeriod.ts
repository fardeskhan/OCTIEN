export enum ReportingPeriodType {
  DAILY = 'DAILY',
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  YEARLY = 'YEARLY',
  CUSTOM = 'CUSTOM'
}

export class ReportingPeriod {
  constructor(
    public readonly type: ReportingPeriodType,
    public readonly startDate: string,
    public readonly endDate: string
  ) {
    if (new Date(startDate) > new Date(endDate)) {
      throw new Error('Start date must be before or equal to end date.');
    }
  }
}
