import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';

export enum AssetImpairmentStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED'
}

export class AssetImpairment {
  private _status: AssetImpairmentStatus = AssetImpairmentStatus.DRAFT;

  constructor(
    public readonly impairmentId: string,
    public readonly assetId: string,
    public readonly tenantId: string,
    public readonly impairmentDate: string,
    public readonly impairmentAmount: Decimal,
    public readonly reason: string
  ) {}

  get status(): AssetImpairmentStatus {
    return this._status;
  }

  public approve(): void {
    if (this._status !== AssetImpairmentStatus.DRAFT) throw new Error('Invalid transition');
    this._status = AssetImpairmentStatus.APPROVED;
  }

  public post(): void {
    if (this._status !== AssetImpairmentStatus.APPROVED) throw new Error('Invalid transition');
    this._status = AssetImpairmentStatus.POSTED;
  }
}
