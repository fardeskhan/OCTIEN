import { FiscalPeriod } from './FiscalPeriod';
import { AdjustmentPeriod } from './AdjustmentPeriod';
import { PeriodStatus } from '../value-objects/PeriodStatus';

export class FiscalYear {
  private readonly standardPeriods: Map<number, FiscalPeriod> = new Map();
  private readonly adjustmentPeriods: Map<number, AdjustmentPeriod> = new Map();

  constructor(
    public readonly yearId: string,
    public readonly calendarId: string,
    public readonly name: string, // e.g., 'FY 2027'
    public readonly startDate: string,
    public readonly endDate: string,
    public status: PeriodStatus = PeriodStatus.FUTURE
  ) {
    if (new Date(startDate) >= new Date(endDate)) {
      throw new Error('Fiscal year start date must be strictly before end date.');
    }
  }

  public addStandardPeriod(period: FiscalPeriod): void {
    if (period.yearId !== this.yearId) throw new Error('Period yearId mismatch.');
    this.standardPeriods.set(period.periodNumber, period);
  }

  public addAdjustmentPeriod(period: AdjustmentPeriod): void {
    if (period.yearId !== this.yearId) throw new Error('Adjustment period yearId mismatch.');
    this.adjustmentPeriods.set(period.periodNumber, period);
  }

  public getStandardPeriods(): FiscalPeriod[] {
    return Array.from(this.standardPeriods.values());
  }

  public getAdjustmentPeriods(): AdjustmentPeriod[] {
    return Array.from(this.adjustmentPeriods.values());
  }
}
