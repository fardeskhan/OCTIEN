export enum BudgetApprovalDecision {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED'
}

export class BudgetApproval {
  private _decision: BudgetApprovalDecision = BudgetApprovalDecision.PENDING;

  constructor(
    public readonly approvalId: string,
    public readonly budgetVersionId: string,
    public readonly approverId: string
  ) {}

  get decision(): BudgetApprovalDecision {
    return this._decision;
  }

  public approve(): void {
    if (this._decision !== BudgetApprovalDecision.PENDING) throw new Error('Already resolved');
    this._decision = BudgetApprovalDecision.APPROVED;
  }

  public reject(): void {
    if (this._decision !== BudgetApprovalDecision.PENDING) throw new Error('Already resolved');
    this._decision = BudgetApprovalDecision.REJECTED;
  }
}
