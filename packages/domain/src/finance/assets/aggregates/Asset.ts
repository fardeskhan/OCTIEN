import { Decimal } from '../../../../../shared-kernel/src/finance/Decimal';

export enum AssetStatus {
  DRAFT = 'DRAFT',
  ACTIVE = 'ACTIVE',
  IMPAIRED = 'IMPAIRED',
  DISPOSED = 'DISPOSED',
  RETIRED = 'RETIRED'
}

export class Asset {
  private _status: AssetStatus = AssetStatus.DRAFT;

  constructor(
    public readonly assetId: string,
    public readonly assetNumber: string,
    public readonly tenantId: string,
    public readonly assetClassId: string,
    public readonly acquisitionDate: string,
    public readonly capitalizationDate: string,
    public readonly acquisitionCost: Decimal,
    public readonly residualValue: Decimal,
    public readonly usefulLifeMonths: number
  ) {}

  get status(): AssetStatus {
    return this._status;
  }

  public activate(): void {
    if (this._status !== AssetStatus.DRAFT) throw new Error('Invalid transition');
    this._status = AssetStatus.ACTIVE;
  }

  public impair(): void {
    if (this._status !== AssetStatus.ACTIVE) throw new Error('Invalid transition');
    this._status = AssetStatus.IMPAIRED;
  }

  public dispose(): void {
    if (this._status !== AssetStatus.ACTIVE && this._status !== AssetStatus.IMPAIRED) throw new Error('Invalid transition');
    this._status = AssetStatus.DISPOSED;
  }

  public retire(): void {
    if (this._status !== AssetStatus.ACTIVE && this._status !== AssetStatus.IMPAIRED) throw new Error('Invalid transition');
    this._status = AssetStatus.RETIRED;
  }
}
