export enum TaxPeriodStatus {
  OPEN = 'OPEN',
  FILED = 'FILED',
  LOCKED = 'LOCKED'
}

export class TaxPeriod {
  private _status: TaxPeriodStatus = TaxPeriodStatus.OPEN;

  constructor(
    public readonly taxPeriodId: string,
    public readonly tenantId: string,
    public readonly startDate: string,
    public readonly endDate: string
  ) {}

  get status(): TaxPeriodStatus {
    return this._status;
  }

  public file(): void {
    if (this._status !== TaxPeriodStatus.OPEN) throw new Error('Invalid transition');
    this._status = TaxPeriodStatus.FILED;
  }

  public lock(): void {
    if (this._status !== TaxPeriodStatus.FILED) throw new Error('Invalid transition');
    this._status = TaxPeriodStatus.LOCKED;
  }
}
