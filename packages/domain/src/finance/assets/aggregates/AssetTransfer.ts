export enum AssetTransferStatus {
  DRAFT = 'DRAFT',
  APPROVED = 'APPROVED',
  POSTED = 'POSTED'
}

export class AssetTransfer {
  private _status: AssetTransferStatus = AssetTransferStatus.DRAFT;

  constructor(
    public readonly transferId: string,
    public readonly assetId: string,
    public readonly tenantId: string,
    public readonly fromCostCenter: string,
    public readonly toCostCenter: string
  ) {}

  get status(): AssetTransferStatus {
    return this._status;
  }

  public approve(): void {
    if (this._status !== AssetTransferStatus.DRAFT) throw new Error('Invalid transition');
    this._status = AssetTransferStatus.APPROVED;
  }

  public post(): void {
    if (this._status !== AssetTransferStatus.APPROVED) throw new Error('Invalid transition');
    this._status = AssetTransferStatus.POSTED;
  }
}
