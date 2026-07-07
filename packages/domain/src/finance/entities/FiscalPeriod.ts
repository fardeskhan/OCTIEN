import { PeriodStatus } from '../value-objects/PeriodStatus';

export class FiscalPeriod {
  constructor(
    public readonly periodId: string,
    public readonly yearId: string,
    public readonly periodNumber: number,
    public readonly startDate: string, // ISO-8601 UTC
    public readonly endDate: string,   // ISO-8601 UTC
    public status: PeriodStatus = PeriodStatus.FUTURE
  ) {
    if (new Date(startDate) >= new Date(endDate)) {
      throw new Error('Fiscal period start date must be strictly before end date.');
    }
  }

  public open(): void {
    if (this.status !== PeriodStatus.FUTURE) {
      throw new Error(`Cannot open period from state: ${this.status}`);
    }
    this.status = PeriodStatus.OPEN;
  }

  public softClose(): void {
    if (this.status !== PeriodStatus.OPEN) {
      throw new Error(`Cannot soft close period from state: ${this.status}`);
    }
    this.status = PeriodStatus.SOFT_CLOSED;
  }

  public hardClose(): void {
    if (this.status !== PeriodStatus.OPEN && this.status !== PeriodStatus.SOFT_CLOSED) {
      throw new Error(`Cannot hard close period from state: ${this.status}`);
    }
    this.status = PeriodStatus.HARD_CLOSED;
  }
}
