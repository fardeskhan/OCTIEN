export enum BudgetStatus {
  DRAFT = 'DRAFT',
  SUBMITTED = 'SUBMITTED',
  APPROVED = 'APPROVED',
  ACTIVE = 'ACTIVE',
  CLOSED = 'CLOSED'
}

export class Budget {
  private _status: BudgetStatus = BudgetStatus.DRAFT;

  constructor(
    public readonly budgetId: string,
    public readonly tenantId: string,
    public readonly name: string,
    public readonly fiscalYear: string
  ) {}

  get status(): BudgetStatus {
    return this._status;
  }

  public submit(): void {
    if (this._status !== BudgetStatus.DRAFT) throw new Error('Invalid transition');
    this._status = BudgetStatus.SUBMITTED;
  }

  public approve(): void {
    if (this._status !== BudgetStatus.SUBMITTED) throw new Error('Invalid transition');
    this._status = BudgetStatus.APPROVED;
  }

  public activate(): void {
    if (this._status !== BudgetStatus.APPROVED) throw new Error('Invalid transition');
    this._status = BudgetStatus.ACTIVE;
  }
}
