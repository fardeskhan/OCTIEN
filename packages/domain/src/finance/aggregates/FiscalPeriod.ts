export type PeriodState = 'OPEN' | 'SOFT_CLOSED' | 'HARD_CLOSED' | 'ARCHIVED';
export type CalendarType = 'CALENDAR_YEAR' | 'FISCAL_YEAR' | '13_PERIOD' | '4_4_5';

/**
 * Orchestrates the closing workflow for a specific accounting period.
 */
export class ClosingEngine {
  constructor(private readonly periodId: string) {}

  // Tracks the execution of the close checklist
  public validations = {
    subledgersClosed: false,
    bankReconciliation: false,
    inventoryValuation: false,
    depreciation: false,
    fxRevaluation: false,
    taxValidation: false,
    trialBalanceVerified: false,
  };

  public canExecuteHardClose(): boolean {
    return Object.values(this.validations).every(v => v === true);
  }
}

/**
 * Domain Aggregate representing a distinct accounting slice within an Accounting Calendar.
 */
export class FiscalPeriod {
  private state: PeriodState = 'OPEN';
  private closingEngine: ClosingEngine;

  constructor(
    public readonly periodId: string,
    public readonly tenantId: string,
    public readonly calendarId: string,
    public readonly startDate: Date,
    public readonly endDate: Date,
    public readonly periodName: string // e.g., '2026-Q1' or 'Period-13'
  ) {
    this.closingEngine = new ClosingEngine(this.periodId);
  }

  public softClose(userId: string) {
    if (this.state !== 'OPEN') throw new Error('Only OPEN periods can be soft-closed.');
    // In soft close, only adjusting journals / corrections are allowed.
    this.state = 'SOFT_CLOSED';
  }

  public hardClose(userId: string) {
    if (this.state !== 'SOFT_CLOSED') throw new Error('Must be SOFT_CLOSED before hard closing.');
    if (!this.closingEngine.canExecuteHardClose()) {
      throw new Error('All Financial Close Checklist validations must pass before Hard Closing.');
    }
    this.state = 'HARD_CLOSED';
  }

  public archive() {
    if (this.state !== 'HARD_CLOSED') throw new Error('Must be HARD_CLOSED before archiving.');
    this.state = 'ARCHIVED';
  }
}
