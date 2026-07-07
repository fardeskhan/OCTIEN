import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';

export enum AssetDisposalStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED'
}

export class AssetDisposal {
  private _status: AssetDisposalStatus = AssetDisposalStatus.DRAFT;

  constructor(
    public readonly disposalId: string,
    public readonly assetId: string,
    public readonly tenantId: string,
    public readonly disposalDate: string,
    public readonly saleAmount: Decimal
  ) {}

  get status(): AssetDisposalStatus {
    return this._status;
  }

  public approve(): void {
    if (this._status !== AssetDisposalStatus.DRAFT) throw new Error('Invalid transition');
    this._status = AssetDisposalStatus.APPROVED;
  }

  public post(): void {
    if (this._status !== AssetDisposalStatus.APPROVED) throw new Error('Invalid transition');
    this._status = AssetDisposalStatus.POSTED;
  }
}
