export interface AssetEvent {
  eventId: string;
  eventName: string;
  version: string;
  timestamp: string;
  tenantId: string;
}

export class AssetCapitalized implements AssetEvent {
  public readonly eventName = 'AssetCapitalized';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly assetId: string,
    public readonly assetClassId: string,
    public readonly cost: string
  ) {}
}

export class DepreciationExpenseCalculated implements AssetEvent {
  public readonly eventName = 'DepreciationExpenseCalculated';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly assetId: string,
    public readonly assetClassId: string,
    public readonly periodId: string,
    public readonly expenseAmount: string
  ) {}
}

export class AssetDisposed implements AssetEvent {
  public readonly eventName = 'AssetDisposed';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly assetId: string,
    public readonly assetClassId: string,
    public readonly saleAmount: string,
    public readonly gainOrLossAmount: string
  ) {}
}

export class AssetImpaired implements AssetEvent {
  public readonly eventName = 'AssetImpaired';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly assetId: string,
    public readonly assetClassId: string,
    public readonly impairmentAmount: string
  ) {}
}

export class AssetTransferred implements AssetEvent {
  public readonly eventName = 'AssetTransferred';
  public readonly version = '1.0';
  constructor(
    public readonly eventId: string,
    public readonly tenantId: string,
    public readonly timestamp: string,
    public readonly assetId: string,
    public readonly fromCostCenter: string,
    public readonly toCostCenter: string
  ) {}
}
