import { PeriodStatus } from '../value-objects/PeriodStatus';

export class AdjustmentPeriod {
  constructor(
    public readonly periodId: string,
    public readonly yearId: string,
    public readonly periodNumber: number, // Typically 13, 14, 15 etc
    public readonly effectiveDate: string, // ISO-8601 UTC representing the focal point of adjustment
    public readonly type: string, // E.g., 'YEAR_END', 'AUDIT'
    public status: PeriodStatus = PeriodStatus.FUTURE
  ) {}

  public open(): void {
    this.status = PeriodStatus.OPEN;
  }

  public hardClose(): void {
    this.status = PeriodStatus.HARD_CLOSED;
  }
}
