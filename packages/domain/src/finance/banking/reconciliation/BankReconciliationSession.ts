export enum ReconciliationSessionStatus {
  DRAFT = 'DRAFT',
  MATCHING = 'MATCHING',
  REVIEW = 'REVIEW',
  RECONCILED = 'RECONCILED',
  LOCKED = 'LOCKED'
}

export class BankReconciliationSession {
  private _status: ReconciliationSessionStatus = ReconciliationSessionStatus.DRAFT;

  constructor(
    public readonly sessionId: string,
    public readonly tenantId: string,
    public readonly bankAccountId: string,
    public readonly periodStartDate: string,
    public readonly periodEndDate: string
  ) {}

  get status(): ReconciliationSessionStatus {
    return this._status;
  }

  public beginMatching(): void {
    if (this._status !== ReconciliationSessionStatus.DRAFT) throw new Error('Invalid state transition');
    this._status = ReconciliationSessionStatus.MATCHING;
  }

  public markForReview(): void {
    if (this._status !== ReconciliationSessionStatus.MATCHING) throw new Error('Invalid state transition');
    this._status = ReconciliationSessionStatus.REVIEW;
  }

  public markReconciled(): void {
    if (this._status !== ReconciliationSessionStatus.REVIEW) throw new Error('Invalid state transition');
    this._status = ReconciliationSessionStatus.RECONCILED;
  }

  public lock(): void {
    if (this._status !== ReconciliationSessionStatus.RECONCILED) throw new Error('Invalid state transition');
    this._status = ReconciliationSessionStatus.LOCKED;
  }
}
