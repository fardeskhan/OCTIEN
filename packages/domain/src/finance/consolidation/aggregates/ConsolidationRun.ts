export enum ConsolidationRunStatus {
  STARTED = 'STARTED',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED'
}

export class ConsolidationRun {
  private _status: ConsolidationRunStatus = ConsolidationRunStatus.STARTED;
  public completedAt?: string;

  constructor(
    public readonly runId: string,
    public readonly periodId: string,
    public readonly fxRateSetId: string,
    public readonly startedAt: string
  ) {}

  get status(): ConsolidationRunStatus {
    return this._status;
  }

  public complete(timestamp: string): void {
    this._status = ConsolidationRunStatus.COMPLETED;
    this.completedAt = timestamp;
  }

  public fail(timestamp: string): void {
    this._status = ConsolidationRunStatus.FAILED;
    this.completedAt = timestamp;
  }
}
