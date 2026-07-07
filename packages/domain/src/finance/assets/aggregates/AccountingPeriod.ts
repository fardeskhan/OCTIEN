export enum AccountingPeriodStatus {
  OPEN = 'OPEN',
  CLOSING = 'CLOSING',
  CLOSED = 'CLOSED',
  LOCKED = 'LOCKED'
}

export class AccountingPeriod {
  private _status: AccountingPeriodStatus = AccountingPeriodStatus.OPEN;

  constructor(
    public readonly periodId: string,
    public readonly tenantId: string,
    public readonly startDate: string,
    public readonly endDate: string
  ) {}

  get status(): AccountingPeriodStatus {
    return this._status;
  }

  public initiateClose(): void {
    if (this._status !== AccountingPeriodStatus.OPEN) throw new Error('Invalid transition');
    this._status = AccountingPeriodStatus.CLOSING;
  }

  public completeClose(): void {
    if (this._status !== AccountingPeriodStatus.CLOSING) throw new Error('Invalid transition');
    this._status = AccountingPeriodStatus.CLOSED;
  }

  public lock(): void {
    if (this._status !== AccountingPeriodStatus.CLOSED) throw new Error('Invalid transition');
    this._status = AccountingPeriodStatus.LOCKED;
  }
}
