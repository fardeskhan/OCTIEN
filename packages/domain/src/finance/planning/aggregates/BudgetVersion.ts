export enum BudgetVersionStatus {
  DRAFT = 'DRAFT',
  LOCKED = 'LOCKED'
}

export class BudgetVersion {
  private _status: BudgetVersionStatus = BudgetVersionStatus.DRAFT;

  constructor(
    public readonly versionId: string,
    public readonly budgetId: string,
    public readonly versionNumber: number
  ) {}

  get status(): BudgetVersionStatus {
    return this._status;
  }

  public lock(): void {
    if (this._status !== BudgetVersionStatus.DRAFT) throw new Error('Version is already locked and immutable');
    this._status = BudgetVersionStatus.LOCKED;
  }
}
