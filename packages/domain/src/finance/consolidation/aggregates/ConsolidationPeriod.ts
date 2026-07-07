export enum ConsolidationPeriodStatus {
  OPEN = 'OPEN',
  CONSOLIDATING = 'CONSOLIDATING',
  CLOSED = 'CLOSED',
  LOCKED = 'LOCKED'
}

export class ConsolidationPeriod {
  private _status: ConsolidationPeriodStatus = ConsolidationPeriodStatus.OPEN;

  constructor(
    public readonly periodId: string,
    public readonly startDate: string,
    public readonly endDate: string
  ) {}

  get status(): ConsolidationPeriodStatus {
    return this._status;
  }

  public beginConsolidation(): void {
    if (this._status !== ConsolidationPeriodStatus.OPEN) throw new Error('Invalid transition');
    this._status = ConsolidationPeriodStatus.CONSOLIDATING;
  }

  public close(): void {
    if (this._status !== ConsolidationPeriodStatus.CONSOLIDATING) throw new Error('Invalid transition');
    this._status = ConsolidationPeriodStatus.CLOSED;
  }

  public lock(): void {
    if (this._status !== ConsolidationPeriodStatus.CLOSED) throw new Error('Invalid transition');
    this._status = ConsolidationPeriodStatus.LOCKED;
  }
}
