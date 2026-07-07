import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';

export enum TaxAdjustmentStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED'
}

export class TaxAdjustment {
  private _status: TaxAdjustmentStatus = TaxAdjustmentStatus.DRAFT;

  constructor(
    public readonly adjustmentId: string,
    public readonly tenantId: string,
    public readonly jurisdictionId: string,
    public readonly adjustmentAmount: Decimal,
    public readonly reason: string
  ) {}

  get status(): TaxAdjustmentStatus {
    return this._status;
  }

  public approve(): void {
    if (this._status !== TaxAdjustmentStatus.DRAFT) throw new Error('Invalid transition');
    this._status = TaxAdjustmentStatus.APPROVED;
  }

  public post(): void {
    if (this._status !== TaxAdjustmentStatus.APPROVED) throw new Error('Invalid transition');
    this._status = TaxAdjustmentStatus.POSTED;
  }
}
