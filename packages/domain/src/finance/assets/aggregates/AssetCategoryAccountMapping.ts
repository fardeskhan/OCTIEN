export class AssetCategoryAccountMapping {
  constructor(
    public readonly assetClassId: string,
    public readonly tenantId: string,
    public readonly assetAccountId: string,
    public readonly accumulatedDepreciationAccountId: string,
    public readonly depreciationExpenseAccountId: string,
    public readonly gainOnDisposalAccountId: string,
    public readonly lossOnDisposalAccountId: string
  ) {}
}
